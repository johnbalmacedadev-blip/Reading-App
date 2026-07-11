<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\School;
use App\Models\SchoolBoard;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

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

        $board = DB::transaction(function () use ($data, $portal) {
            $board = SchoolBoard::create([
                ...$data,
                'portal_password_encrypted' => Crypt::encryptString($portal['portal_password']),
            ]);

            User::create([
                'name' => $board->name,
                'email' => $portal['portal_username'],
                'password' => Hash::make($portal['portal_password']),
                'role' => 'board_admin',
                'school_board' => $board->code,
                'account_status' => 'active',
            ]);

            return $board;
        });

        AuditLogger::log('Create', 'Board', "{$board->name} created", 'info', $request, subject: $board);

        return response()->json([
            'board' => $this->format($board, $this->emptyStats()),
        ], 201);
    }

    public function update(Request $request, SchoolBoard $schoolBoard): JsonResponse
    {
        $data = $this->validated($request, $schoolBoard->id);
        $portal = $this->validatePortal($request, false, $schoolBoard);

        DB::transaction(function () use ($schoolBoard, $data, $portal) {
            $boardUpdates = $data;
            if (! empty($portal['portal_password'])) {
                $boardUpdates['portal_password_encrypted'] = Crypt::encryptString($portal['portal_password']);
            }
            $schoolBoard->update($boardUpdates);

            $portalUser = $this->portalUser($schoolBoard);

            if ($portalUser) {
                $portalUser->fill([
                    'name' => $schoolBoard->name,
                    'email' => $portal['portal_username'],
                    'school_board' => $schoolBoard->code,
                ]);

                if (! empty($portal['portal_password'])) {
                    $portalUser->password = Hash::make($portal['portal_password']);
                }

                $portalUser->save();
            } else {
                $password = $portal['portal_password'] ?? Str::password(16);

                if (empty($portal['portal_password'])) {
                    $schoolBoard->update([
                        'portal_password_encrypted' => Crypt::encryptString($password),
                    ]);
                }

                User::create([
                    'name' => $schoolBoard->name,
                    'email' => $portal['portal_username'],
                    'password' => Hash::make($password),
                    'role' => 'board_admin',
                    'school_board' => $schoolBoard->code,
                    'account_status' => $schoolBoard->status === 'archived' ? 'archived' : 'active',
                ]);
            }
        });

        $stats = $this->statsForBoards(collect([$schoolBoard->code]));

        AuditLogger::log('Edit', 'Board', "{$schoolBoard->name} updated", 'info', $request, subject: $schoolBoard);

        return response()->json([
            'board' => $this->format($schoolBoard->fresh(), $stats[$schoolBoard->code] ?? $this->emptyStats()),
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

    public function suggestCredentials(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:20', 'alpha_dash'],
        ]);

        return response()->json($this->suggestCredentialsFor(
            $data['name'],
            strtoupper($data['code'] ?? 'BOARD')
        ));
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
        return [
            'id' => $board->id,
            'name' => $board->name,
            'code' => $board->code,
            'schools' => $stats['schools'],
            'teachers' => $stats['teachers'],
            'students' => $stats['students'],
            'status' => $this->displayStatus($board->status),
            'created' => $board->created_at?->format('Y-m-d') ?? '',
            'portal_username' => $this->portalUser($board)?->email,
            'portal_password' => $this->portalPasswordFor($board),
        ];
    }
}
