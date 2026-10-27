<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PlatformSetting;
use App\Models\School;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BoardSchoolController extends Controller
{
    public function update(Request $request, School $school): JsonResponse
    {
        PlatformSetting::assertPermission('board_can_edit_schools', false);

        $admin = $this->boardAdmin($request);
        $boardCode = trim((string) ($admin->school_board ?? ''));
        abort_unless($boardCode !== '' && $school->school_board === $boardCode, 403);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:120'],
            'grades' => ['nullable', 'string', 'max:120'],
        ]);

        $school->forceFill([
            'name' => trim($data['name']),
            'city' => trim((string) ($data['city'] ?? '')) ?: null,
            'grades' => trim((string) ($data['grades'] ?? '')) ?: $school->grades,
        ])->save();

        AuditLogger::log(
            'Edit',
            'School',
            "{$school->name} updated by board administrator",
            'info',
            $request,
            subject: $school,
        );

        return response()->json([
            'school' => [
                'id' => $school->id,
                'name' => $school->name,
                'city' => $school->city,
                'grades' => $school->grades,
                'school_board' => $school->school_board,
            ],
            'message' => 'School updated.',
        ]);
    }

    private function boardAdmin(Request $request): User
    {
        /** @var User|null $user */
        $user = $request->user();
        abort_unless($user?->role === 'board_admin', 403);

        return $user;
    }
}
