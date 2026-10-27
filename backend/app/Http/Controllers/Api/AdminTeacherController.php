<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\School;
use App\Models\SchoolBoard;
use App\Models\SchoolClass;
use App\Models\SchoolYear;
use App\Models\ClassType;
use App\Models\PlatformSetting;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\InstitutionalSubscriptionService;
use App\Services\NotificationMailer;
use App\Services\ResourceAccessService;
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
            ->with(['school', 'classes:id,teacher_id,grade,name'])
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
        ResourceAccessService::rememberEnabledMap(
            ResourceAccessService::TYPE_TEACHER,
            $teachers->pluck('id')->all(),
        );

        return response()->json([
            'teachers' => $teachers->map(
                fn (User $teacher) => $this->format($teacher, $studentCounts[$teacher->id] ?? 0)
            ),
        ]);
    }

    public function schools(): JsonResponse
    {
        $boardNames = SchoolBoard::query()->pluck('name', 'code');

        $schools = School::query()
            ->orderBy('name')
            ->get(['id', 'name', 'city', 'school_board'])
            ->map(function (School $school) use ($boardNames) {
                $code = filled($school->school_board) ? (string) $school->school_board : null;

                return [
                    'id' => $school->id,
                    'name' => $school->name,
                    'city' => $school->city,
                    'board_code' => $code,
                    'board' => $code ? (string) ($boardNames[$code] ?? $code) : '',
                ];
            })
            ->values();

        return response()->json([
            'schools' => $schools,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $portal = $this->validatePortal($request, true);
        $data['email'] = $portal['portal_username'];

        $plainPassword = $portal['portal_password'];
        $hasInstitution = filled($data['school_id'] ?? null) || filled($data['school_board'] ?? null);

        // Independent teachers activate via email. Institution-assigned teachers inherit the licence.
        $data['account_status'] = $hasInstitution ? 'active' : 'inactive';

        $teacher = User::create([
            ...$data,
            'name' => $this->buildName($data),
            'role' => 'teacher',
            'preferred_language' => $data['preferred_language'] ?? PlatformSetting::defaultLanguage(),
            'password' => Hash::make($plainPassword),
            'portal_password_encrypted' => Crypt::encryptString($plainPassword),
            'email_verified_at' => $hasInstitution ? now() : null,
        ]);

        $this->syncClassTypes($teacher, $request->input('class_types', []));

        $licensed = false;
        if ($hasInstitution) {
            $licensed = $this->applyInstitutionLicenceFromAssignment($teacher);
        }

        $teacher->load(['school', 'classes:id,teacher_id,grade,name'])->loadCount('classes');

        $emailSent = false;
        $emailKind = 'welcome';
        try {
            if ($licensed || $hasInstitution) {
                // Assigned to school/board: send welcome with credentials (already active).
                NotificationMailer::sendWelcome($teacher, $plainPassword);
            } else {
                // Independent teacher: activation link email.
                NotificationMailer::sendVerifyAccount($teacher, $plainPassword);
                $emailKind = 'activation';
            }
            $emailSent = true;
        } catch (\Throwable $e) {
            Log::error('Teacher create email failed', [
                'teacher_id' => $teacher->id,
                'error' => $e->getMessage(),
            ]);
        }

        AuditLogger::log('Create', 'Teacher', "{$teacher->displayName()} created", 'info', $request, subject: $teacher);

        $message = match (true) {
            $emailSent && $licensed => 'Teacher created under the school/board licence. A welcome email was sent.',
            $emailSent && $hasInstitution => 'Teacher created and activated. A welcome email was sent.',
            $emailSent => 'Teacher created. An activation email was sent.',
            default => 'Teacher created, but the email could not be sent.',
        };

        return response()->json([
            'teacher' => $this->format($teacher->fresh(['school', 'classes:id,teacher_id,grade,name'])->loadCount('classes')),
            'email_sent' => $emailSent,
            'email_kind' => $emailKind,
            'message' => $message,
        ], 201);
    }

    /**
     * If the assigned school or board portal has an active licence, inherit it.
     */
    private function applyInstitutionLicenceFromAssignment(User $teacher): bool
    {
        $sponsor = $teacher->institutionalSponsor();
        if (! $sponsor || ! InstitutionalSubscriptionService::sponsorHasActiveLicence($sponsor)) {
            return false;
        }

        $source = $teacher->school_id ? 'school_assigned' : 'board_assigned';
        InstitutionalSubscriptionService::applyInstitutionalCoverageFromSponsor($teacher, $sponsor, $source);

        return true;
    }

    public function show(User $teacher): JsonResponse
    {
        if ($teacher->role !== 'teacher') {
            abort(404);
        }

        $teacher->load(['school', 'classes:id,teacher_id,grade,name'])->loadCount('classes');

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

        if ($request->exists('class_types')) {
            $this->syncClassTypes($teacher, $request->input('class_types', []));
        }

        if (filled($teacher->school_id) || filled($teacher->school_board)) {
            $this->applyInstitutionLicenceFromAssignment($teacher->fresh());
        }

        $teacher->load(['school', 'classes:id,teacher_id,grade,name'])->loadCount('classes');

        AuditLogger::log('Edit', 'Teacher', "{$teacher->displayName()} updated", 'info', $request, subject: $teacher);

        return response()->json(['teacher' => $this->format($teacher->fresh(['school', 'classes:id,teacher_id,grade,name'])->loadCount('classes'))]);
    }

    public function sendBillingNotice(Request $request, User $teacher): JsonResponse
    {
        $this->authorizeAdmin($request);
        $this->ensureTeacher($teacher);

        $allowed = [
            'trial_ending',
            'trial_expired',
            'subscription_started',
            'subscription_renewed',
            'subscription_cancelled',
            'subscription_expired',
            'inactive_reminder',
            'suspension_reminder',
        ];

        $data = $request->validate([
            'type' => ['required', 'in:'.implode(',', $allowed)],
        ]);

        if ($teacher->account_status === 'archived') {
            return response()->json(['message' => 'Archived teachers cannot receive billing notices.'], 422);
        }

        TeacherNotificationService::adminForceBillingNotice($teacher, $data['type']);

        $labels = [
            'trial_ending' => 'trial ending soon',
            'trial_expired' => 'trial expired',
            'subscription_started' => 'subscription started',
            'subscription_renewed' => 'subscription renewed',
            'subscription_cancelled' => 'subscription cancelled',
            'subscription_expired' => 'subscription expired',
            'inactive_reminder' => 'inactive account reminder',
            'suspension_reminder' => 'account suspension reminder',
        ];
        $label = $labels[$data['type']] ?? $data['type'];

        AuditLogger::log(
            'Email',
            'Teacher',
            "Admin sent {$label} notification/email to {$teacher->displayName()}",
            'info',
            $request,
            subject: $teacher,
            metadata: ['notice_type' => $data['type']],
        );

        $messages = [
            'trial_ending' => 'Trial ending soon notification and email sent.',
            'trial_expired' => 'Trial expired notification and email sent.',
            'subscription_started' => 'Subscription started notification and email sent.',
            'subscription_renewed' => 'Subscription renewed notification and email sent.',
            'subscription_cancelled' => 'Subscription cancelled notification and email sent.',
            'subscription_expired' => 'Subscription expired notification and email sent.',
            'inactive_reminder' => 'Inactive account reminder email sent.',
            'suspension_reminder' => 'Account suspension reminder email sent.',
        ];

        return response()->json([
            'teacher' => $this->format($teacher->fresh()->load('school')->loadCount('classes')),
            'message' => $messages[$data['type']] ?? 'Notification and email sent.',
        ]);
    }

    public function extendTrial(Request $request, User $teacher): JsonResponse
    {
        $this->authorizeAdmin($request);
        $this->ensureTeacher($teacher);

        if ($teacher->account_status === 'archived') {
            return response()->json(['message' => 'Archived teachers cannot have their trial extended.'], 422);
        }

        if ($teacher->isInstitutionalTeacher() || $teacher->isRegistrationLicensedTeacher()) {
            return response()->json([
                'message' => 'Institutional teachers inherit access from their school or board. Extend the school/board trial instead.',
            ], 422);
        }

        $data = $request->validate([
            'days' => ['required', 'integer', 'min:1', 'max:30'],
        ]);

        $result = TeacherNotificationService::extendTrial($teacher, $data['days']);
        $ends = $result['trial_ends_at']?->format('Y-m-d') ?? '';

        AuditLogger::log(
            'Edit',
            'Teacher',
            "Admin extended trial for {$teacher->displayName()} by {$result['days']} day(s) until {$ends}",
            'info',
            $request,
            subject: $teacher,
            metadata: ['days' => $result['days'], 'trial_ends_at' => $ends],
        );

        return response()->json([
            'teacher' => $this->format($teacher->fresh()->load('school')->loadCount('classes')),
            'message' => "Trial extended by {$result['days']} day(s). Email sent.",
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

        // Allow the assigned school's current board even if that board is inactive/legacy.
        $schoolId = $request->input('school_id');
        if (filled($schoolId)) {
            $schoolBoard = School::query()->where('id', $schoolId)->value('school_board');
            if (filled($schoolBoard) && ! in_array((string) $schoolBoard, $boardCodes, true)) {
                $boardCodes[] = (string) $schoolBoard;
            }
        }

        // Treat blank / NONE as null so Rule::in does not reject empty string.
        $incomingBoard = $request->input('school_board');
        if (! filled($incomingBoard)) {
            $request->merge(['school_board' => null]);
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
        $data['school_board'] = filled($data['school_board'] ?? null) ? (string) $data['school_board'] : null;
        $data['title'] = $this->normalizedTitle($request->input('title', $data['title'] ?? null));
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
            $this->normalizedTitle($data['title'] ?? null),
            $data['first_name'] ?? null,
            $data['last_name'] ?? null,
        ]);

        return implode(' ', $parts);
    }

    private function normalizedTitle(mixed $title): ?string
    {
        $value = trim((string) ($title ?? ''));
        if ($value === '' || strcasecmp($value, 'None') === 0) {
            return null;
        }

        return $value;
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
        if (
            $teacher->isInstitutionalTeacher()
            || (
                $teacher->affiliation_type !== 'individual'
                && (
                    $teacher->isRegistrationLicensedTeacher()
                    || $teacher->subscription_plan === 'institutional'
                    || $teacher->affiliation_type === 'institutional'
                )
            )
        ) {
            $sponsor = $teacher->institutionalSponsor();
            if ($sponsor) {
                InstitutionalSubscriptionService::syncRegistrationCoverage($teacher, $sponsor);
            }
        }

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
            'class_types' => $this->classTypesFor($teacher),
            'students' => $studentsCount ?? $this->studentCountFor($teacher),
            'status' => $status,
            'activation_pending' => $activationPending,
            'email_activated' => $teacher->email_verified_at !== null,
            'activated_at' => $teacher->email_verified_at?->toIso8601String(),
            'affiliation_type' => $teacher->affiliation_type,
            'registration_source' => $teacher->registration_source,
            'registration_source_label' => InstitutionalSubscriptionService::registrationSourceLabel($teacher->registration_source),
            'subscription_status' => $teacher->subscription_status,
            'subscription_plan' => $teacher->subscription_plan,
            'subscription_billing' => $teacher->subscription_billing,
            'subscription_started_at' => $teacher->subscription_started_at?->toIso8601String(),
            'subscription_ends_at' => $teacher->subscription_ends_at?->toIso8601String(),
            'is_subscription_active' => $teacher->hasActiveSubscription(),
            'subscription_days_remaining' => $teacher->subscriptionDaysRemaining(),
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
            'resource_access_enabled' => ResourceAccessService::isEnabled(
                ResourceAccessService::TYPE_TEACHER,
                $teacher->id,
            ),
        ];
    }

    private function accessLabel(User $teacher): string
    {
        if ($teacher->account_status === 'pending') {
            return 'Pending join';
        }

        // Individual signup teachers never show as institutional (free-text board name is not a licence).
        if ($teacher->affiliation_type !== 'individual') {
            if ($teacher->isRegistrationLicensedTeacher() || $teacher->subscription_plan === 'institutional') {
                return 'Institutional';
            }

            if ($teacher->isInstitutionalTeacher()) {
                return 'Institutional';
            }
        } elseif ($teacher->account_status === 'inactive') {
            // Trial starts after email activation.
            return 'Trial';
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

    /** @return list<string> */
    private function classTypesFor(User $teacher): array
    {
        if ($teacher->relationLoaded('classes')) {
            return $teacher->classes
                ->pluck('grade')
                ->filter(fn ($grade) => filled($grade))
                ->unique()
                ->values()
                ->all();
        }

        return SchoolClass::query()
            ->where('teacher_id', $teacher->id)
            ->whereNotNull('grade')
            ->where('grade', '!=', '')
            ->distinct()
            ->orderBy('grade')
            ->pluck('grade')
            ->all();
    }

    /** @param mixed $classTypes */
    private function syncClassTypes(User $teacher, mixed $classTypes): void
    {
        if (! is_array($classTypes)) {
            return;
        }

        $allowed = ClassType::allowedGradeValues(true);
        $selected = array_values(array_unique(array_filter(array_map(
            fn ($value) => trim((string) $value),
            $classTypes
        ))));

        foreach ($selected as $grade) {
            if (! in_array($grade, $allowed, true)) {
                abort(response()->json([
                    'message' => "Invalid class type \"{$grade}\".",
                ], 422));
            }
        }

        $year = SchoolYear::defaultLabel();
        $existing = SchoolClass::query()
            ->where('teacher_id', $teacher->id)
            ->get();

        foreach ($selected as $grade) {
            $hasGrade = $existing->contains(fn (SchoolClass $class) => $class->grade === $grade);
            if ($hasGrade) {
                continue;
            }

            SchoolClass::create([
                'teacher_id' => $teacher->id,
                'school_id' => $teacher->school_id,
                'name' => $grade,
                'grade' => $grade,
                'school_year' => $year,
            ]);
        }

        foreach ($existing as $class) {
            if (in_array($class->grade, $selected, true)) {
                continue;
            }
            if ($class->students()->count() > 0) {
                continue;
            }
            $class->evaluations()->delete();
            $class->delete();
        }
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
            $parts = array_filter([
                $this->normalizedTitle($teacher->title),
                $teacher->first_name,
                $teacher->last_name,
            ]);

            return implode(' ', $parts);
        }

        return $teacher->name;
    }
}
