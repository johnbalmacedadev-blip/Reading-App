<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Assessment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AdminAssessmentController extends Controller
{
    private const GRADES = ['Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3'];

    public function index(Request $request): JsonResponse
    {
        $query = Assessment::query()
            ->with('questions')
            ->whereNull('school_board')
            ->where('title', 'like', 'Atelier %')
            ->orderByDesc('created_at');

        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhereRaw('CAST(atelier AS CHAR) LIKE ?', ["%{$search}%"]);
            });
        }

        if ($request->filled('grade') && $request->string('grade')->toString() !== 'All Grades') {
            $query->where('grade', $request->string('grade')->toString());
        }

        if ($request->filled('status') && $request->string('status')->toString() !== 'All') {
            $query->where('status', strtolower($request->string('status')->toString()));
        }

        return response()->json([
            'assessments' => $query->get()->map(fn (Assessment $a) => $this->format($a)),
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
            ]);

            $this->syncQuestions($assessment, $data['questions']);
        });

        return response()->json(['assessment' => $this->format($assessment->fresh('questions'))]);
    }

    public function destroy(Assessment $assessment): JsonResponse
    {
        $assessment->delete();

        return response()->json(['message' => 'Assessment deleted.']);
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
            'questions' => $assessment->questions->map(fn ($q) => [
                'id' => $q->id,
                'text' => $q->text,
                'options' => $q->options,
                'correct' => $q->correct_index,
            ])->values()->all(),
        ];
    }
}
