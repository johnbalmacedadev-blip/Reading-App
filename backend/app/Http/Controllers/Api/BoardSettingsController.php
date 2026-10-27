<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SchoolBoard;
use App\Models\SchoolYear;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BoardSettingsController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        [$user, $board] = $this->boardContext($request);

        return response()->json([
            'settings' => $board->mergedSettings(),
            'account' => [
                'name' => $user->displayName(),
                'email' => $user->email,
                'preferred_language' => in_array($user->preferred_language, ['en', 'fr'], true)
                    ? $user->preferred_language
                    : null,
            ],
            'school_years' => SchoolYear::query()
                ->orderBy('label')
                ->get(['id', 'label', 'is_default'])
                ->map(fn (SchoolYear $year) => [
                    'id' => $year->id,
                    'label' => $year->label,
                    'is_default' => (bool) $year->is_default,
                ])
                ->values()
                ->all(),
            'default_school_year' => SchoolYear::defaultLabel(),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        [$user, $board] = $this->boardContext($request);

        $data = $request->validate([
            'allow_french' => ['required', 'boolean'],
            'allow_english' => ['required', 'boolean'],
            'teachers_change_language' => ['required', 'boolean'],
            'allow_schools_export' => ['required', 'boolean'],
            'allow_not_required' => ['required', 'boolean'],
            'active_school_year' => ['nullable', 'string', 'max:20'],
            'on_track_threshold' => ['required', 'integer', 'min:0', 'max:100'],
            'monitor_threshold' => ['required', 'integer', 'min:0', 'max:100'],
            'at_risk_threshold' => ['required', 'integer', 'min:0', 'max:100'],
            'email_notifications' => ['required', 'boolean'],
            'student_progress_alerts' => ['required', 'boolean'],
            'preferred_language' => ['nullable', 'string', Rule::in(['en', 'fr'])],
        ]);

        $onTrack = (int) $data['on_track_threshold'];
        $monitor = (int) $data['monitor_threshold'];
        $atRisk = (int) $data['at_risk_threshold'];

        if ($monitor > $onTrack) {
            return response()->json([
                'message' => 'Monitor threshold must be less than or equal to On Track threshold.',
                'errors' => [
                    'monitor_threshold' => ['Monitor threshold must be ≤ On Track threshold.'],
                ],
            ], 422);
        }

        if ($atRisk > $monitor) {
            return response()->json([
                'message' => 'At Risk threshold must be less than or equal to Monitor threshold.',
                'errors' => [
                    'at_risk_threshold' => ['At Risk threshold must be ≤ Monitor threshold.'],
                ],
            ], 422);
        }

        $activeYear = filled($data['active_school_year'] ?? null)
            ? SchoolYear::normalizeLabel((string) $data['active_school_year'])
            : null;

        if ($activeYear !== null && $activeYear !== '' && ! SchoolYear::isValidSpan($activeYear)) {
            return response()->json([
                'message' => 'Choose a valid school year.',
                'errors' => [
                    'active_school_year' => ['Choose a valid school year.'],
                ],
            ], 422);
        }

        $incoming = [
            'allow_french' => $request->boolean('allow_french'),
            'allow_english' => $request->boolean('allow_english'),
            'teachers_change_language' => $request->boolean('teachers_change_language'),
            'schools_modify_ateliers' => true,
            'lock_ateliers_1_to_17' => false,
            'allow_schools_export' => $request->boolean('allow_schools_export'),
            'allow_not_required' => $request->boolean('allow_not_required'),
            'share_anonymous_data' => false,
            'active_school_year' => $activeYear ?: null,
            'thresholds' => [
                'on_track' => $onTrack,
                'monitor' => $monitor,
                'at_risk' => $atRisk,
            ],
            'notifications' => [
                'email' => $request->boolean('email_notifications'),
                'progress_alerts' => $request->boolean('student_progress_alerts'),
            ],
        ];

        if (! $incoming['allow_french'] && ! $incoming['allow_english']) {
            return response()->json([
                'message' => 'At least one language must remain enabled.',
            ], 422);
        }

        $board->settings = array_replace_recursive($board->mergedSettings(), $incoming);
        $board->save();

        if (array_key_exists('preferred_language', $data) && $data['preferred_language']) {
            $user->preferred_language = $data['preferred_language'];
            $user->save();
        }

        AuditLogger::log(
            'Edit',
            'Board',
            "{$board->name} settings updated",
            'info',
            $request,
            subject: $board,
        );

        return response()->json([
            'settings' => $board->fresh()->mergedSettings(),
            'account' => [
                'name' => $user->fresh()->displayName(),
                'email' => $user->email,
                'preferred_language' => in_array($user->preferred_language, ['en', 'fr'], true)
                    ? $user->preferred_language
                    : null,
            ],
            'message' => 'Settings saved.',
        ]);
    }

    /** @return array{0: User, 1: SchoolBoard} */
    private function boardContext(Request $request): array
    {
        /** @var User|null $user */
        $user = $request->user();
        abort_unless($user?->role === 'board_admin' && $user->school_board, 403);

        $board = SchoolBoard::query()->where('code', $user->school_board)->first();
        abort_unless($board && $board->status !== 'archived', 403);

        return [$user, $board];
    }
}
