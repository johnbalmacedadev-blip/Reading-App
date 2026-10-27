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

class AdminSchoolBoardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = SchoolBoard::query()->orderBy('name');

        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status') && $request->string('status')->toString() !== 'All') {
            $query->where('status', strtolower($request->string('status')->toString()));
        }

        $boards = $query->get();
        $stats = $this->statsForBoards($boards->pluck('code'));

        return response()->json([
            'boards' => $boards->map(
                fn (SchoolBoard $board) => $this->format($board, $stats[$board->code] ?? $this->emptyStats())
            ),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $portal = $this->validatePortal($request, true);
        $access = $this->validateAccess($request, true);
        $members = $this->validateMembers($request);

        $result = DB::transaction(function () use ($data, $portal, $access, $members) {
            $board = SchoolBoard::create([
                ...$data,
                'portal_password_encrypted' => Crypt::encryptString($portal['portal_password']),
            ]);

            $portalUser = User::create([
                'name' => $data['contact_person'] ?: $board->name,
                'email' => $portal['portal_username'],
                'password' => Hash::make($portal['portal_password']),
                'role' => 'board_admin',
                'school_board' => $board->code,
                'account_status' => 'inactive',
                'preferred_language' => PlatformSetting::defaultLanguage(),
                'email_verified_at' => null,
            ]);

            InstitutionalSubscriptionService::apply($portalUser, $access, required: true);
            $portalUser->save();

            $schoolKeyMap = [];
            $createdSchools = [];
            $createdTeachers = [];
            $mailQueue = [
                ['user' => $portalUser, 'password' => $portal['portal_password'], 'mode' => 'verify'],
            ];

            foreach ($members['schools'] as $schoolInput) {
                [$school, $schoolMails, $tempKey] = $this->attachOrCreateSchool(
                    $board,
                    $schoolInput,
                    $access,
                );
                $createdSchools[] = $school->id;
                if ($tempKey) {
                    $schoolKeyMap[$tempKey] = $school->id;
                }
                foreach ($schoolMails as $mail) {
                    $mailQueue[] = $mail;
                }
            }

            foreach ($members['teachers'] as $teacherInput) {
                [$teacher, $teacherMails] = $this->attachOrCreateTeacher(
                    $board,
                    $teacherInput,
                    $schoolKeyMap,
                    $portalUser,
                );
                $createdTeachers[] = $teacher->id;
                foreach ($teacherMails as $mail) {
                    $mailQueue[] = $mail;
                }
            }

            return [
                'board' => $board,
                'mail_queue' => $mailQueue,
                'schools_count' => count($createdSchools),
                'teachers_count' => count($createdTeachers),
            ];
        });

        $emailsSent = 0;
        foreach ($result['mail_queue'] as $mail) {
            try {
                if (($mail['mode'] ?? 'verify') === 'welcome') {
                    NotificationMailer::sendWelcome($mail['user'], $mail['password']);
                } else {
                    NotificationMailer::sendVerifyAccount($mail['user'], $mail['password']);
                }
                $emailsSent++;
            } catch (Throwable $e) {
                Log::error('Board create member email failed', [
                    'board_id' => $result['board']->id,
                    'user_id' => $mail['user']->id ?? null,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        AuditLogger::log(
            'Create',
            'Board',
            "{$result['board']->name} created with {$result['schools_count']} school(s) and {$result['teachers_count']} teacher(s)",
            'info',
            $request,
            subject: $result['board'],
        );

        $stats = $this->statsForBoards(collect([$result['board']->code]));

        return response()->json([
            'board' => $this->format($result['board']->fresh(), $stats[$result['board']->code] ?? $this->emptyStats()),
            'emails_sent' => $emailsSent,
            'message' => 'School board created. Welcome / activation emails were sent to new accounts.',
        ], 201);
    }

    public function show(SchoolBoard $schoolBoard): JsonResponse
    {
        $stats = $this->statsForBoards(collect([$schoolBoard->code]));

        return response()->json([
            'board' => $this->format($schoolBoard, $stats[$schoolBoard->code] ?? $this->emptyStats()),
        ]);
    }

    public function update(Request $request, SchoolBoard $schoolBoard): JsonResponse
    {
        $data = $this->validated($request, $schoolBoard->id);
        $portal = $this->validatePortal($request, false, $schoolBoard);
        $access = $this->validateAccess($request, false);

        DB::transaction(function () use ($schoolBoard, $data, $portal, $access) {
            $boardUpdates = $data;
            if (! empty($portal['portal_password'])) {
                $boardUpdates['portal_password_encrypted'] = Crypt::encryptString($portal['portal_password']);
            }
            $schoolBoard->update($boardUpdates);

            $portalUser = $this->portalUser($schoolBoard);

            if ($portalUser) {
                $portalUser->fill([
                    'name' => $schoolBoard->contact_person ?: $schoolBoard->name,
                    'email' => $portal['portal_username'],
                    'school_board' => $schoolBoard->code,
                ]);

                if (! empty($portal['portal_password'])) {
                    $portalUser->password = Hash::make($portal['portal_password']);
                }

                InstitutionalSubscriptionService::apply($portalUser, $access);
                $portalUser->save();
            } else {
                $password = $portal['portal_password'] ?? Str::password(16);

                if (empty($portal['portal_password'])) {
                    $schoolBoard->update([
                        'portal_password_encrypted' => Crypt::encryptString($password),
                    ]);
                }

                $portalUser = User::create([
                    'name' => $schoolBoard->contact_person ?: $schoolBoard->name,
                    'email' => $portal['portal_username'],
                    'password' => Hash::make($password),
                    'role' => 'board_admin',
                    'school_board' => $schoolBoard->code,
                    'account_status' => $schoolBoard->status === 'archived' ? 'archived' : 'active',
                    'email_verified_at' => $schoolBoard->status === 'archived' ? null : now(),
                    'preferred_language' => PlatformSetting::defaultLanguage(),
                ]);

                InstitutionalSubscriptionService::apply($portalUser, $access ?: ['access_mode' => 'subscription'], required: true);
                $portalUser->save();

                if ($portalUser->account_status === 'active') {
                    try {
                        NotificationMailer::sendWelcome($portalUser, $password);
                    } catch (Throwable $e) {
                        Log::error('Board portal welcome email failed', [
                            'board_id' => $schoolBoard->id,
                            'error' => $e->getMessage(),
                        ]);
                    }
                }
            }
        });

        $stats = $this->statsForBoards(collect([$schoolBoard->code]));

        AuditLogger::log('Edit', 'Board', "{$schoolBoard->name} updated", 'info', $request, subject: $schoolBoard);

        return response()->json([
            'board' => $this->format($schoolBoard->fresh(), $stats[$schoolBoard->code] ?? $this->emptyStats()),
        ]);
    }

    public function sendBillingNotice(Request $request, SchoolBoard $schoolBoard): JsonResponse
    {
        $portalUser = $this->portalUser($schoolBoard);

        if (! $portalUser) {
            return response()->json(['message' => 'Board portal account not found.'], 404);
        }

        if ($portalUser->account_status === 'archived') {
            return response()->json(['message' => 'Archived board portals cannot receive billing notices.'], 422);
        }

        $data = $request->validate([
            'type' => ['required', 'in:'.implode(',', InstitutionalSubscriptionService::NOTICE_TYPES)],
        ]);

        InstitutionalSubscriptionService::sendBillingNotice($portalUser, $data['type']);

        $label = InstitutionalSubscriptionService::noticeLabel($data['type']);

        AuditLogger::log(
            'Email',
            'Board',
            "Admin sent {$label} notification to {$schoolBoard->name}",
            'info',
            $request,
            subject: $schoolBoard,
            metadata: ['notice_type' => $data['type']],
        );

        $stats = $this->statsForBoards(collect([$schoolBoard->code]));

        return response()->json([
            'board' => $this->format($schoolBoard->fresh(), $stats[$schoolBoard->code] ?? $this->emptyStats()),
            'message' => ucfirst($label).' email sent.',
        ]);
    }

    public function resendActivation(Request $request, SchoolBoard $schoolBoard): JsonResponse
    {
        $portalUser = $this->portalUser($schoolBoard);

        if (! $portalUser) {
            return response()->json(['message' => 'Board portal account not found.'], 404);
        }

        if ($portalUser->account_status === 'archived') {
            return response()->json(['message' => 'Archived board portals cannot receive activation emails.'], 422);
        }

        if ($portalUser->email_verified_at !== null || $portalUser->account_status === 'active') {
            return response()->json(['message' => 'This board portal is already activated.'], 422);
        }

        $plainPassword = $this->portalPasswordFor($schoolBoard);
        if (! $plainPassword) {
            return response()->json([
                'message' => 'The temporary password is unavailable. Set a new password before resending activation.',
            ], 422);
        }

        try {
            NotificationMailer::sendVerifyAccount($portalUser, $plainPassword);
        } catch (Throwable $e) {
            Log::error('Board activation email resend failed', [
                'board_id' => $schoolBoard->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json(['message' => 'The activation email could not be sent.'], 500);
        }

        AuditLogger::log(
            'Email',
            'Board',
            "Activation email resent for {$schoolBoard->name}",
            'info',
            $request,
            subject: $schoolBoard,
        );

        $stats = $this->statsForBoards(collect([$schoolBoard->code]));

        return response()->json([
            'board' => $this->format($schoolBoard->fresh(), $stats[$schoolBoard->code] ?? $this->emptyStats()),
            'message' => 'Activation email resent successfully.',
        ]);
    }

    public function activateAccount(Request $request, SchoolBoard $schoolBoard): JsonResponse
    {
        $portalUser = $this->portalUser($schoolBoard);

        if (! $portalUser) {
            return response()->json(['message' => 'Board portal account not found.'], 404);
        }

        if ($portalUser->account_status === 'archived' || $schoolBoard->status === 'archived') {
            return response()->json(['message' => 'Restore the archived board before activating the portal.'], 422);
        }

        $portalUser->forceFill([
            'account_status' => 'active',
            'email_verified_at' => $portalUser->email_verified_at ?? now(),
        ])->save();

        AuditLogger::log(
            'Activate',
            'Board',
            "{$schoolBoard->name} portal activated manually by administrator",
            'warning',
            $request,
            subject: $schoolBoard,
        );

        $stats = $this->statsForBoards(collect([$schoolBoard->code]));

        return response()->json([
            'board' => $this->format($schoolBoard->fresh(), $stats[$schoolBoard->code] ?? $this->emptyStats()),
            'message' => 'Board portal activated. Sign-in is now allowed.',
        ]);
    }

    public function archive(Request $request, SchoolBoard $schoolBoard): JsonResponse
    {
        $nextStatus = $schoolBoard->status === 'archived' ? 'active' : 'archived';

        DB::transaction(function () use ($schoolBoard, $nextStatus) {
            $schoolBoard->update(['status' => $nextStatus]);

            $portalUser = $this->portalUser($schoolBoard);

            if ($portalUser) {
                $portalUser->update([
                    'account_status' => $nextStatus === 'archived' ? 'archived' : 'active',
                ]);
            }
        });

        $stats = $this->statsForBoards(collect([$schoolBoard->code]));

        if ($nextStatus === 'archived') {
            AuditLogger::log('Archive', 'Board', "{$schoolBoard->name} archived", 'warning', $request, subject: $schoolBoard);
        } else {
            AuditLogger::log('Activate', 'Board', "{$schoolBoard->name} reactivated", 'info', $request, subject: $schoolBoard);
        }

        return response()->json([
            'board' => $this->format($schoolBoard->fresh(), $stats[$schoolBoard->code] ?? $this->emptyStats()),
        ]);
    }

    public function destroy(Request $request, SchoolBoard $schoolBoard): JsonResponse
    {
        if ($schoolBoard->status !== 'archived') {
            return response()->json([
                'message' => 'Only archived school boards can be permanently deleted.',
            ], 422);
        }

        $name = $schoolBoard->name;

        DB::transaction(function () use ($schoolBoard) {
            $portalUser = $this->portalUser($schoolBoard);

            if ($portalUser) {
                $portalUser->delete();
            }

            $schoolBoard->delete();
        });

        AuditLogger::log(
            'Delete',
            'Board',
            "{$name} permanently deleted",
            'critical',
            $request,
        );

        return response()->json(['message' => 'School board permanently deleted.']);
    }

    public function suggestCredentials(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:20', 'alpha_dash'],
        ]);

        $code = filled($data['code'] ?? null)
            ? strtoupper((string) $data['code'])
            : $this->generateUniqueCode($data['name']);

        return response()->json([
            ...$this->suggestCredentialsFor($data['name'], $code),
            'code' => $code,
        ]);
    }

    private function validateMembers(Request $request): array
    {
        $data = $request->validate([
            'schools' => ['nullable', 'array'],
            'schools.*.temp_key' => ['nullable', 'string', 'max:40'],
            'schools.*.existing_id' => ['nullable', 'integer', 'exists:schools,id'],
            'schools.*.name' => ['nullable', 'string', 'max:255'],
            'schools.*.email' => ['nullable', 'email', 'max:255'],
            'schools.*.password' => ['nullable', 'string', 'min:8', 'max:255'],
            'schools.*.city' => ['nullable', 'string', 'max:255'],
            'teachers' => ['nullable', 'array'],
            'teachers.*.existing_id' => ['nullable', 'integer', 'exists:users,id'],
            'teachers.*.name' => ['nullable', 'string', 'max:255'],
            'teachers.*.email' => ['nullable', 'email', 'max:255'],
            'teachers.*.password' => ['nullable', 'string', 'min:8', 'max:255'],
            'teachers.*.school_temp_key' => ['nullable', 'string', 'max:40'],
            'teachers.*.school_id' => ['nullable', 'integer', 'exists:schools,id'],
            'teachers.*.class_types' => ['nullable', 'array'],
            'teachers.*.class_types.*' => ['string', 'max:255'],
        ]);

        $allowedClassTypes = ClassType::allowedGradeValues(true);
        $schools = [];
        foreach ($data['schools'] ?? [] as $index => $school) {
            $existingId = $school['existing_id'] ?? null;
            if ($existingId) {
                $schools[] = [
                    'existing_id' => (int) $existingId,
                    'temp_key' => $school['temp_key'] ?? ('existing-'.$existingId),
                    'email' => $school['email'] ?? null,
                    'password' => $school['password'] ?? null,
                    'name' => $school['name'] ?? null,
                    'city' => $school['city'] ?? null,
                ];
                continue;
            }

            if (! filled($school['name'] ?? null) || ! filled($school['email'] ?? null) || ! filled($school['password'] ?? null)) {
                abort(response()->json([
                    'message' => 'Each new school needs a name, email, and temporary password.',
                    'errors' => ["schools.{$index}" => ['Incomplete school entry.']],
                ], 422));
            }

            if (User::query()->where('email', $school['email'])->exists()) {
                abort(response()->json([
                    'message' => "School email {$school['email']} is already in use.",
                ], 422));
            }

            $schools[] = [
                'existing_id' => null,
                'temp_key' => $school['temp_key'] ?? ('new-'.$index),
                'name' => trim((string) $school['name']),
                'email' => trim((string) $school['email']),
                'password' => (string) $school['password'],
                'city' => trim((string) ($school['city'] ?? '')) ?: '—',
            ];
        }

        $teachers = [];
        foreach ($data['teachers'] ?? [] as $index => $teacher) {
            $classTypes = array_values(array_unique(array_filter(array_map(
                fn ($value) => trim((string) $value),
                $teacher['class_types'] ?? []
            ))));

            foreach ($classTypes as $classType) {
                if (! in_array($classType, $allowedClassTypes, true)) {
                    abort(response()->json([
                        'message' => "Invalid class type \"{$classType}\" for teacher entry.",
                    ], 422));
                }
            }

            $existingId = $teacher['existing_id'] ?? null;
            if ($existingId) {
                $user = User::query()->where('id', $existingId)->where('role', 'teacher')->first();
                if (! $user) {
                    abort(response()->json(['message' => 'Selected teacher was not found.'], 422));
                }
                $teachers[] = [
                    'existing_id' => (int) $existingId,
                    'email' => $teacher['email'] ?? null,
                    'password' => $teacher['password'] ?? null,
                    'name' => $teacher['name'] ?? null,
                    'school_temp_key' => $teacher['school_temp_key'] ?? null,
                    'school_id' => $teacher['school_id'] ?? null,
                    'class_types' => $classTypes,
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
                'school_temp_key' => $teacher['school_temp_key'] ?? null,
                'school_id' => $teacher['school_id'] ?? null,
                'class_types' => $classTypes,
            ];
        }

        return ['schools' => $schools, 'teachers' => $teachers];
    }

    /**
     * @return array{0: School, 1: list<array{user: User, password: string, mode: string}>, 2: ?string}
     */
    private function attachOrCreateSchool(SchoolBoard $board, array $input, array $access): array
    {
        if (! empty($input['existing_id'])) {
            $school = School::query()->findOrFail($input['existing_id']);
            $school->update([
                'school_board' => $board->code,
                'name' => filled($input['name'] ?? null) ? $input['name'] : $school->name,
                'city' => filled($input['city'] ?? null) ? $input['city'] : $school->city,
            ]);

            $portalUser = User::query()
                ->where('role', 'school_admin')
                ->where('school_id', $school->id)
                ->first();

            $mails = [];
            $password = filled($input['password'] ?? null) ? (string) $input['password'] : Str::password(16);

            if ($portalUser) {
                $portalUser->fill([
                    'school_board' => $board->code,
                    'name' => $school->name,
                ]);
                if (filled($input['email'] ?? null)) {
                    $portalUser->email = $input['email'];
                }
                $portalUser->password = Hash::make($password);
                InstitutionalSubscriptionService::apply($portalUser, $access);
                $portalUser->save();
                $school->update(['portal_password_encrypted' => Crypt::encryptString($password)]);
                $mails[] = ['user' => $portalUser, 'password' => $password, 'mode' => 'welcome'];
            } else {
                $email = filled($input['email'] ?? null) ? $input['email'] : null;
                if ($email) {
                    $portalUser = User::create([
                        'name' => $school->name,
                        'email' => $email,
                        'password' => Hash::make($password),
                        'role' => 'school_admin',
                        'school_id' => $school->id,
                        'school_board' => $board->code,
                        'account_status' => 'inactive',
                        'preferred_language' => PlatformSetting::defaultLanguage(),
                        'email_verified_at' => null,
                    ]);
                    InstitutionalSubscriptionService::apply($portalUser, $access, required: true);
                    $portalUser->save();
                    $school->update(['portal_password_encrypted' => Crypt::encryptString($password)]);
                    $mails[] = ['user' => $portalUser, 'password' => $password, 'mode' => 'verify'];
                }
            }

            return [$school, $mails, $input['temp_key'] ?? null];
        }

        $password = (string) $input['password'];
        $school = School::create([
            'name' => $input['name'],
            'city' => $input['city'] ?? '—',
            'school_board' => $board->code,
            'grades' => null,
            'status' => 'active',
            'portal_password_encrypted' => Crypt::encryptString($password),
        ]);

        $portalUser = User::create([
            'name' => $school->name,
            'email' => $input['email'],
            'password' => Hash::make($password),
            'role' => 'school_admin',
            'school_id' => $school->id,
            'school_board' => $board->code,
            'account_status' => 'inactive',
            'preferred_language' => PlatformSetting::defaultLanguage(),
            'email_verified_at' => null,
        ]);

        InstitutionalSubscriptionService::apply($portalUser, $access, required: true);
        $portalUser->save();

        return [
            $school,
            [['user' => $portalUser, 'password' => $password, 'mode' => 'verify']],
            $input['temp_key'] ?? null,
        ];
    }

    /**
     * @param  array<string, int>  $schoolKeyMap
     * @return array{0: User, 1: list<array{user: User, password: string, mode: string}>}
     */
    private function attachOrCreateTeacher(SchoolBoard $board, array $input, array $schoolKeyMap, User $sponsor): array
    {
        $schoolId = $input['school_id'] ?? null;
        if (! $schoolId && filled($input['school_temp_key'] ?? null)) {
            $schoolId = $schoolKeyMap[$input['school_temp_key']] ?? null;
        }

        if (! empty($input['existing_id'])) {
            $teacher = User::query()->where('role', 'teacher')->findOrFail($input['existing_id']);
            $password = filled($input['password'] ?? null) ? (string) $input['password'] : Str::password(16);

            $teacher->fill([
                'school_board' => $board->code,
                'school_id' => $schoolId ?: $teacher->school_id,
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
                'board_registration',
            );
            $teacher->save();

            $this->createClassesForTeacher($teacher, $input['class_types'] ?? []);

            return [$teacher, [['user' => $teacher, 'password' => $password, 'mode' => 'welcome']]];
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
            'school_id' => $schoolId,
            'school_board' => $board->code,
            'affiliation_type' => 'institutional',
            'registration_source' => 'board_registration',
            'account_status' => 'active',
            'preferred_language' => PlatformSetting::defaultLanguage(),
            'portal_password_encrypted' => Crypt::encryptString($password),
            'email_verified_at' => now(),
        ]);

        InstitutionalSubscriptionService::applyInstitutionalCoverageFromSponsor(
            $teacher,
            $sponsor,
            'board_registration',
        );
        $teacher->save();

        $this->createClassesForTeacher($teacher, $input['class_types'] ?? []);

        return [$teacher, [['user' => $teacher, 'password' => $password, 'mode' => 'welcome']]];
    }

    /** @param list<string> $classTypes */
    private function createClassesForTeacher(User $teacher, array $classTypes): void
    {
        $year = SchoolYear::defaultLabel();

        foreach ($classTypes as $grade) {
            $grade = trim((string) $grade);
            if ($grade === '') {
                continue;
            }

            $exists = SchoolClass::query()
                ->where('teacher_id', $teacher->id)
                ->where('grade', $grade)
                ->where('school_year', $year)
                ->exists();

            if ($exists) {
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
    }

    /** @return array{0: string, 1: string} */
    private function splitName(string $name): array
    {
        $parts = preg_split('/\s+/', trim($name), 2) ?: [];
        $first = $parts[0] ?? 'Teacher';
        $last = $parts[1] ?? 'Account';

        return [$first, $last];
    }

    private function generateUniqueCode(string $name): string
    {
        $words = preg_split('/\s+/', trim($name)) ?: [];
        $code = '';
        foreach ($words as $word) {
            $clean = preg_replace('/[^A-Za-z0-9]/', '', $word) ?: '';
            if ($clean !== '') {
                $code .= strtoupper(substr($clean, 0, 1));
            }
        }

        if (strlen($code) < 2) {
            $slug = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', Str::slug($name, '')) ?: 'BOARD');
            $code = substr($slug, 0, 6) ?: 'BOARD';
        }

        $code = substr($code, 0, 8);
        $base = $code;
        $counter = 1;
        while (SchoolBoard::query()->where('code', $code)->exists()) {
            $suffix = (string) $counter++;
            $code = substr($base, 0, max(1, 20 - strlen($suffix))).$suffix;
        }

        return $code;
    }

    private function validatePortal(Request $request, bool $creating, ?SchoolBoard $board = null): array
    {
        $portalUserId = $board ? $this->portalUser($board)?->id : null;

        return $request->validate([
            'portal_username' => [
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($portalUserId),
            ],
            'portal_password' => [$creating ? 'required' : 'nullable', 'string', 'min:8', 'max:255'],
        ]);
    }

    private function validateAccess(Request $request, bool $creating): array
    {
        return $request->validate([
            'access_mode' => [$creating ? 'required' : 'sometimes', 'in:trial,subscription'],
            'trial_started_at' => ['nullable', 'date'],
            'trial_ends_at' => ['nullable', 'date', 'after_or_equal:trial_started_at'],
            'subscription_started_at' => ['nullable', 'date'],
            'subscription_ends_at' => ['nullable', 'date', 'after_or_equal:subscription_started_at'],
        ]);
    }

    private function portalUser(SchoolBoard $board): ?User
    {
        return User::query()
            ->where('role', 'board_admin')
            ->where('school_board', $board->code)
            ->first();
    }

    private function suggestCredentialsFor(string $name, string $code): array
    {
        $slug = Str::slug($name, '.');
        $baseUsername = "{$slug}.{$code}@portal.local";
        $username = $baseUsername;
        $counter = 1;

        while (User::query()->where('email', $username)->exists()) {
            $username = "{$slug}.{$code}.{$counter}@portal.local";
            $counter++;
        }

        return [
            'portal_username' => $username,
            'portal_password' => Str::password(16),
        ];
    }

    private function validated(Request $request, ?int $ignoreId = null): array
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'contact_person' => ['nullable', 'string', 'max:255'],
            'code' => [
                'required',
                'string',
                'max:20',
                'alpha_dash',
                Rule::unique('school_boards', 'code')->ignore($ignoreId),
            ],
            'status' => ['sometimes', 'string', 'in:Active,Inactive,Archived,active,inactive,archived'],
        ]);

        $data['code'] = strtoupper($data['code']);
        $data['status'] = $this->parseStatus($data['status'] ?? 'active');
        $data['region'] = '';
        $data['contact_person'] = trim((string) ($data['contact_person'] ?? '')) ?: null;

        return $data;
    }

    private function parseStatus(string $status): string
    {
        return match (strtolower($status)) {
            'archived' => 'archived',
            'inactive' => 'inactive',
            default => 'active',
        };
    }

    private function displayStatus(string $status): string
    {
        return match ($status) {
            'archived' => 'Archived',
            'inactive' => 'Inactive',
            default => 'Active',
        };
    }

    /** @param Collection<int, string> $codes */
    private function statsForBoards(Collection $codes): array
    {
        if ($codes->isEmpty()) {
            return [];
        }

        $schoolsByBoard = School::query()
            ->whereIn('school_board', $codes)
            ->get(['id', 'school_board', 'status'])
            ->groupBy('school_board');

        $teachersByBoard = User::query()
            ->where('role', 'teacher')
            ->whereIn('school_board', $codes)
            ->where('account_status', '!=', 'archived')
            ->selectRaw('school_board, count(*) as total')
            ->groupBy('school_board')
            ->pluck('total', 'school_board');

        $allSchoolIds = $schoolsByBoard->flatten()->pluck('id');
        $studentCountsBySchool = $this->studentCountsForSchools($allSchoolIds);

        $stats = [];

        foreach ($codes as $code) {
            $schools = $schoolsByBoard->get($code, collect());
            $activeSchools = $schools->where('status', 'active');
            $schoolIds = $schools->pluck('id');

            $students = $schoolIds
                ->map(fn ($id) => $studentCountsBySchool[$id] ?? 0)
                ->sum();

            $stats[$code] = [
                'schools' => $activeSchools->count(),
                'teachers' => (int) ($teachersByBoard[$code] ?? 0),
                'students' => (int) $students,
            ];
        }

        return $stats;
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

    private function emptyStats(): array
    {
        return ['schools' => 0, 'teachers' => 0, 'students' => 0];
    }

    private function portalPasswordFor(SchoolBoard $board): ?string
    {
        if (! $board->portal_password_encrypted) {
            return null;
        }

        try {
            return Crypt::decryptString($board->portal_password_encrypted);
        } catch (\Throwable) {
            return null;
        }
    }

    private function format(SchoolBoard $board, array $stats): array
    {
        $portalUser = $this->portalUser($board);

        return [
            'id' => $board->id,
            'name' => $board->name,
            'contact_person' => $board->contact_person,
            'code' => $board->code,
            'schools' => $stats['schools'],
            'teachers' => $stats['teachers'],
            'students' => $stats['students'],
            'status' => $this->displayStatus($board->status),
            'created' => $board->created_at?->format('Y-m-d') ?? '',
            'portal_username' => $portalUser?->email,
            'portal_password' => $this->portalPasswordFor($board),
            'portal_account_status' => $portalUser?->account_status,
            'portal_email_verified_at' => $portalUser?->email_verified_at?->toIso8601String(),
            'activation_pending' => (bool) ($portalUser && $portalUser->account_status === 'inactive' && $portalUser->email_verified_at === null),
            ...InstitutionalSubscriptionService::format($portalUser),
        ];
    }
}
