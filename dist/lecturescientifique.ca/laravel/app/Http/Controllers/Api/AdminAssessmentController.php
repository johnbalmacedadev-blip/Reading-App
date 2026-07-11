<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Assessment;
use App\Models\StudentEvaluation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AdminAssessmentController extends Controller
{
    private const GRADES = ['Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 3+'];

    /** @var array<string, list<string>> */
    private const CLASS_GRADE_ALIASES = [
        'Kindergarten' => ['Kindergarten', 'Maternelle', 'Jardin'],
        'Grade 1' => ['Grade 1', '1re année'],
        'Grade 2' => ['Grade 2', '2e année'],
        'Grade 3' => ['Grade 3', '3e année'],
        'Grade 3+' => ['Grade 3+', '4e année', '5e année', '6e année', 'Grade 4', 'Grade 5', 'Grade 6'],
    ];

    public function index(Request $request): JsonResponse
    {
        $query = Assessment::query()
            ->with('questions')
            ->whereNull('school_board')
            ->orderByDesc('created_at');

        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhereRaw('CAST(atelier AS CHAR) LIKE ?', ["%{$search}%"])
                    ->orWhere('template_id', 'like', "%{$search}%");
            });
        }

        if ($request->filled('grade') && $request->string('grade')->toString() !== 'All Grades') {
            $query->where('grade', $request->string('grade')->toString());
        }

        if ($request->filled('status') && $request->string('status')->toString() !== 'All') {
            $query->where('status', strtolower($request->string('status')->toString()));
        }

        $all = $query->get();
        $active = $all->whereNull('archived_at')->values();
        $archived = $all->whereNotNull('archived_at')->values();

        return response()->json([
            'assessments' => $active->map(fn (Assessment $a) => $this->format($a))->all(),
            'archived' => $archived->map(fn (Assessment $a) => $this->format($a))->all(),
            'summary' => [
                'published' => $active->where('status', 'published')->count(),
                'drafts' => $active->where('status', 'draft')->count(),
                'archived' => $archived->count(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validateAssessment($request);

        $assessment = DB::transaction(function () use ($data) {
            $assessment = Assessment::create([
                'title' => $data['title'],
                'unit' => $data['unit'] ?? null,
                'atelier' => $data['atelier'],
                'grade' => $data['grade'],
                'status' => strtolower($data['status']),
                'template_id' => $data['template_id'] ?? null,
                'template_draft' => $data['template_draft'] ?? null,
            ]);

            $this->syncQuestions($assessment, $data['questions']);

            return $assessment->load('questions');
        });

        return response()->json(['assessment' => $this->format($assessment)], 201);
    }

    public function update(Request $request, Assessment $assessment): JsonResponse
    {
        $data = $this->validateAssessment($request);

        DB::transaction(function () use ($assessment, $data) {
            $assessment->update([
                'title' => $data['title'],
                'unit' => $data['unit'] ?? null,
                'atelier' => $data['atelier'],
                'grade' => $data['grade'],
                'status' => strtolower($data['status']),
                'template_id' => $data['template_id'] ?? null,
                'template_draft' => $data['template_draft'] ?? null,
            ]);

            $this->syncQuestions($assessment, $data['questions']);
        });

        return response()->json(['assessment' => $this->format($assessment->fresh('questions'))]);
    }

    public function destroy(Assessment $assessment): JsonResponse
    {
        if ($this->hasStudentCompletions($assessment)) {
            return response()->json([
                'message' => 'This workshop has student evaluation records and cannot be deleted. Archive it instead.',
                'can_archive' => true,
            ], 422);
        }

        $assessment->delete();

        return response()->json(['message' => 'Assessment deleted.']);
    }

    public function archive(Assessment $assessment): JsonResponse
    {
        if ($assessment->school_board !== null) {
            abort(403);
        }

        if ($assessment->archived_at !== null) {
            return response()->json(['assessment' => $this->format($assessment)]);
        }

        $assessment->update(['archived_at' => now()]);

        return response()->json([
            'assessment' => $this->format($assessment->fresh('questions')),
            'message' => 'Assessment archived.',
        ]);
    }

    public function restore(Assessment $assessment): JsonResponse
    {
        if ($assessment->school_board !== null) {
            abort(403);
        }

        $assessment->update(['archived_at' => null]);

        return response()->json([
            'assessment' => $this->format($assessment->fresh('questions')),
            'message' => 'Assessment restored.',
        ]);
    }

    public function duplicate(Assessment $assessment): JsonResponse
    {
        $copy = DB::transaction(function () use ($assessment) {
            $assessment->load('questions');

            $copy = Assessment::create([
                'title' => "{$assessment->title} (copy)",
                'unit' => $assessment->unit,
                'atelier' => $assessment->atelier,
                'grade' => $assessment->grade,
                'status' => 'draft',
                'template_id' => $assessment->template_id,
                'template_draft' => $assessment->template_draft,
            ]);

            foreach ($assessment->questions as $question) {
                $copy->questions()->create([
                    'sort_order' => $question->sort_order,
                    'text' => $question->text,
                    'options' => $question->options,
                    'correct_index' => $question->correct_index,
                ]);
            }

            return $copy->load('questions');
        });

        return response()->json(['assessment' => $this->format($copy)], 201);
    }

    private function hasStudentCompletions(Assessment $assessment): bool
    {
        $classGrades = self::CLASS_GRADE_ALIASES[$assessment->grade] ?? [$assessment->grade];

        return StudentEvaluation::query()
            ->join('classes', 'classes.id', '=', 'student_evaluations.class_id')
            ->where('student_evaluations.atelier_number', $assessment->atelier)
            ->whereIn('classes.grade', $classGrades)
            ->whereNotNull('student_evaluations.responses')
            ->whereRaw('JSON_LENGTH(student_evaluations.responses) > 0')
            ->exists();
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
    private function format(Assessment $assessment): array
    {
        return [
            'id' => $assessment->id,
            'title' => $assessment->title,
            'unit' => $assessment->unit ?? '',
            'atelier' => $assessment->atelier,
            'grade' => $assessment->grade,
            'status' => ucfirst($assessment->status),
            'created' => $assessment->created_at?->toDateString() ?? '',
            'template_id' => $assessment->template_id,
            'template_draft' => $assessment->template_draft,
            'archived_at' => $assessment->archived_at?->toIso8601String(),
            'is_archived' => $assessment->archived_at !== null,
            'has_student_completions' => $this->hasStudentCompletions($assessment),
            'questions' => $assessment->questions->map(fn ($q) => [
                'id' => $q->id,
                'text' => $q->text,
                'options' => $q->options,
                'correct' => $q->correct_index,
            ])->values()->all(),
        ];
    }
}
