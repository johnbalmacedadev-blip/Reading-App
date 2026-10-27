<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Assessment;
use App\Models\BoardAssessmentArchive;
use App\Models\School;
use App\Models\SchoolAssessmentArchive;
use App\Models\SchoolBoard;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class SchoolAssessmentController extends Controller
{
    private const GRADES = ['All', 'Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 3+'];

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
        $context = $this->resolveSchoolContext($request);

        if ($context['board_code']) {
            $assessments = $this->boardSyncedQuery($context['board_code'], $request)
                ->get()
                ->map(fn (Assessment $a) => $this->format($a, $context['board_code']));

            return response()->json([
                'sync_source' => 'board',
                'can_edit' => false,
                'school_board' => $this->formatSchoolBoard($context['board_code']),
                'assessments' => $assessments->values()->all(),
                'archived' => [],
                'summary' => [
                    'total' => $assessments->count(),
                    'published' => $assessments->count(),
                    'drafts' => 0,
                    'archived' => 0,
                ],
            ]);
        }

        $schoolId = $context['school_id'];
        $archivedIds = SchoolAssessmentArchive::query()
            ->where('school_id', $schoolId)
            ->pluck('assessment_id');

        $activeCopySourceIds = Assessment::query()
            ->where('school_id', $schoolId)
            ->whereNotIn('id', $archivedIds)
            ->whereNotNull('source_assessment_id')
            ->pluck('source_assessment_id');

        $activeQuery = Assessment::query()
            ->withCount('questions')
            ->where(function ($query) use ($schoolId, $archivedIds, $activeCopySourceIds) {
                $query->where(function ($q) use ($schoolId, $archivedIds) {
                    $q->where('school_id', $schoolId)
                        ->whereNotIn('id', $archivedIds);
                })->orWhere(function ($q) use ($archivedIds, $activeCopySourceIds) {
                    $q->whereNull('school_board')
                        ->whereNull('school_id')
                        ->whereNull('teacher_id')
                        ->whereNull('archived_at')
                        ->where('status', 'published')
                        ->whereNotIn('id', $archivedIds)
                        ->when($activeCopySourceIds->isNotEmpty(), function ($inner) use ($activeCopySourceIds) {
                            $inner->whereNotIn('id', $activeCopySourceIds);
                        });
                });
            })
            ->orderByDesc('created_at');

        $archivedQuery = Assessment::query()
            ->withCount('questions')
            ->whereIn('id', $archivedIds)
            ->where(function ($query) use ($schoolId) {
                $query->where('school_id', $schoolId)
                    ->orWhere(function ($q) {
                        $q->whereNull('school_board')
                            ->whereNull('school_id')
                            ->whereNull('teacher_id')
                            ->whereNull('archived_at')
                            ->where('status', 'published');
                    });
            })
            ->orderByDesc('created_at');

        $this->applyListFilters($activeQuery, $request, true);
        $this->applyListFilters($archivedQuery, $request, true);

        $active = $activeQuery->get()->map(fn (Assessment $a) => $this->format($a, null, false, $schoolId));
        $archived = $archivedQuery->get()->map(fn (Assessment $a) => $this->format($a, null, true, $schoolId));

        return response()->json([
            'sync_source' => 'platform',
            'can_edit' => true,
            'school_board' => null,
            'assessments' => $active->values()->all(),
            'archived' => $archived->values()->all(),
            'summary' => [
                'total' => $active->count(),
                'published' => $active->where('status', 'published')->count(),
                'drafts' => $active->where('status', 'draft')->count(),
                'archived' => $archived->count(),
            ],
        ]);
    }

    public function show(Request $request, Assessment $assessment): JsonResponse
    {
        $context = $this->resolveSchoolContext($request);
        $this->authorizeSchoolAccess($assessment, $context);

        $assessment->load('questions');

        $isArchived = false;
        if ($context['board_code']) {
            $isArchived = BoardAssessmentArchive::query()
                ->where('school_board', $context['board_code'])
                ->where('assessment_id', $assessment->id)
                ->exists();
        } else {
            $isArchived = SchoolAssessmentArchive::query()
                ->where('school_id', $context['school_id'])
                ->where('assessment_id', $assessment->id)
                ->exists();
        }

        return response()->json([
            'assessment' => $this->formatDetail(
                $assessment,
                $context['board_code'],
                $isArchived,
                $context['school_id']
            ),
        ]);
    }

    public function update(Request $request, Assessment $assessment): JsonResponse
    {
        $context = $this->resolveSchoolContext($request);

        if ($context['board_code']) {
            abort(403, 'Assessments are view-only when your school is linked to a school board.');
        }

        $this->authorizeSchoolAccess($assessment, $context);
        $this->authorizePlatformAssessmentVisible($assessment);

        $data = $this->validateAssessment($request);
        $schoolId = $context['school_id'];

        $target = DB::transaction(function () use ($assessment, $data, $schoolId) {
            if ($assessment->school_id === $schoolId) {
                $this->applyAssessmentData($assessment, $data);
                $this->setActiveAssessment($assessment, $schoolId);
                $assessment->load('questions');

                return ['assessment' => $assessment, 'created_copy' => false];
            }

            $copy = Assessment::query()
                ->where('school_id', $schoolId)
                ->where('source_assessment_id', $assessment->id)
                ->first();

            $createdCopy = false;

            if (! $copy) {
                $copy = Assessment::create([
                    'title' => $data['title'],
                    'unit' => $data['unit'] ?? null,
                    'atelier' => $data['atelier'],
                    'grade' => $data['grade'],
                    'status' => strtolower($data['status']),
                    'school_id' => $schoolId,
                    'source_assessment_id' => $assessment->id,
                    'template_id' => $data['template_id'] ?? null,
                    'template_draft' => $data['template_draft'] ?? null,
                ]);
                if (empty($data['template_id'])) {
                    $this->syncQuestions($copy, $data['questions']);
                }
                $createdCopy = true;
            } else {
                $this->applyAssessmentData($copy, $data);
            }

            $copy->load('questions');
            $this->setActiveAssessment($copy, $schoolId);

            return ['assessment' => $copy, 'created_copy' => $createdCopy];
        });

        AuditLogger::log('Edit', 'Assessment', "{$target['assessment']->title} updated", 'info', $request, subject: $target['assessment']);

        return response()->json([
            'assessment' => $this->formatDetail($target['assessment'], null, false, $schoolId),
            'created_copy' => $target['created_copy'],
        ]);
    }

    public function activate(Request $request, Assessment $assessment): JsonResponse
    {
        $context = $this->resolveSchoolContext($request);

        if ($context['board_code']) {
            abort(403, 'Assessments are view-only when your school is linked to a school board.');
        }

        $this->authorizeSchoolAccess($assessment, $context);
        $schoolId = $context['school_id'];

        DB::transaction(function () use ($assessment, $schoolId) {
            $this->setActiveAssessment($assessment, $schoolId);
        });

        $assessment->loadCount('questions');

        AuditLogger::log('Activate', 'Assessment', "{$assessment->title} activated", 'info', $request, subject: $assessment);

        return response()->json([
            'assessment' => $this->format($assessment, null, false, $schoolId),
        ]);
    }

    /** @return array{school: School, school_id: int, board_code: string|null} */
    private function resolveSchoolContext(Request $request): array
    {
        /** @var User $user */
        $user = $request->user();

        if ($user->role !== 'school_admin' || ! $user->school_id) {
            abort(403, 'School portal access required.');
        }

        /** @var School $school */
        $school = School::query()->findOrFail($user->school_id);
        $boardCode = trim((string) ($school->school_board ?? ''));

        return [
            'school' => $school,
            'school_id' => (int) $school->id,
            'board_code' => $boardCode !== '' ? $boardCode : null,
        ];
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
                        ->whereNull('school_id')
                        ->whereNull('teacher_id')
                        ->whereNull('archived_at')
                        ->whereNotIn('id', $archivedIds)
                        ->when($activeCopySourceIds->isNotEmpty(), function ($inner) use ($activeCopySourceIds) {
                            $inner->whereNotIn('id', $activeCopySourceIds);
                        });
                });
            })
            ->orderByDesc('created_at');

        $this->applyListFilters($query, $request, false);

        return $query;
    }

    /** @param array{school_id: int, board_code: string|null} $context */
    private function authorizeSchoolAccess(Assessment $assessment, array $context): void
    {
        if ($context['board_code']) {
            $this->authorizeBoardViewAccess($assessment, $context['board_code']);

            return;
        }

        $schoolId = $context['school_id'];

        if ($assessment->school_id !== null && $assessment->school_id !== $schoolId) {
            abort(403, 'This assessment belongs to another school.');
        }

        if ($assessment->school_board !== null) {
            abort(403, 'This assessment belongs to a school board.');
        }

        if ($assessment->isPlatformOriginal()) {
            if ($assessment->archived_at !== null) {
                abort(404, 'Assessment not found.');
            }

            $isSchoolArchived = SchoolAssessmentArchive::query()
                ->where('school_id', $schoolId)
                ->where('assessment_id', $assessment->id)
                ->exists();

            if ($isSchoolArchived) {
                abort(404, 'Assessment not found.');
            }

            $hasActiveSchoolCopy = Assessment::query()
                ->where('school_id', $schoolId)
                ->where('source_assessment_id', $assessment->id)
                ->whereNotIn('id', SchoolAssessmentArchive::query()
                    ->where('school_id', $schoolId)
                    ->pluck('assessment_id'))
                ->exists();

            if ($hasActiveSchoolCopy) {
                abort(404, 'Assessment not found.');
            }

            return;
        }

        $isSchoolArchived = SchoolAssessmentArchive::query()
            ->where('school_id', $schoolId)
            ->where('assessment_id', $assessment->id)
            ->exists();

        if ($isSchoolArchived) {
            abort(404, 'Assessment not found.');
        }
    }

    private function authorizeBoardViewAccess(Assessment $assessment, string $boardCode): void
    {
        if (strtolower($assessment->status) !== 'published') {
            abort(404, 'Assessment not found.');
        }

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
    }

    private function authorizePlatformAssessmentVisible(Assessment $assessment): void
    {
        if (! $assessment->isPlatformOriginal()) {
            return;
        }

        if ($assessment->archived_at !== null || strtolower($assessment->status) !== 'published') {
            abort(404, 'Assessment not found.');
        }
    }

    private function setActiveAssessment(Assessment $assessment, int $schoolId): void
    {
        SchoolAssessmentArchive::query()
            ->where('school_id', $schoolId)
            ->where('assessment_id', $assessment->id)
            ->delete();

        $paired = $this->findPairedAssessment($assessment, $schoolId);

        if ($paired) {
            SchoolAssessmentArchive::query()->firstOrCreate([
                'school_id' => $schoolId,
                'assessment_id' => $paired->id,
            ]);
        }
    }

    private function findPairedAssessment(Assessment $assessment, int $schoolId): ?Assessment
    {
        if ($assessment->school_id === $schoolId && $assessment->source_assessment_id) {
            return Assessment::query()->find($assessment->source_assessment_id);
        }

        if ($assessment->isPlatformOriginal()) {
            return Assessment::query()
                ->where('school_id', $schoolId)
                ->where('source_assessment_id', $assessment->id)
                ->first();
        }

        return null;
    }

    private function applyListFilters($query, Request $request, bool $includeStatus): void
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

        if ($includeStatus) {
            $statusFilter = $request->string('status')->toString();
            if ($statusFilter !== '' && $statusFilter !== 'all') {
                $query->where('status', strtolower($statusFilter));
            }
        }
    }

    /** @param array<string, mixed> $data */
    private function applyAssessmentData(Assessment $assessment, array $data): void
    {
        $usesTemplate = ! empty($data['template_id']);

        $assessment->update([
            'title' => $data['title'],
            'unit' => $data['unit'] ?? null,
            'atelier' => $data['atelier'],
            'grade' => $data['grade'],
            'status' => strtolower($data['status']),
            'template_id' => $usesTemplate ? $data['template_id'] : null,
            'template_draft' => $usesTemplate ? ($data['template_draft'] ?? null) : null,
        ]);

        if ($usesTemplate) {
            $assessment->questions()->delete();
        } else {
            $this->syncQuestions($assessment, $data['questions']);
        }
    }

    /** @return array<string, mixed> */
    private function validateAssessment(Request $request): array
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'unit' => ['nullable', 'string', 'max:50'],
            'atelier' => ['required', 'integer', 'min:1', 'max:15'],
            'grade' => ['required', 'string', Rule::in(self::GRADES)],
            'status' => ['required', 'string', Rule::in(['Published', 'Draft', 'published', 'draft'])],
            'template_id' => ['nullable', 'string', 'max:50'],
            'template_draft' => ['nullable', 'array'],
            'questions' => ['present', 'array'],
            'questions.*.text' => ['required_with:questions', 'string', 'max:1000'],
            'questions.*.options' => ['required_with:questions', 'array', 'size:4'],
            'questions.*.options.*' => ['required_with:questions', 'string', 'max:500'],
            'questions.*.correct' => ['required_with:questions', 'integer', 'min:0', 'max:3'],
        ]);

        $usesTemplate = ! empty($data['template_id']);

        if (! $usesTemplate) {
            foreach ($data['questions'] as $index => $question) {
                if (empty($question['text']) || empty($question['options']) || ! isset($question['correct'])) {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        "questions.{$index}" => ['Each question must include text, four options, and a correct answer.'],
                    ]);
                }
            }
        } else {
            $data['questions'] = [];
        }

        $atelier = (int) $data['atelier'];
        if (! $usesTemplate && ! preg_match('/^Atelier\s+\d+/i', $data['title'])) {
            $data['title'] = "Atelier {$atelier} Assessment";
        }

        $data['status'] = ucfirst(strtolower($data['status']));

        if ($data['status'] === 'Published') {
            if ($usesTemplate && empty($data['template_draft'])) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'template_draft' => ['Template content is required before publishing.'],
                ]);
            }

            if (! $usesTemplate && count($data['questions']) === 0) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'questions' => ['Add at least one question before publishing.'],
                ]);
            }
        }

        return $data;
    }

    /** @param list<array{text: string, options: list<string>, correct: int}> $questions */
    private function syncQuestions(Assessment $assessment, array $questions): void
    {
        $assessment->questions()->delete();

        foreach ($questions as $index => $question) {
            $assessment->questions()->create([
                'sort_order' => $index,
                'text' => $question['text'],
                'options' => $question['options'],
                'correct_index' => $question['correct'],
            ]);
        }
    }

    /** @return array<string, mixed> */
    private function formatDetail(
        Assessment $assessment,
        ?string $boardCode,
        bool $archived = false,
        ?int $schoolId = null
    ): array {
        return [
            ...$this->format($assessment, $boardCode, $archived, $schoolId),
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
    private function format(
        Assessment $assessment,
        ?string $boardCode,
        bool $archived = false,
        ?int $schoolId = null
    ): array {
        $questionCount = (int) ($assessment->questions_count ?? $assessment->questions()->count());
        $status = strtolower($assessment->status);
        $isBoardCopy = $boardCode !== null && $assessment->school_board === $boardCode;
        $isSchoolCopy = $schoolId !== null && $assessment->school_id === $schoolId;
        $usesTemplate = ! empty($assessment->template_id);

        $ownership = 'platform';
        if ($isBoardCopy) {
            $ownership = 'board_copy';
        } elseif ($isSchoolCopy) {
            $ownership = 'school_copy';
        }

        return [
            'id' => $assessment->id,
            'title' => $assessment->title,
            'unit' => $assessment->unit ?? '',
            'atelier' => $assessment->atelier,
            'grade' => $assessment->grade,
            'status' => $status,
            'question_count' => $usesTemplate ? 0 : $questionCount,
            'template_id' => $assessment->template_id,
            'assigned_to' => $this->assignedTo($status, $questionCount, $isBoardCopy, $isSchoolCopy, $usesTemplate),
            'ownership' => $ownership,
            'source_assessment_id' => $assessment->source_assessment_id,
            'archived' => $archived,
            'created' => $assessment->created_at?->toDateString() ?? '',
        ];
    }

    private function assignedTo(
        string $status,
        int $questionCount,
        bool $isBoardCopy,
        bool $isSchoolCopy,
        bool $usesTemplate = false
    ): string {
        if ($isBoardCopy) {
            return 'board_only';
        }

        if ($isSchoolCopy) {
            return 'school_only';
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
