<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SchoolBoard;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BoardTeacherRequestController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $admin = $this->boardAdmin($request);
        $boardCode = (string) $admin->school_board;

        $teachers = User::query()
            ->where('role', 'teacher')
            ->where('account_status', 'pending')
            ->where('affiliation_type', 'board')
            ->where(function ($query) use ($boardCode) {
                $query->where('requested_board_code', $boardCode)
                    ->orWhere('school_board', $boardCode);
            })
            ->orderByDesc('join_requested_at')
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'requests' => $teachers->map(fn (User $teacher) => $this->format($teacher)),
        ]);
    }

    public function accept(Request $request, User $teacher): JsonResponse
    {
        $admin = $this->boardAdmin($request);
        $boardCode = (string) $admin->school_board;
        $this->ensurePendingBoardRequest($teacher, $boardCode);

        $teacher->forceFill([
            'account_status' => 'active',
            'email_verified_at' => $teacher->email_verified_at ?? now(),
            'started_at' => $teacher->started_at ?? now()->toDateString(),
            'school_board' => $boardCode,
            'requested_board_code' => $boardCode,
        ])->save();

        AuditLogger::log(
            'Activate',
            'Teacher',
            "{$teacher->displayName()} accepted by school board administrator",
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
        $admin = $this->boardAdmin($request);
        $this->ensurePendingBoardRequest($teacher, (string) $admin->school_board);

        $teacher->forceFill([
            'account_status' => 'archived',
        ])->save();

        AuditLogger::log(
            'Archive',
            'Teacher',
            "{$teacher->displayName()} join request rejected by school board",
            'warning',
            $request,
            subject: $teacher,
        );

        return response()->json([
            'message' => 'Teacher join request rejected.',
        ]);
    }

    private function boardAdmin(Request $request): User
    {
        /** @var User|null $user */
        $user = $request->user();
        abort_unless($user?->role === 'board_admin' && $user->school_board, 403);

        $board = SchoolBoard::query()->where('code', $user->school_board)->first();
        abort_unless($board && $board->status !== 'archived', 403);

        return $user;
    }

    private function ensurePendingBoardRequest(User $teacher, string $boardCode): void
    {
        abort_unless(
            $teacher->role === 'teacher'
            && $teacher->account_status === 'pending'
            && $teacher->affiliation_type === 'board'
            && in_array($boardCode, [(string) $teacher->requested_board_code, (string) $teacher->school_board], true),
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
