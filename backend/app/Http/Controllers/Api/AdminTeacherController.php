<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\School;
use App\Models\SchoolBoard;
use App\Models\PlatformSetting;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\NotificationMailer;
use App\Services\TeacherNotificationService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminTeacherController extends Controller
{
    private const STATUSES = ['active', 'inactive', 'archived'];

    public function index(Request $request): JsonResponse
    {
        $query = User::query()
            ->where('role', 'teacher')
            ->with('school')
            ->withCount('classes')
            ->orderBy('last_name')
            ->orderBy('first_name');

        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('name', 'like', "%{$search}%");
            });
        }

        if ($request->filled('school') && $request->string('school')->toString() !== 'All Schools') {
            $schoolName = $request->string('school')->toString();
            $query->whereHas('school', fn ($q) => $q->where('name', $schoolName));
        }

        if ($request->filled('status') && $request->string('status')->toString() !== 'All') {
            $query->where('account_status', $this->parseStatus($request->string('status')->toString()));
        }

        $teachers = $query->get();
        $studentCounts = $this->studentCountsForTeachers($teachers->pluck('id'));

        return response()->json([
            'teachers' => $teachers->map(
                fn (User $teacher) => $this->format($teacher, $studentCounts[$teacher->id] ?? 0)
            ),
        ]);
    }

    public function schools(): JsonResponse
    {
        return response()->json([
            'schools' => School::query()->orderBy('name')->get(['id', 'name', 'city']),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $portal = $this->validatePortal($request, true);
        $data['email'] = $portal['portal_username'];
        // New teachers must activate via email before signing in.
        $data['account_status'] = 'inactive';

        $plainPassword = $portal['portal_password'];

        $teacher = User::create([
            ...$data,
            'name' => $this->buildName($data),
            'role' => 'teacher',
            'preferred_language' => $data['preferred_language'] ?? PlatformSetting::defaultLanguage(),
            'password' => Hash::make($plainPassword),
            'portal_password_encrypted' => Crypt::encryptString($plainPassword),
            'email_verified_at' => null,
        ]);

        $teacher->load('school')->loadCount('classes');

        $emailSent = false;
        try {
            NotificationMailer::sendVerifyAccount($teacher, $plainPassword);
            $emailSent = true;
        } catch (\Throwable $e) {
            Log::error('Teacher activation email failed', [
                'teacher_id' => $teacher->id,
                'error' => $e->getMessage(),
            ]);
        }

        AuditLogger::log('Create', 'Teacher', "{$teacher->displayName()} created", 'info', $request, subject: $teacher);

        return response()->json([
            'teacher' => $this->format($teacher),
            'email_sent' => $emailSent,
            'message' => $emailSent
                ? 'Teacher created. An activation email was sent.'
                : 'Teacher created, but the activation email could not be sent.',
        ], 201);
    }

    public function show(User $teacher): JsonResponse
    {
        if ($teacher->role !== 'teacher') {
            abort(404);
        }

        $teacher->load('school')->loadCount('classes');

        return response()->json([
            'teacher' => $this->format($teacher),
        ]);
    }

    public function update(Request $request, User $teacher): JsonResponse
    {
        if ($teacher->role !== 'teacher') {
            abort(404);
        }

        $data = $this->validated($request, $teacher->id);
        $portal = $this->validatePortal($request, false, $teacher);
        $data['email'] = $portal['portal_username'];
        $data['name'] = $this->buildName($data);

        $trialEndsAt = array_key_exists('trial_ends_at', $data) ? $data['trial_ends_at'] : false;
        unset($data['trial_ends_at']);

        $teacher->fill($data);

        if ($trialEndsAt !== false) {
            $this->applyTrialEndsAt($teacher, $trialEndsAt);
        }

        if (! empty($portal['portal_password'])) {
            $teacher->password = Hash::make($portal['portal_password']);
            $teacher->portal_password_encrypted = Crypt::encryptString($portal['portal_password']);
        }

        $teacher->save();
        $teacher->load('school')->loadCount('classes');

        AuditLogger::log('Edit', 'Teacher', "{$teacher->displayName()} updated", 'info', $request, subject: $teacher);

        return response()->json(['teacher' => $this->format($teacher)]);
    }

    public function sendBillingNotice(Request $request, User $teacher): JsonResponse
    {
        $this->authorizeAdmin($request);
        $this->ensureTeacher($teacher);

        $data = $request->validate([
            'type' => ['required', 'in:trial_ending,trial_expired'],
        ]);

        if ($teacher->account_status === 'archived') {
            return response()->json(['message' => 'Archived teachers cannot receive billing notices.'], 422);
        }

        if ($teacher->hasActiveSubscription()) {
            return response()->json(['message' => 'This teacher already has an active paid subscription.'], 422);
        }

        TeacherNotificationService::adminForceTrialNotice($teacher, $data['type']);

        $label = $data['type'] === 'trial_ending' ? 'trial ending soon' : 'trial expired';

        AuditLogger::log(
            'Email',
            'Teacher',
            "Admin sent {$label} notification/email to {$teacher->displayName()}",
            'info',
            $request,
            subject: $teacher,
            metadata: ['notice_type' => $data['type']],
        );

        return response()->json([
            'teacher' => $this->format($teacher->fresh()->load('school')->loadCount('classes')),
            'message' => $data['type'] === 'trial_ending'
                ? 'Trial ending soon notification and email sent.'
                : 'Trial expired notification and email sent.',
        ]);
    }

    public function sendInactivityNotice(Request $request, User $teacher): JsonResponse
    {
        $this->authorizeAdmin($request);
        $this->ensureTeacher($teacher);

        $data = $request->validate([
            'type' => ['required', 'in:inactive_reminder,suspension_reminder'],
        ]);

        if ($teacher->account_status === 'archived') {
            return response()->json(['message' => 'Archived teachers cannot receive inactivity notices.'], 422);
        }

        TeacherNotificationService::inactiveAccountNudge($teacher, $data['type'], force: true);

        $label = $data['type'] === 'inactive_reminder'
            ? 'inactive account reminder'
            : 'account suspension reminder';

        AuditLogger::log(
            'Email',
            'Teacher',
            "Admin sent {$label} to {$teacher->displayName()}",
            'info',
            $request,
            subject: $teacher,
            metadata: ['notice_type' => $data['type']],
        );

        return response()->json([
            'teacher' => $this->format($teacher->fresh()->load('school')->loadCount('classes')),
            'message' => $data['type'] === 'inactive_reminder'
                ? 'Inactive account reminder email sent.'
                : 'Account suspension reminder email sent.',
        ]);
    }

    public function resendActivation(Request $request, User $teacher): JsonResponse
    {
        $this->authorizeAdmin($request);
        $this->ensureTeacher($teacher);

        if ($teacher->account_status === 'archived') {
            return response()->json(['message' => 'Archived accounts cannot receive activation emails.'], 422);
        }

        if ($teacher->email_verified_at !== null || $teacher->account_status === 'active') {
            return response()->json(['message' => 'This teacher account is already activated.'], 422);
        }

        $plainPassword = $this->portalPasswordFor($teacher);
        if ($plainPassword === '') {
            return response()->json([
                'message' => 'The temporary password is unavailable. Set a new password before resending activation.',
            ], 422);
        }

        try {
            $this->sendActivationEmail($teacher, $plainPassword);
        } catch (\Throwable $exception) {
            Log::error('Teacher activation email resend failed', [
                'teacher_id' => $teacher->id,
                'error' => $exception->getMessage(),
            ]);

            return response()->json(['message' => 'The activation email could not be sent.'], 500);
        }

        AuditLogger::log(
            'Email',
            'Teacher',
            "Activation email resent to {$teacher->displayName()}",
            'info',
            $request,
            subject: $teacher,
        );

        return response()->json([
            'teacher' => $this->format($teacher->fresh()->load('school')->loadCount('classes')),
            'message' => 'Activation email resent successfully.',
        ]);
    }

    public function activateAccount(Request $request, User $teacher): JsonResponse
    {
        $this->authorizeAdmin($request);
        $this->ensureTeacher($teacher);

        if ($teacher->account_status === 'archived') {
            return response()->json(['message' => 'Restore the archived account before activating it.'], 422);
        }

        $teacher->forceFill([
            'account_status' => 'active',
            'email_verified_at' => $teacher->email_verified_at ?? now(),
        ])->save();
        $teacher->startTrialIfNeeded();
        $teacher->load('school')->loadCount('classes');

        AuditLogger::log(
            'Activate',
            'Teacher',
            "{$teacher->displayName()} activated manually by administrator",
            'warning',
            $request,
            subject: $teacher,
        );

        return response()->json([
            'teacher' => $this->format($teacher),
            'message' => 'Teacher account activated.',
        ]);
    }

    public function suggestCredentials(Request $request): JsonResponse
    {
        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'school_board' => ['nullable', 'string', 'max:20'],
        ]);

        return response()->json($this->suggestCredentialsFor(
            $data['first_name'],
            $data['last_name'],
            strtoupper($data['school_board'] ?? 'TEACH')
        ));
    }

    public function archive(Request $request, User $teacher): JsonResponse
    {
        if ($teacher->role !== 'teacher') {
            abort(404);
        }

        $wasArchived = $teacher->account_status === 'archived';

        $teacher->update([
            'account_status' => $wasArchived ? 'active' : 'archived',
        ]);

        $teacher->load('school')->loadCount('classes');

        if ($wasArchived) {
            AuditLogger::log('Activate', 'Teacher', "{$teacher->displayName()} reactivated", 'info', $request, subject: $teacher);
        } else {
            AuditLogger::log('Archive', 'Teacher', "{$teacher->displayName()} archived", 'warning', $request, subject: $teacher);
        }

        return response()->json(['teacher' => $this->format($teacher)]);
    }

    public function destroy(Request $request, User $teacher): JsonResponse
    {
        if ($teacher->role !== 'teacher') {
            abort(404);
        }

        if ($teacher->account_status !== 'archived') {
            return response()->json([
                'message' => 'Only archived teachers can be permanently deleted.',
            ], 422);
        }

        $name = $teacher->displayName();
        $avatarPath = $teacher->avatar_path;

        $teacher->delete();

        if ($avatarPath && Storage::disk('public')->exists($avatarPath)) {
            Storage::disk('public')->delete($avatarPath);
        }

        AuditLogger::log(
            'Delete',
            'Teacher',
            "{$name} permanently deleted",
            'critical',
            $request,
        );

        return response()->json(['message' => 'Teacher permanently deleted.']);
    }

    public function showAvatar(User $teacher): StreamedResponse|JsonResponse
    {
        if ($teacher->role !== 'teacher') {
            abort(404);
        }

        if (! $teacher->avatar_path || ! Storage::disk('public')->exists($teacher->avatar_path)) {
            return response()->json(['message' => 'Avatar not found.'], 404);
        }

        $extension = strtolower(pathinfo($teacher->avatar_path, PATHINFO_EXTENSION));
        $mime = match ($extension) {
            'jpg', 'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'webp' => 'image/webp',
            default => 'image/jpeg',
        };

        return Storage::disk('public')->response($teacher->avatar_path, null, [
            'Content-Type' => $mime,
            'Cache-Control' => 'private, max-age=3600',
        ]);
    }

    private function validated(Request $request, ?int $ignoreUserId = null): array
    {
        $existingBoard = $ignoreUserId
            ? User::query()->where('id', $ignoreUserId)->value('school_board')
            : null;

        $boardCodes = $this->activeBoardCodes();
        if ($existingBoard && ! in_array($existingBoard, $boardCodes, true)) {
            $boardCodes[] = $existingBoard;
        }

        $data = $request->validate([
            'title' => ['nullable', 'string', 'max:20'],
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'school_id' => ['nullable', 'integer', Rule::exists('schools', 'id')],
            'school_board' => ['nullable', 'string', Rule::in($boardCodes)],
            'account_status' => ['required', 'string'],
            'started_at' => ['nullable', 'date'],
            'trial_ends_at' => ['nullable', 'date'],
        ]);

        $data['school_id'] = $data['school_id'] ?? null;
        $data['school_board'] = $data['school_board'] ?? null;
        $data['account_status'] = $this->parseStatus($data['account_status']);

        return $data;
    }

    private function applyTrialEndsAt(User $teacher, ?string $trialEndsAt): void
    {
        if ($trialEndsAt === null || $trialEndsAt === '') {
            $teacher->trial_ends_at = null;

            return;
        }

        $ends = Carbon::parse($trialEndsAt)->endOfDay();
        $teacher->trial_ends_at = $ends;

        if (! $teacher->trial_started_at) {
            $teacher->trial_started_at = now();
        }

        if (! $teacher->hasActiveSubscription()) {
            $teacher->subscription_status = 'trialing';
        }
    }

    private function validatePortal(Request $request, bool $creating, ?User $teacher = null): array
    {
        return $request->validate([
            'portal_username' => [
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($teacher?->id),
            ],
            'portal_password' => [$creating ? 'required' : 'nullable', 'string', 'min:8', 'max:255'],
        ]);
    }

    /** @return list<string> */
    private function activeBoardCodes(): array
    {
        return SchoolBoard::query()
            ->where('status', 'active')
            ->orderBy('name')
            ->pluck('code')
            ->all();
    }

    private function suggestCredentialsFor(string $firstName, string $lastName, string $board): array
    {
        $slug = Str::slug(trim("{$firstName}.{$lastName}"), '.');
        $baseUsername = "{$slug}.{$board}@portal.local";
        $username = $baseUsername;
        $counter = 1;

        while (User::query()->where('email', $username)->exists()) {
            $username = "{$slug}.{$board}.{$counter}@portal.local";
            $counter++;
        }

        return [
            'portal_username' => $username,
            'portal_password' => Str::password(16),
        ];
    }

    private function portalPasswordFor(User $teacher): ?string
    {
        if (! $teacher->portal_password_encrypted) {
            return null;
        }

        try {
            return Crypt::decryptString($teacher->portal_password_encrypted);
        } catch (\Throwable) {
            return null;
        }
    }

    private function buildName(array $data): string
    {
        $parts = array_filter([
            $data['title'] ?? null,
            $data['first_name'],
            $data['last_name'],
        ]);

        return implode(' ', $parts);
    }

    private function parseStatus(string $status): string
    {
        return match (strtolower(trim($status))) {
            'active' => 'active',
            'inactive' => 'inactive',
            'pending', 'pending activation' => 'pending',
            'archived' => 'archived',
            default => 'active',
        };
    }

    private function displayStatus(?string $status): string
    {
        return match ($status) {
            'inactive' => 'Inactive',
            'pending' => 'Pending activation',
            'archived' => 'Archived',
            default => 'Active',
        };
    }

    private function format(User $teacher, ?int $studentsCount = null): array
    {
        $emailActivationPending = $teacher->account_status === 'inactive' && $teacher->email_verified_at === null;
        $joinPending = $teacher->account_status === 'pending';
        $activationPending = $emailActivationPending || $joinPending;
        $daysSinceLogin = $teacher->daysSinceLastLogin();
        $loginInactive = $teacher->account_status !== 'archived' && $teacher->isLoginInactive(30);

        $status = $this->displayStatus($teacher->account_status);
        if ($activationPending) {
            $status = 'Pending activation';
        } elseif ($loginInactive) {
            $status = 'Inactive';
        }

        return [
            'id' => $teacher->id,
            'name' => $this->formattedName($teacher),
            'title' => $teacher->title ?? '',
            'first_name' => $teacher->first_name ?? '',
            'last_name' => $teacher->last_name ?? '',
            'email' => $teacher->email,
            'phone' => $teacher->phone ?? '',
            'school' => $teacher->school?->name ?? '',
            'school_id' => $teacher->school_id,
            'board' => $teacher->school_board ?? '',
            'classes' => $teacher->classes_count ?? 0,
            'students' => $studentsCount ?? $this->studentCountFor($teacher),
            'status' => $status,
            'activation_pending' => $activationPending,
            'email_activated' => $teacher->email_verified_at !== null,
            'activated_at' => $teacher->email_verified_at?->toIso8601String(),
            'affiliation_type' => $teacher->affiliation_type,
            'subscription_status' => $teacher->subscription_status,
            'subscription_plan' => $teacher->subscription_plan,
            'is_trial_active' => $teacher->hasActiveTrial(),
            'trial_days_remaining' => $teacher->trialDaysRemaining(),
            'trial_ends_at' => $teacher->trial_ends_at?->toIso8601String(),
            'access' => $this->accessLabel($teacher),
            'since' => $teacher->started_at?->format('Y-m-d') ?? '',
            'last_login_at' => $teacher->last_login_at?->toIso8601String(),
            'days_since_last_login' => $daysSinceLogin,
            'login_inactive' => $loginInactive,
            'portal_username' => $teacher->email,
            'portal_password' => $this->portalPasswordFor($teacher),
            'has_avatar' => (bool) $teacher->avatar_path,
            'avatar_url' => $teacher->avatar_path ? "/api/admin/teachers/{$teacher->id}/avatar" : null,
        ];
    }

    private function accessLabel(User $teacher): string
    {
        if ($teacher->account_status === 'pending') {
            return 'Pending join';
        }

        if ($teacher->isInstitutionalTeacher()) {
            return 'Institutional';
        }

        if ($teacher->hasActiveSubscription()) {
            return $teacher->subscription_plan === 'insights' ? 'Insights' : 'Essentials';
        }

        if ($teacher->hasActiveTrial()) {
            return 'Trial';
        }

        if ($teacher->subscription_status === 'trialing' || $teacher->trial_ends_at) {
            return 'Trial expired';
        }

        return 'None';
    }

    private function sendActivationEmail(User $teacher, string $plainPassword): void
    {
        NotificationMailer::sendVerifyAccount($teacher, $plainPassword);
    }

    private function authorizeAdmin(Request $request): void
    {
        abort_unless($request->user()?->role === 'admin', 403);
    }

    private function ensureTeacher(User $teacher): void
    {
        abort_unless($teacher->role === 'teacher', 404);
    }

    /** @param Collection<int, int> $teacherIds */
    private function studentCountsForTeachers(Collection $teacherIds): array
    {
        if ($teacherIds->isEmpty()) {
            return [];
        }

        return DB::table('class_student')
            ->join('classes', 'classes.id', '=', 'class_student.class_id')
            ->whereIn('classes.teacher_id', $teacherIds)
            ->groupBy('classes.teacher_id')
            ->selectRaw('classes.teacher_id, count(distinct class_student.student_id) as students_count')
            ->pluck('students_count', 'teacher_id')
            ->map(fn ($count) => (int) $count)
            ->all();
    }

    private function studentCountFor(User $teacher): int
    {
        return (int) DB::table('class_student')
            ->join('classes', 'classes.id', '=', 'class_student.class_id')
            ->where('classes.teacher_id', $teacher->id)
            ->count(DB::raw('distinct class_student.student_id'));
    }

    private function formattedName(User $teacher): string
    {
        if ($teacher->first_name) {
            $parts = array_filter([$teacher->title, $teacher->first_name, $teacher->last_name]);

            return implode(' ', $parts);
        }

        return $teacher->name;
    }
}
