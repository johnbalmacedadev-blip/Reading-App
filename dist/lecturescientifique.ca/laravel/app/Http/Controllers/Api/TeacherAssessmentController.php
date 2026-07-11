<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Assessment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TeacherAssessmentController extends Controller
{
    /** @var array<string, string> */
    private const GRADE_ALIASES = [
        'Maternelle' => 'Kindergarten',
        'Jardin' => 'Kindergarten',
        '1re année' => 'Grade 1',
        '2e année' => 'Grade 2',
        '3e année' => 'Grade 3',
        '4e année' => 'Grade 3+',
        '5e année' => 'Grade 3+',
        '6e année' => 'Grade 3+',
        'Grade 4' => 'Grade 3+',
        'Grade 5' => 'Grade 3+',
        'Grade 6' => 'Grade 3+',
    ];

    public function published(Request $request): JsonResponse
    {
        $atelier = (int) $request->query('atelier', 0);
        $grade = $this->normalizeGrade($request->query('grade'));

        if ($atelier < 1 || $atelier > 15 || $grade === '') {
            return response()->json(['assessment' => null]);
        }

        $assessment = Assessment::query()
            ->whereNull('school_board')
            ->whereNull('archived_at')
            ->where('atelier', $atelier)
            ->where('grade', $grade)
            ->where('status', 'published')
            ->whereNotNull('template_id')
            ->orderByDesc('updated_at')
            ->first();

        if (! $assessment) {
            return response()->json(['assessment' => null]);
        }

        return response()->json([
            'assessment' => [
                'id' => $assessment->id,
                'title' => $assessment->title,
                'unit' => $assessment->unit ?? '',
                'atelier' => $assessment->atelier,
                'grade' => $assessment->grade,
                'template_id' => $assessment->template_id,
                'template_draft' => $assessment->template_draft,
            ],
        ]);
    }

    private function normalizeGrade(mixed $grade): string
    {
        if (! is_string($grade) || trim($grade) === '') {
            return '';
        }

        $trimmed = trim($grade);

        return self::GRADE_ALIASES[$trimmed] ?? $trimmed;
    }
}
