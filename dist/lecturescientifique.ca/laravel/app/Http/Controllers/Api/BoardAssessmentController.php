<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Assessment;
use App\Models\BoardAssessmentArchive;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class BoardAssessmentController extends Controller
{
    private const GRADES = ['Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3'];

    private const GRADE_FILTER_MAP = [
        'kindergarten' => 'Kindergarten',
        'grade1' => 'Grade 1',
        'grade2' => 'Grade 2',
        'grade3' => 'Grade 3',
    ];

    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($user->role !== 'board_admin' || ! $user->school_board) {
            abort(403, 'School board portal access required.');
        }

        $boardCode = $user->school_board;
        $archivedIds = BoardAssessmentArchive::query()
            ->where('school_board', $boardCode)
            ->pluck('assessment_id');

        $activeQuery = Assessment::query()
            ->withCount('questions')
            ->where('title', 'like', 'Atelier %')
            ->where(function ($query) use ($boardCode, $archivedIds) {
                $query->where(function ($q) use ($boardCode, $archivedIds) {
                    $q->where('school_board', $boardCode)
                        ->whereNotIn('id', $archivedIds);
                })->orWhere(function ($q) use ($archivedIds) {
                    $q->whereNull('school_board')
                        ->whereNotIn('id', $archivedIds);
                });
            })
            ->orderByDesc('created_at');

        $archivedQuery = Assessment::query()
            ->withCount('questions')
            ->where('title', 'like', 'Atelier %')
            ->whereIn('id', $archivedIds)
            ->where(function ($query) use ($boardCode) {
                $query->where('school_board', $boardCode)
                    ->orWhereNull('school_board');
            })
            ->orderByDesc('created_at');

        $this->applyListFilters($activeQuery, $request);
        $this->applyListFilters($archivedQuery, $request);

        $active = $activeQuery->get()->map(fn (Assessment $a) => $this->format($a, $boardCode));
        $archived = $archivedQuery->get()->map(fn (Assessment $a) => $this->format($a, $boardCode, true));

        $published = $active->where('status', 'published')->count();
        $drafts = $active->where('status', 'draft')->count();

        return response()->json([
            'assessments' => $active->values()->all(),
            'archived' => $archived->values()->all(),
            'summary' => [
                'total' => $active->count(),
                'published' => $published,
                'drafts' => $drafts,
                'archived' => $archived->count(),
            ],
        ]);
    }

    public function show(Request $request, Assessment $assessment): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($user->role !== 'board_admin' || ! $user->school_board) {
            abort(403, 'School board portal access required.');
        }

        $this->authorizeBoardAccess($assessment, $user->school_board);

        $assessment->load('questions');

        $isArchived = BoardAssessmentArchive::query()
            ->where('school_board', $user->school_board)
            ->where('assessment_id', $assessment->id)
            ->exists();

        return response()->json([
            'assessment' => $this->formatDetail($assessment, $user->school_board, $isArchived),
        ]);
    }

    public function update(Request $request, Assessment $assessment): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($user->role !== 'board_admin' || ! $user->school_board) {
            abort(403, 'School board portal access required.');
        }

        $this->authorizeBoardAccess($assessment, $user->school_board);

        $data = $this->validateAssessment($request);
        $boardCode = $user->school_board;

        $target = DB::transaction(function () use ($assessment, $data, $boardCode) {
            if ($assessment->school_board === $boardCode) {
                $this->applyAssessmentData($assessment, $data);
                $this->setActiveAssessment($assessment, $boardCode);
                $assessment->load('questions');

                return ['assessment' => $assessment, 'created_copy' => false];
            }

            $copy = Assessment::query()
                ->where('school_board', $boardCode)
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
                    'school_board' => $boardCode,
                    'source_assessment_id' => $assessment->id,
                ]);
                $this->syncQuestions($copy, $data['questions']);
                $createdCopy = true;
            } else {
                $this->applyAssessmentData($copy, $data);
            }

            $copy->load('questions');
            $this->setActiveAssessment($copy, $boardCode);

            return ['assessment' => $copy, 'created_copy' => $createdCopy];
        });

        return response()->json([
            'assessment' => $this->formatDetail($target['assessment'], $boardCode),
            'created_copy' => $target['created_copy'],
        ]);
    }

    public function activate(Request $request, Assessment $assessment): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($user->role !== 'board_admin' || ! $user->school_board) {
            abort(403, 'School board portal access required.');
        }

        $this->authorizeBoardAccess($assessment, $user->school_board);

        $boardCode = $user->school_board;

        DB::transaction(function () use ($assessment, $boardCode) {
            $this->setActiveAssessment($assessment, $boardCode);
        });

        $assessment->loadCount('questions');

        return response()->json([
            'assessment' => $this->format($assessment, $boardCode),
        ]);
    }

    private function setActiveAssessment(Assessment $assessment, string $boardCode): void
    {
        BoardAssessmentArchive::query()
            ->where('school_board', $boardCode)
            ->where('assessment_id', $assessment->id)
            ->delete();

        $paired = $this->findPairedAssessment($assessment, $boardCode);

        if ($paired) {
            BoardAssessmentArchive::query()->firstOrCreate([
                'school_board' => $boardCode,
                'assessment_id' => $paired->id,
            ]);
        }
    }

    private function findPairedAssessment(Assessment $assessment, string $boardCode): ?Assessment
    {
        if ($assessment->school_board === $boardCode && $assessment->source_assessment_id) {
            return Assessment::query()->find($assessment->source_assessment_id);
        }

        if ($assessment->isPlatformOriginal()) {
            return Assessment::query()
                ->where('school_board', $boardCode)
                ->where('source_assessment_id', $assessment->id)
                ->first();
        }

        return null;
    }

    private function authorizeBoardAccess(Assessment $assessment, string $boardCode): void
    {
        if ($assessment->school_board === null) {
            return;
        }

        if ($assessment->school_board !== $boardCode) {
            abort(403, 'This assessment belongs to another school board.');
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

        $statusFilter = $request->string('status')->toString();
        if ($statusFilter !== '' && $statusFilter !== 'all') {
            $query->where('status', strtolower($statusFilter));
        }
    }

    /** @param array<string, mixed> $data */
    private function applyAssessmentData(Assessment $assessment, array $data): void
    {
        $assessment->update([
            'title' => $data['title'],
            'unit' => $data['unit'] ?? null,
            'atelier' => $data['atelier'],
            'grade' => $data['grade'],
            'status' => strtolower($data['status']),
        ]);

        $this->syncQuestions($assessment, $data['questions']);
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
            'questions' => ['present', 'array'],
            'questions.*.text' => ['required', 'string', 'max:1000'],
            'questions.*.options' => ['required', 'array', 'size:4'],
            'questions.*.options.*' => ['required', 'string', 'max:500'],
            'questions.*.correct' => ['required', 'integer', 'min:0', 'max:3'],
        ]);

        $atelier = (int) $data['atelier'];
        if (! preg_match('/^Atelier\s+\d+/i', $data['title'])) {
            $data['title'] = "Atelier {$atelier} Assessment";
        }

        $data['status'] = ucfirst(strtolower($data['status']));

        if ($data['status'] === 'Published' && count($data['questions']) === 0) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'questions' => ['Add at least one question before publishing.'],
            ]);
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
    private function formatDetail(Assessment $assessment, string $boardCode, bool $archived = false): array
    {
        return [
            ...$this->format($assessment, $boardCode, $archived),
            'questions' => $assessment->questions->map(fn ($q) => [
                'id' => $q->id,
                'text' => $q->text,
                'options' => $q->options,
                'correct' => $q->correct_index,
            ])->values()->all(),
        ];
    }

    /** @return array<string, mixed> */
    private function format(Assessment $assessment, string $boardCode, bool $archived = false): array
    {
        $questionCount = (int) ($assessment->questions_count ?? $assessment->questions()->count());
        $status = strtolower($assessment->status);
        $isBoardCopy = $assessment->school_board === $boardCode;

        return [
            'id' => $assessment->id,
            'title' => $assessment->title,
            'unit' => $assessment->unit ?? '',
            'atelier' => $assessment->atelier,
            'grade' => $assessment->grade,
            'status' => $status,
            'question_count' => $questionCount,
            'assigned_to' => $this->assignedTo($status, $questionCount, $isBoardCopy),
            'ownership' => $isBoardCopy ? 'board_copy' : 'platform',
            'source_assessment_id' => $assessment->source_assessment_id,
            'archived' => $archived,
            'created' => $assessment->created_at?->toDateString() ?? '',
        ];
    }

    private function assignedTo(string $status, int $questionCount, bool $isBoardCopy): string
    {
        if ($isBoardCopy) {
            return 'board_only';
        }

        if ($status === 'published') {
            return 'all_schools';
        }

        if ($questionCount > 0) {
            return 'selected';
        }

        return 'not_assigned';
    }
}
