<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\School;
use App\Models\SchoolBoard;
use App\Models\PlatformSetting;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\InstitutionalSubscriptionService;
use App\Services\NotificationMailer;
use App\Services\ResourceAccessService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Throwable;

class AdminSchoolController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = School::query()->orderBy('name');

        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('city', 'like', "%{$search}%");
            });
        }

        if ($request->filled('board') && $request->string('board')->toString() !== 'All Boards') {
            $query->where('school_board', $request->string('board')->toString());
        }

        if ($request->filled('status') && $request->string('status')->toString() !== 'All') {
            $query->where('status', strtolower($request->string('status')->toString()));
        }

        $schools = $query->get();
        $studentCounts = $this->studentCountsForSchools($schools->pluck('id'));
        ResourceAccessService::rememberEnabledMap(
            ResourceAccessService::TYPE_SCHOOL,
            $schools->pluck('id')->all(),
        );

        return response()->json([
            'schools' => $schools->map(
                fn (School $school) => $this->format($school, $studentCounts[$school->id] ?? 0)
            ),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validateSchool($request, true);
        $data['school_board'] = $this->normalizeSchoolBoard($data['school_board'] ?? null);
        $teacherInputs = $this->validateTeacherMembers($request);

        $result = DB::transaction(function () use ($data, $teacherInputs) {
            $school = School::create([
                'name' => $data['name'],
                'city' => filled($data['city'] ?? null) ? $data['city'] : '—',
                'school_board' => $data['school_board'],
                'code' => filled($data['code'] ?? null)
                    ? strtoupper((string) $data['code'])
                    : $this->generateUniqueCode($data['name']),
                'contact_person' => $data['contact_person'] ?? null,
                'grades' => $data['grades'] ?? null,
                'status' => 'active',
                'portal_password_encrypted' => Crypt::encryptString($data['portal_password']),
            ]);

            $portalUser = User::create([
                'name' => $school->name,
                'email' => $data['portal_username'],
                'password' => Hash::make($data['portal_password']),
                'role' => 'school_admin',
                'school_id' => $school->id,
                'school_board' => $school->school_board,
                'account_status' => 'active',
                'preferred_language' => PlatformSetting::defaultLanguage(),
                'email_verified_at' => now(),
            ]);

            InstitutionalSubscriptionService::apply($portalUser, $data, required: true);
            $portalUser->save();

            $mailQueue = [[
                'user' => $portalUser,
                'password' => $data['portal_password'],
                'mode' => 'welcome',
            ]];

            foreach ($teacherInputs as $input) {
                $mailQueue = array_merge($mailQueue, $this->attachOrCreateTeacher($school, $input, $portalUser));
            }

            return [
                'school' => $school,
                'mail_queue' => $mailQueue,
                'teacher_count' => count($teacherInputs),
            ];
        });

        /** @var School $school */
        $school = $result['school'];
        $emailsSent = $this->flushMailQueue($result['mail_queue'], $school);
        $emailsSent += $this->notifyBoardOfNewSchool($school, $result['teacher_count']);

        AuditLogger::log('Create', 'School', "{$school->name} created", 'info', $request, subject: $school);

        return response()->json([
            'school' => $this->format($school->fresh()),
            'emails_sent' => $emailsSent,
            'message' => "{$school->name} created. {$emailsSent} onboarding email(s) sent.",
        ], 201);
    }

    /**
     * @param  list<array{user: User, password: string, mode: string}>  $queue
     */
    private function flushMailQueue(array $queue, School $school): int
    {
        $sent = 0;

        foreach ($queue as $mail) {
            try {
                if (($mail['mode'] ?? 'welcome') === 'verify') {
                    NotificationMailer::sendVerifyAccount($mail['user'], $mail['password']);
                } else {
                    NotificationMailer::sendWelcome($mail['user'], $mail['password']);
                }
                $sent++;
            } catch (Throwable $e) {
                Log::error('School onboarding email failed', [
                    'school_id' => $school->id,
                    'user_id' => $mail['user']->id ?? null,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return $sent;
    }

    private function notifyBoardOfNewSchool(School $school, int $teacherCount): int
    {
        if (! $school->school_board) {
            return 0;
        }

        $board = SchoolBoard::query()->where('code', $school->school_board)->first();

        $boardAdmins = User::query()
            ->where('role', 'board_admin')
            ->where('school_board', $school->school_board)
            ->where('account_status', '!=', 'archived')
            ->get();

        $sent = 0;

        foreach ($boardAdmins as $boardAdmin) {
            try {
                NotificationMailer::sendSchoolAdded(
                    $boardAdmin,
                    $school->name,
                    $board->name ?? $school->school_board,
                    $teacherCount,
                );
                $sent++;
            } catch (Throwable $e) {
                Log::error('School board notification email failed', [
                    'school_id' => $school->id,
                    'board_admin_id' => $boardAdmin->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return $sent;
    }

    /**
     * Attach an existing teacher (or create a new one) to a freshly created school.
     * Teachers inherit the school portal subscription window and are auto-activated.
     *
     * @return list<array{user: User, password: string, mode: string}>
     */
    private function attachOrCreateTeacher(School $school, array $input, User $sponsor): array
    {
        if (! empty($input['existing_id'])) {
            $teacher = User::query()->where('role', 'teacher')->findOrFail($input['existing_id']);
            $password = filled($input['password'] ?? null) ? (string) $input['password'] : Str::password(16);

            $teacher->fill([
                'school_id' => $school->id,
                'school_board' => $school->school_board ?: $teacher->school_board,
                'affiliation_type' => 'institutional',
            ]);

            if (filled($input['name'] ?? null)) {
                [$first, $last] = $this->splitName((string) $input['name']);
                $teacher->first_name = $first;
                $teacher->last_name = $last;
                $teacher->name = trim("{$first} {$last}");
            }

            if (filled($input['email'] ?? null)) {
                $teacher->email = $input['email'];
            }

            $teacher->password = Hash::make($password);
            $teacher->portal_password_encrypted = Crypt::encryptString($password);
            InstitutionalSubscriptionService::applyInstitutionalCoverageFromSponsor(
                $teacher,
                $sponsor,
                'school_registration',
            );
            $teacher->save();

            return [['user' => $teacher, 'password' => $password, 'mode' => 'welcome']];
        }

        [$first, $last] = $this->splitName((string) $input['name']);
        $password = (string) $input['password'];

        $teacher = User::create([
            'name' => trim("{$first} {$last}"),
            'first_name' => $first,
            'last_name' => $last,
            'email' => $input['email'],
            'password' => Hash::make($password),
            'role' => 'teacher',
            'school_id' => $school->id,
            'school_board' => $school->school_board ?: null,
            'affiliation_type' => 'institutional',
            'registration_source' => 'school_registration',
            'account_status' => 'active',
            'preferred_language' => PlatformSetting::defaultLanguage(),
            'portal_password_encrypted' => Crypt::encryptString($password),
            'email_verified_at' => now(),
        ]);

        InstitutionalSubscriptionService::applyInstitutionalCoverageFromSponsor(
            $teacher,
            $sponsor,
            'school_registration',
        );
        $teacher->save();

        return [['user' => $teacher, 'password' => $password, 'mode' => 'welcome']];
    }

    /**
     * Teachers attached from the create-school wizard (step 2). All entries are optional.
     *
     * @return list<array<string, mixed>>
     */
    private function validateTeacherMembers(Request $request): array
    {
        $data = $request->validate([
            'teachers' => ['nullable', 'array'],
            'teachers.*.existing_id' => ['nullable', 'integer', 'exists:users,id'],
            'teachers.*.name' => ['nullable', 'string', 'max:255'],
            'teachers.*.email' => ['nullable', 'email', 'max:255'],
            'teachers.*.password' => ['nullable', 'string', 'min:8', 'max:255'],
        ]);

        $teachers = [];

        foreach ($data['teachers'] ?? [] as $index => $teacher) {
            $existingId = $teacher['existing_id'] ?? null;

            if ($existingId) {
                if (! User::query()->where('id', $existingId)->where('role', 'teacher')->exists()) {
                    abort(response()->json(['message' => 'Selected teacher was not found.'], 422));
                }

                $teachers[] = [
                    'existing_id' => (int) $existingId,
                    'name' => $teacher['name'] ?? null,
                    'email' => $teacher['email'] ?? null,
                    'password' => $teacher['password'] ?? null,
                ];

                continue;
            }

            if (! filled($teacher['name'] ?? null) || ! filled($teacher['email'] ?? null) || ! filled($teacher['password'] ?? null)) {
                abort(response()->json([
                    'message' => 'Each new teacher needs a name, email, and temporary password.',
                    'errors' => ["teachers.{$index}" => ['Incomplete teacher entry.']],
                ], 422));
            }

            if (User::query()->where('email', $teacher['email'])->exists()) {
                abort(response()->json([
                    'message' => "Teacher email {$teacher['email']} is already in use.",
                ], 422));
            }

            $teachers[] = [
                'existing_id' => null,
                'name' => trim((string) $teacher['name']),
                'email' => trim((string) $teacher['email']),
                'password' => (string) $teacher['password'],
            ];
        }

        return $teachers;
    }

    /** @return array{0: string, 1: string} */
    private function splitName(string $name): array
    {
        $parts = preg_split('/\s+/', trim($name), 2) ?: [];

        return [$parts[0] ?? 'Teacher', $parts[1] ?? 'Account'];
    }

    private function generateUniqueCode(string $name): string
    {
        $words = preg_split('/\s+/', trim($name)) ?: [];
        $code = '';

        foreach ($words as $word) {
            $clean = preg_replace('/[^A-Za-z0-9]/', '', $word) ?: '';
            if ($clean !== '') {
                $code .= strtoupper($clean[0]);
            }
        }

        if (strlen($code) < 3) {
            $code = strtoupper(Str::of($name)->replaceMatches('/[^A-Za-z0-9]/', '')->substr(0, 4)->toString());
        }

        $code = $code !== '' ? $code : 'SCH';
        $candidate = $code;
        $counter = 1;

        while (School::query()->where('code', $candidate)->exists()) {
            $candidate = $code.$counter;
            $counter++;
        }

        return $candidate;
    }

    public function show(School $school): JsonResponse
    {
        return response()->json([
            'school' => $this->format($school),
        ]);
    }

    public function update(Request $request, School $school): JsonResponse
    {
        $data = $this->validateSchool($request, false, $school);
        $data['school_board'] = $this->normalizeSchoolBoard($data['school_board'] ?? null);

        DB::transaction(function () use ($school, $data) {
            $schoolUpdates = [
                'name' => $data['name'],
                'city' => $data['city'],
                'school_board' => $data['school_board'],
                'grades' => $data['grades'] ?? null,
            ];

            if (array_key_exists('code', $data)) {
                $schoolUpdates['code'] = filled($data['code']) ? strtoupper((string) $data['code']) : null;
            }

            if (array_key_exists('contact_person', $data)) {
                $schoolUpdates['contact_person'] = $data['contact_person'];
            }

            if (! empty($data['portal_password'])) {
                $schoolUpdates['portal_password_encrypted'] = Crypt::encryptString($data['portal_password']);
            }

            $school->update($schoolUpdates);

            $portalUser = $this->portalUser($school);

            if ($portalUser) {
                $portalUser->fill([
                    'name' => $school->name,
                    'email' => $data['portal_username'],
                    'school_board' => $school->school_board,
                ]);

                if (! empty($data['portal_password'])) {
                    $portalUser->password = Hash::make($data['portal_password']);
                }

                InstitutionalSubscriptionService::apply($portalUser, $data);
                $portalUser->save();
            }
        });

        AuditLogger::log('Edit', 'School', "{$school->name} updated", 'info', $request, subject: $school);

        return response()->json(['school' => $this->format($school->fresh())]);
    }

    public function sendBillingNotice(Request $request, School $school): JsonResponse
    {
        $portalUser = $this->portalUser($school);

        if (! $portalUser) {
            return response()->json(['message' => 'School portal account not found.'], 404);
        }

        if ($portalUser->account_status === 'archived') {
            return response()->json(['message' => 'Archived school portals cannot receive billing notices.'], 422);
        }

        $data = $request->validate([
            'type' => ['required', 'in:'.implode(',', InstitutionalSubscriptionService::NOTICE_TYPES)],
        ]);

        InstitutionalSubscriptionService::sendBillingNotice($portalUser, $data['type']);

        $label = InstitutionalSubscriptionService::noticeLabel($data['type']);

        AuditLogger::log(
            'Email',
            'School',
            "Admin sent {$label} notification to {$school->name}",
            'info',
            $request,
            subject: $school,
            metadata: ['notice_type' => $data['type']],
        );

        return response()->json([
            'school' => $this->format($school->fresh()),
            'message' => ucfirst($label).' email sent.',
        ]);
    }

    public function extendTrial(Request $request, School $school): JsonResponse
    {
        $portalUser = $this->portalUser($school);

        if (! $portalUser) {
            return response()->json(['message' => 'School portal account not found.'], 404);
        }

        if ($portalUser->account_status === 'archived') {
            return response()->json(['message' => 'Archived school portals cannot have their trial extended.'], 422);
        }

        $data = $request->validate([
            'days' => ['required', 'integer', 'min:1', 'max:30'],
        ]);

        $result = InstitutionalSubscriptionService::extendTrialAndNotify($portalUser, $data['days']);
        $ends = $result['trial_ends_at']?->format('Y-m-d') ?? '';

        User::query()
            ->where('role', 'teacher')
            ->where('school_id', $school->id)
            ->where(function ($query) {
                $query->where('affiliation_type', 'institutional')
                    ->orWhere('subscription_plan', 'institutional')
                    ->orWhereIn('registration_source', [
                        'school_registration',
                        'school_assigned',
                        'board_registration',
                        'board_assigned',
                    ]);
            })
            ->each(function (User $teacher) use ($portalUser) {
                InstitutionalSubscriptionService::syncRegistrationCoverage($teacher, $portalUser);
            });

        AuditLogger::log(
            'Edit',
            'School',
            "Admin extended trial for {$school->name} by {$result['days']} day(s) until {$ends}",
            'info',
            $request,
            subject: $school,
            metadata: ['days' => $result['days'], 'trial_ends_at' => $ends],
        );

        return response()->json([
            'school' => $this->format($school->fresh()),
            'message' => "Trial extended by {$result['days']} day(s). Email sent.",
        ]);
    }

    public function resendActivation(Request $request, School $school): JsonResponse
    {
        $portalUser = $this->portalUser($school);

        if (! $portalUser) {
            return response()->json(['message' => 'School portal account not found.'], 404);
        }

        if ($portalUser->account_status === 'archived') {
            return response()->json(['message' => 'Archived school portals cannot receive activation emails.'], 422);
        }

        if ($portalUser->email_verified_at !== null || $portalUser->account_status === 'active') {
            return response()->json(['message' => 'This school portal is already activated.'], 422);
        }

        $plainPassword = $this->portalPasswordFor($school);
        if (! $plainPassword) {
            return response()->json([
                'message' => 'The temporary password is unavailable. Set a new password before resending activation.',
            ], 422);
        }

        try {
            NotificationMailer::sendVerifyAccount($portalUser, $plainPassword);
        } catch (Throwable $e) {
            Log::error('School activation email resend failed', [
                'school_id' => $school->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json(['message' => 'The activation email could not be sent.'], 500);
        }

        AuditLogger::log(
            'Email',
            'School',
            "Activation email resent for {$school->name}",
            'info',
            $request,
            subject: $school,
        );

        return response()->json([
            'school' => $this->format($school->fresh()),
            'message' => 'Activation email resent successfully.',
        ]);
    }

    public function activateAccount(Request $request, School $school): JsonResponse
    {
        $portalUser = $this->portalUser($school);

        if (! $portalUser) {
            return response()->json(['message' => 'School portal account not found.'], 404);
        }

        if ($portalUser->account_status === 'archived' || $school->status === 'archived') {
            return response()->json(['message' => 'Restore the archived school before activating the portal.'], 422);
        }

        $portalUser->forceFill([
            'account_status' => 'active',
            'email_verified_at' => $portalUser->email_verified_at ?? now(),
        ])->save();

        AuditLogger::log(
            'Activate',
            'School',
            "{$school->name} portal activated manually by administrator",
            'warning',
            $request,
            subject: $school,
        );

        return response()->json([
            'school' => $this->format($school->fresh()),
            'message' => 'School portal activated. Sign-in is now allowed.',
        ]);
    }

    public function archive(Request $request, School $school): JsonResponse
    {
        $nextStatus = $school->status === 'archived' ? 'active' : 'archived';

        DB::transaction(function () use ($school, $nextStatus) {
            $school->update(['status' => $nextStatus]);

            $portalUser = $this->portalUser($school);

            if ($portalUser) {
                $portalUser->update([
                    'account_status' => $nextStatus === 'archived' ? 'archived' : 'active',
                ]);
            }
        });

        if ($nextStatus === 'archived') {
            AuditLogger::log('Archive', 'School', "{$school->name} archived", 'warning', $request, subject: $school);
        } else {
            AuditLogger::log('Activate', 'School', "{$school->name} reactivated", 'info', $request, subject: $school);
        }

        return response()->json(['school' => $this->format($school->fresh())]);
    }

    public function destroy(Request $request, School $school): JsonResponse
    {
        if ($school->status !== 'archived') {
            return response()->json([
                'message' => 'Only archived schools can be permanently deleted.',
            ], 422);
        }

        $name = $school->name;

        DB::transaction(function () use ($school) {
            $portalUser = $this->portalUser($school);

            if ($portalUser) {
                $portalUser->delete();
            }

            $school->delete();
        });

        AuditLogger::log(
            'Delete',
            'School',
            "{$name} permanently deleted",
            'critical',
            $request,
        );

        return response()->json(['message' => 'School permanently deleted.']);
    }

    public function suggestCredentials(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'school_board' => ['nullable', 'string', Rule::in($this->allowedBoardCodes())],
            'code' => ['nullable', 'string', 'max:40'],
        ]);

        $defaultBoard = $this->activeBoardCodes()[0] ?? 'CSDM';
        $board = array_key_exists('school_board', $data)
            ? $this->normalizeSchoolBoard($data['school_board'])
            : $defaultBoard;

        $code = filled($data['code'] ?? null)
            ? strtoupper((string) $data['code'])
            : $this->generateUniqueCode($data['name']);

        return response()->json([
            ...$this->suggestCredentialsFor($data['name'], $board),
            'code' => $code,
        ]);
    }

    private function validateSchool(Request $request, bool $creating, ?School $school = null): array
    {
        $portalUserId = $school ? $this->portalUser($school)?->id : null;

        $rules = [
            'name' => ['required', 'string', 'max:255'],
            'city' => [$creating ? 'nullable' : 'required', 'string', 'max:255'],
            'school_board' => ['nullable', 'string', Rule::in($this->allowedBoardCodes($school))],
            'code' => [
                'nullable',
                'string',
                'alpha_dash',
                'max:40',
                Rule::unique('schools', 'code')->ignore($school?->id),
            ],
            'contact_person' => ['nullable', 'string', 'max:255'],
            'grades' => ['nullable', 'string', 'max:50'],
            'portal_username' => [
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($portalUserId),
            ],
            'portal_password' => [$creating ? 'required' : 'nullable', 'string', 'min:8', 'max:255'],
            'access_mode' => [$creating ? 'required' : 'sometimes', 'in:trial,subscription'],
            'trial_started_at' => ['nullable', 'date'],
            'trial_ends_at' => ['nullable', 'date', 'after_or_equal:trial_started_at'],
            'subscription_started_at' => ['nullable', 'date'],
            'subscription_ends_at' => ['nullable', 'date', 'after_or_equal:subscription_started_at'],
        ];

        return $request->validate($rules);
    }

    private function normalizeSchoolBoard(?string $board): string
    {
        return $board === null ? '' : trim($board);
    }

    private function portalUser(School $school): ?User
    {
        return User::query()
            ->where('school_id', $school->id)
            ->where('role', 'school_admin')
            ->first();
    }

    private function portalPasswordFor(School $school): ?string
    {
        if (! $school->portal_password_encrypted) {
            return null;
        }

        try {
            return Crypt::decryptString($school->portal_password_encrypted);
        } catch (\Throwable) {
            return null;
        }
    }

    private function format(School $school, ?int $studentsCount = null): array
    {
        $portalUser = $this->portalUser($school);

        $teacherCount = User::query()
            ->where('school_id', $school->id)
            ->where('role', 'teacher')
            ->where('account_status', '!=', 'archived')
            ->count();

        return [
            'id' => $school->id,
            'name' => $school->name,
            'board' => $school->school_board ?: '',
            'code' => $school->code ?: '',
            'contact_person' => $school->contact_person ?: '',
            'city' => $school->city,
            'grades' => $school->grades ?? '—',
            'teachers' => $teacherCount,
            'students' => $studentsCount ?? $this->studentCountFor($school),
            'status' => ucfirst($school->status),
            'portal_username' => $portalUser?->email,
            'portal_password' => $this->portalPasswordFor($school),
            'portal_account_status' => $portalUser?->account_status,
            'portal_email_verified_at' => $portalUser?->email_verified_at?->toIso8601String(),
            'activation_pending' => (bool) ($portalUser && $portalUser->account_status === 'inactive' && $portalUser->email_verified_at === null),
            'resource_access_enabled' => ResourceAccessService::isEnabled(
                ResourceAccessService::TYPE_SCHOOL,
                $school->id,
            ),
            ...InstitutionalSubscriptionService::format($portalUser),
        ];
    }

    /** @param Collection<int, int> $schoolIds */
    private function studentCountsForSchools(Collection $schoolIds): array
    {
        if ($schoolIds->isEmpty()) {
            return [];
        }

        $directStudentIds = DB::table('students')
            ->whereIn('school_id', $schoolIds)
            ->select('school_id', 'id')
            ->get()
            ->groupBy('school_id');

        $enrolledStudentIds = DB::table('class_student')
            ->join('classes', 'classes.id', '=', 'class_student.class_id')
            ->join('users', 'users.id', '=', 'classes.teacher_id')
            ->whereIn('users.school_id', $schoolIds)
            ->where('users.role', 'teacher')
            ->select('users.school_id', 'class_student.student_id')
            ->get()
            ->groupBy('school_id');

        $counts = [];

        foreach ($schoolIds as $schoolId) {
            $counts[$schoolId] = collect($directStudentIds->get($schoolId, []))
                ->pluck('id')
                ->merge(collect($enrolledStudentIds->get($schoolId, []))->pluck('student_id'))
                ->unique()
                ->count();
        }

        return $counts;
    }

    private function studentCountFor(School $school): int
    {
        return $this->studentCountsForSchools(collect([$school->id]))[$school->id] ?? 0;
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

      /** @return list<string> */
    private function allowedBoardCodes(?School $school = null): array
    {
        $codes = array_merge([''], $this->activeBoardCodes());

        if ($school?->school_board && ! in_array($school->school_board, $codes, true)) {
            $codes[] = $school->school_board;
        }

        return $codes;
    }

    private function suggestCredentialsFor(string $name, string $board): array
    {
        $slug = Str::slug($name, '.');
        $baseUsername = $board !== ''
            ? "{$slug}.{$board}@portal.local"
            : "{$slug}@portal.local";
        $username = $baseUsername;
        $counter = 1;

        while (User::query()->where('email', $username)->exists()) {
            $username = "{$slug}.{$board}.{$counter}@portal.local";
            $counter++;
        }

        return [
            'portal_username' => $username,
            'portal_password' => 'School'.random_int(1000, 9999).'!',
        ];
    }
}
