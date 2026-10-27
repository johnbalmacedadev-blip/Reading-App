<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\School;
use App\Models\SchoolBoard;
use App\Models\SchoolClass;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BoardTeacherController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        /** @var User|null $admin */
        $admin = $request->user();
        abort_unless($admin?->role === 'board_admin' && $admin->school_board, 403);

        $boardCode = (string) $admin->school_board;
        $board = SchoolBoard::query()->where('code', $boardCode)->first();
        abort_unless($board && $board->status !== 'archived', 403);

        $schoolIds = School::query()
            ->where('school_board', $boardCode)
            ->pluck('id');

        $schoolNames = School::query()
            ->whereIn('id', $schoolIds)
            ->pluck('name', 'id');

        $teachers = User::query()
            ->where('role', 'teacher')
            ->whereIn('account_status', ['pending', 'active'])
            ->where(function ($query) use ($boardCode, $schoolIds) {
                $query->where('school_board', $boardCode)
                    ->orWhere('requested_board_code', $boardCode)
                    ->orWhereIn('school_id', $schoolIds);
            })
            ->orderByRaw("CASE WHEN account_status = 'pending' THEN 0 ELSE 1 END")
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->orderBy('name')
            ->get();

        $classCounts = SchoolClass::query()
            ->where(function ($query) use ($boardCode, $schoolIds) {
                $query->whereIn('school_id', $schoolIds)
                    ->orWhereHas('teacher', function ($teacherQuery) use ($boardCode, $schoolIds) {
                        $teacherQuery->where('school_board', $boardCode)
                            ->orWhereIn('school_id', $schoolIds);
                    });
            })
            ->whereIn('teacher_id', $teachers->pluck('id'))
            ->selectRaw('teacher_id, COUNT(*) as classes_count')
            ->groupBy('teacher_id')
            ->pluck('classes_count', 'teacher_id');

        return response()->json([
            'teachers' => $teachers->map(function (User $teacher) use ($classCounts, $schoolNames) {
                $schoolId = $teacher->school_id ? (int) $teacher->school_id : null;

                return [
                    'id' => $teacher->id,
                    'name' => $teacher->displayName(),
                    'first_name' => $teacher->first_name,
                    'last_name' => $teacher->last_name,
                    'email' => $teacher->email,
                    'affiliation_type' => $teacher->affiliation_type,
                    'status' => $teacher->account_status,
                    'requested_at' => ($teacher->join_requested_at ?? $teacher->created_at)?->toIso8601String(),
                    'started_at' => $teacher->started_at
                        ? (is_string($teacher->started_at) ? $teacher->started_at : $teacher->started_at->toDateString())
                        : null,
                    'classes_count' => (int) ($classCounts[$teacher->id] ?? 0),
                    'school_id' => $schoolId,
                    'school_name' => $schoolId ? ($schoolNames[$schoolId] ?? null) : null,
                ];
            })->values()->all(),
            'summary' => [
                'total' => $teachers->count(),
                'pending' => $teachers->where('account_status', 'pending')->count(),
                'accepted' => $teachers->where('account_status', 'active')->count(),
            ],
        ]);
    }
}
