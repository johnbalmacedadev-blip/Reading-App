<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PlatformSetting;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SchoolTeacherRequestController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $admin = $this->schoolAdmin($request);

        $teachers = User::query()
            ->where('role', 'teacher')
            ->where('account_status', 'pending')
            ->where('affiliation_type', 'school')
            ->where('school_id', $admin->school_id)
            ->orderByDesc('join_requested_at')
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'requests' => $teachers->map(fn (User $teacher) => $this->format($teacher)),
        ]);
    }

    public function accept(Request $request, User $teacher): JsonResponse
    {
        PlatformSetting::assertPermission('school_can_manage_teachers', true);

        $admin = $this->schoolAdmin($request);
        $this->ensurePendingSchoolRequest($teacher, (int) $admin->school_id);

        $teacher->forceFill([
            'account_status' => 'active',
            'email_verified_at' => $teacher->email_verified_at ?? now(),
            'started_at' => $teacher->started_at ?? now()->toDateString(),
            'school_board' => $teacher->school_board ?: $admin->school?->school_board,
        ])->save();

        AuditLogger::log(
            'Activate',
            'Teacher',
            "{$teacher->displayName()} accepted by school administrator",
            'info',
            $request,
            subject: $teacher,
        );

        return response()->json([
            'request' => $this->format($teacher->fresh()),
            'message' => 'Teacher account activated.',
        ]);
    }

    public function reject(Request $request, User $teacher): JsonResponse
    {
        PlatformSetting::assertPermission('school_can_manage_teachers', true);

        $admin = $this->schoolAdmin($request);
        $this->ensurePendingSchoolRequest($teacher, (int) $admin->school_id);

        $teacher->forceFill([
            'account_status' => 'archived',
        ])->save();

        AuditLogger::log(
            'Archive',
            'Teacher',
            "{$teacher->displayName()} join request rejected by school",
            'warning',
            $request,
            subject: $teacher,
        );

        return response()->json([
            'message' => 'Teacher join request rejected.',
        ]);
    }

    private function schoolAdmin(Request $request): User
    {
        /** @var User|null $user */
        $user = $request->user();
        abort_unless($user?->role === 'school_admin' && $user->school_id, 403);

        $user->loadMissing('school');

        return $user;
    }

    private function ensurePendingSchoolRequest(User $teacher, int $schoolId): void
    {
        abort_unless(
            $teacher->role === 'teacher'
            && $teacher->account_status === 'pending'
            && $teacher->affiliation_type === 'school'
            && (int) $teacher->school_id === $schoolId,
            404
        );
    }

    private function format(User $teacher): array
    {
        return [
            'id' => $teacher->id,
            'name' => $teacher->displayName(),
            'first_name' => $teacher->first_name,
            'last_name' => $teacher->last_name,
            'email' => $teacher->email,
            'affiliation_type' => $teacher->affiliation_type,
            'status' => $teacher->account_status,
            'requested_at' => ($teacher->join_requested_at ?? $teacher->created_at)?->toIso8601String(),
        ];
    }
}
