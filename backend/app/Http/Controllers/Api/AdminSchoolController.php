<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\School;
use App\Models\SchoolBoard;
use App\Models\PlatformSetting;
use App\Models\User;
use App\Services\AuditLogger;
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

        $school = DB::transaction(function () use ($data) {
            $school = School::create([
                'name' => $data['name'],
                'city' => $data['city'],
                'school_board' => $data['school_board'],
                'grades' => $data['grades'] ?? null,
                'status' => 'active',
                'portal_password_encrypted' => Crypt::encryptString($data['portal_password']),
            ]);

            User::create([
                'name' => $school->name,
                'email' => $data['portal_username'],
                'password' => Hash::make($data['portal_password']),
                'role' => 'school_admin',
                'school_id' => $school->id,
                'school_board' => $school->school_board,
                'account_status' => 'inactive',
                'preferred_language' => PlatformSetting::defaultLanguage(),
                'email_verified_at' => null,
            ]);

            return $school;
        });

        $portalUser = User::query()
            ->where('role', 'school_admin')
            ->where('school_id', $school->id)
            ->first();

        if ($portalUser) {
            try {
                NotificationMailer::sendVerifyAccount($portalUser, $data['portal_password']);
            } catch (Throwable $e) {
                Log::error('School portal verify email failed', [
                    'school_id' => $school->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        AuditLogger::log('Create', 'School', "{$school->name} created", 'info', $request, subject: $school);

        return response()->json(['school' => $this->format($school)], 201);
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

                $portalUser->save();
            }
        });

        AuditLogger::log('Edit', 'School', "{$school->name} updated", 'info', $request, subject: $school);

        return response()->json(['school' => $this->format($school->fresh())]);
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

    public function suggestCredentials(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'school_board' => ['nullable', 'string', Rule::in($this->allowedBoardCodes())],
        ]);

        $defaultBoard = $this->activeBoardCodes()[0] ?? 'CSDM';
        $board = array_key_exists('school_board', $data)
            ? $this->normalizeSchoolBoard($data['school_board'])
            : $defaultBoard;

        return response()->json($this->suggestCredentialsFor(
            $data['name'],
            $board
        ));
    }

    private function validateSchool(Request $request, bool $creating, ?School $school = null): array
    {
        $portalUserId = $school ? $this->portalUser($school)?->id : null;

        $rules = [
            'name' => ['required', 'string', 'max:255'],
            'city' => ['required', 'string', 'max:255'],
            'school_board' => ['nullable', 'string', Rule::in($this->allowedBoardCodes($school))],
            'grades' => ['nullable', 'string', 'max:50'],
            'portal_username' => [
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($portalUserId),
            ],
            'portal_password' => [$creating ? 'required' : 'nullable', 'string', 'min:8', 'max:255'],
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
            'city' => $school->city,
            'grades' => $school->grades ?? '—',
            'teachers' => $teacherCount,
            'students' => $studentsCount ?? $this->studentCountFor($school),
            'status' => ucfirst($school->status),
            'portal_username' => $portalUser?->email,
            'portal_password' => $this->portalPasswordFor($school),
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
