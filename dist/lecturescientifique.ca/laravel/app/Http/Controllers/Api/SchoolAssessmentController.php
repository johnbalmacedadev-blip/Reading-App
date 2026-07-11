<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Assessment;
use App\Models\BoardAssessmentArchive;
use App\Models\School;
use App\Models\SchoolBoard;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SchoolAssessmentController extends Controller
{
    private const GRADE_FILTER_MAP = [
        'kindergarten' => 'Kindergarten',
        'garden' => 'Kindergarten',
        'grade1' => 'Grade 1',
        'grade2' => 'Grade 2',
        'grade3' => 'Grade 3',
        'grade3plus' => 'Grade 3+',
    ];

    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($user->role !== 'school_admin' || ! $user->school_id) {
            abort(403, 'School portal access required.');
        }

        /** @var School $school */
        $school = School::query()->findOrFail($user->school_id);
        $boardCode = trim((string) ($school->school_board ?? ''));

        if ($boardCode !== '') {
            $assessments = $this->boardSyncedQuery($boardCode, $request)
                ->get()
                ->map(fn (Assessment $a) => $this->format($a, $boardCode));
            $syncSource = 'board';
        } else {
            $assessments = $this->platformQuery($request)
                ->get()
                ->map(fn (Assessment $a) => $this->format($a, null));
            $syncSource = 'platform';
        }

        return response()->json([
            'sync_source' => $syncSource,
            'school_board' => $this->formatSchoolBoard($boardCode !== '' ? $boardCode : null),
            'assessments' => $assessments->values()->all(),
            'summary' => [
                'total' => $assessments->count(),
                'published' => $assessments->count(),
                'drafts' => 0,
            ],
        ]);
    }

    public function show(Request $request, Assessment $assessment): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($user->role !== 'school_admin' || ! $user->school_id) {
            abort(403, 'School portal access required.');
        }

        /** @var School $school */
        $school = School::query()->findOrFail($user->school_id);
        $boardCode = trim((string) ($school->school_board ?? ''));

        $this->authorizeSchoolAccess($assessment, $boardCode);

        $assessment->load('questions');

        return response()->json([
            'assessment' => $this->formatDetail($assessment, $boardCode !== '' ? $boardCode : null),
        ]);
    }

    private function boardSyncedQuery(string $boardCode, Request $request)
    {
        $archivedIds = BoardAssessmentArchive::query()
            ->where('school_board', $boardCode)
            ->pluck('assessment_id');

        $activeCopySourceIds = Assessment::query()
            ->where('school_board', $boardCode)
            ->whereNotIn('id', $archivedIds)
            ->whereNotNull('source_assessment_id')
            ->where('status', 'published')
            ->pluck('source_assessment_id');

        $query = Assessment::query()
            ->withCount('questions')
            ->where('status', 'published')
            ->where(function ($query) use ($boardCode, $archivedIds, $activeCopySourceIds) {
                $query->where(function ($q) use ($boardCode, $archivedIds) {
                    $q->where('school_board', $boardCode)
                        ->whereNotIn('id', $archivedIds);
                })->orWhere(function ($q) use ($archivedIds, $activeCopySourceIds) {
                    $q->whereNull('school_board')
                        ->whereNull('archived_at')
                        ->whereNotIn('id', $archivedIds)
                        ->when($activeCopySourceIds->isNotEmpty(), function ($inner) use ($activeCopySourceIds) {
                            $inner->whereNotIn('id', $activeCopySourceIds);
                        });
                });
            })
            ->orderByDesc('created_at');

        $this->applyListFilters($query, $request);

        return $query;
    }

    private function platformQuery(Request $request)
    {
        $query = Assessment::query()
            ->withCount('questions')
            ->whereNull('school_board')
            ->whereNull('archived_at')
            ->where('status', 'published')
            ->orderByDesc('created_at');

        $this->applyListFilters($query, $request);

        return $query;
    }

    private function authorizeSchoolAccess(Assessment $assessment, string $boardCode): void
    {
        if (strtolower($assessment->status) !== 'published') {
            abort(404, 'Assessment not found.');
        }

        if ($boardCode !== '') {
            if ($assessment->school_board !== null && $assessment->school_board !== $boardCode) {
                abort(403, 'This assessment belongs to another school board.');
            }

            if ($assessment->isPlatformOriginal()) {
                if ($assessment->archived_at !== null) {
                    abort(404, 'Assessment not found.');
                }

                $isBoardArchived = BoardAssessmentArchive::query()
                    ->where('school_board', $boardCode)
                    ->where('assessment_id', $assessment->id)
                    ->exists();

                if ($isBoardArchived) {
                    abort(404, 'Assessment not found.');
                }

                $hasActiveBoardCopy = Assessment::query()
                    ->where('school_board', $boardCode)
                    ->where('source_assessment_id', $assessment->id)
                    ->where('status', 'published')
                    ->whereNotIn('id', BoardAssessmentArchive::query()
                        ->where('school_board', $boardCode)
                        ->pluck('assessment_id'))
                    ->exists();

                if ($hasActiveBoardCopy) {
                    abort(404, 'Assessment not found.');
                }
            } else {
                $isBoardArchived = BoardAssessmentArchive::query()
                    ->where('school_board', $boardCode)
                    ->where('assessment_id', $assessment->id)
                    ->exists();

                if ($isBoardArchived) {
                    abort(404, 'Assessment not found.');
                }
            }

            return;
        }

        if (! $assessment->isPlatformOriginal() || $assessment->archived_at !== null) {
            abort(404, 'Assessment not found.');
        }
    }

    private function applyListFilters($query, Request $request): void
    {
        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhereRaw('CAST(atelier AS CHAR) LIKE ?', ["%{$search}%"])
                    ->orWhere('unit', 'like', "%{$search}%");
            });
        }

        $gradeFilter = $request->string('grade')->toString();
        if ($gradeFilter !== '' && $gradeFilter !== 'all') {
            $dbGrade = self::GRADE_FILTER_MAP[$gradeFilter] ?? null;
            if ($dbGrade) {
                $query->where('grade', $dbGrade);
            } else {
                $query->whereRaw('0 = 1');
            }
        }
    }

    /** @return array<string, mixed> */
    private function formatDetail(Assessment $assessment, ?string $boardCode): array
    {
        return [
            ...$this->format($assessment, $boardCode),
            'template_draft' => $assessment->template_draft,
            'questions' => $assessment->questions->map(fn ($q) => [
                'id' => $q->id,
                'text' => $q->text,
                'options' => $q->options,
                'correct' => $q->correct_index,
            ])->values()->all(),
        ];
    }

    /** @return array<string, mixed> */
    private function format(Assessment $assessment, ?string $boardCode): array
    {
        $questionCount = (int) ($assessment->questions_count ?? $assessment->questions()->count());
        $status = strtolower($assessment->status);
        $isBoardCopy = $boardCode !== null && $assessment->school_board === $boardCode;
        $usesTemplate = ! empty($assessment->template_id);

        return [
            'id' => $assessment->id,
            'title' => $assessment->title,
            'unit' => $assessment->unit ?? '',
            'atelier' => $assessment->atelier,
            'grade' => $assessment->grade,
            'status' => $status,
            'question_count' => $usesTemplate ? 0 : $questionCount,
            'template_id' => $assessment->template_id,
            'assigned_to' => $this->assignedTo($status, $questionCount, $isBoardCopy, $usesTemplate),
            'ownership' => $isBoardCopy ? 'board_copy' : 'platform',
            'source_assessment_id' => $assessment->source_assessment_id,
            'created' => $assessment->created_at?->toDateString() ?? '',
        ];
    }

    private function assignedTo(string $status, int $questionCount, bool $isBoardCopy, bool $usesTemplate = false): string
    {
        if ($isBoardCopy) {
            return 'board_only';
        }

        if ($status === 'published') {
            return 'all_schools';
        }

        if ($usesTemplate || $questionCount > 0) {
            return 'selected';
        }

        return 'not_assigned';
    }

    /** @return array{code: string, name: string}|null */
    private function formatSchoolBoard(?string $boardCode): ?array
    {
        if (! $boardCode) {
            return null;
        }

        $board = SchoolBoard::query()->where('code', $boardCode)->first();

        return [
            'code' => $boardCode,
            'name' => $board?->name ?? $boardCode,
        ];
    }
}
