<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SchoolClass;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SchoolTeacherController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        /** @var User|null $admin */
        $admin = $request->user();
        abort_unless($admin?->role === 'school_admin' && $admin->school_id, 403);

        $schoolId = (int) $admin->school_id;

        $teachers = User::query()
            ->where('role', 'teacher')
            ->where('school_id', $schoolId)
            ->whereIn('account_status', ['pending', 'active'])
            ->orderByRaw("CASE WHEN account_status = 'pending' THEN 0 ELSE 1 END")
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->orderBy('name')
            ->get();

        $classCounts = SchoolClass::query()
            ->where('school_id', $schoolId)
            ->whereIn('teacher_id', $teachers->pluck('id'))
            ->selectRaw('teacher_id, COUNT(*) as classes_count')
            ->groupBy('teacher_id')
            ->pluck('classes_count', 'teacher_id');

        return response()->json([
            'teachers' => $teachers->map(fn (User $teacher) => [
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
            ])->values()->all(),
            'summary' => [
                'total' => $teachers->count(),
                'pending' => $teachers->where('account_status', 'pending')->count(),
                'accepted' => $teachers->where('account_status', 'active')->count(),
            ],
        ]);
    }
}
