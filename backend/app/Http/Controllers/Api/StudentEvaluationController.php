<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentEvaluation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StudentEvaluationController extends Controller
{
    public function show(Request $request, Student $student, int $atelierNumber): JsonResponse
    {
        $classId = (int) $request->query('class_id');
        $schoolClass = $this->authorizeStudentInClass($request, $student, $classId);

        $evaluation = StudentEvaluation::query()
            ->where('student_id', $student->id)
            ->where('class_id', $schoolClass->id)
            ->where('atelier_number', $atelierNumber)
            ->first();

        if (! $evaluation) {
            return response()->json([
                'evaluation' => [
                    'status' => null,
                    'not_required' => false,
                    'comment' => '',
                    'responses' => null,
                ],
            ]);
        }

        return response()->json([
            'evaluation' => $this->formatEvaluation($evaluation),
        ]);
    }

    public function update(Request $request, Student $student, int $atelierNumber): JsonResponse
    {
        $data = $request->validate([
            'class_id' => ['required', 'integer'],
            'status' => ['nullable', 'string', 'in:success,adequate,needs-improvement,not-required'],
            'not_required' => ['nullable', 'boolean'],
            'comment' => ['nullable', 'string'],
            'responses' => ['nullable', 'array'],
        ]);

        $schoolClass = $this->authorizeStudentInClass($request, $student, (int) $data['class_id']);

        $notRequired = $request->boolean('not_required');
        $status = $notRequired ? 'not-required' : ($data['status'] ?? null);

        $evaluation = StudentEvaluation::updateOrCreate(
            [
                'student_id' => $student->id,
                'class_id' => $schoolClass->id,
                'atelier_number' => $atelierNumber,
            ],
            [
                'status' => $status,
                'not_required' => $notRequired,
                'comment' => $data['comment'] ?? '',
                'responses' => $data['responses'] ?? null,
            ]
        );

        return response()->json([
            'evaluation' => $this->formatEvaluation($evaluation),
        ]);
    }

    private function authorizeStudentInClass(Request $request, Student $student, int $classId): SchoolClass
    {
        if ($classId <= 0) {
            abort(422, 'class_id is required.');
        }

        $schoolClass = SchoolClass::query()
            ->where('id', $classId)
            ->where('teacher_id', $request->user()->id)
            ->first();

        if (! $schoolClass) {
            abort(403);
        }

        if (! $student->classes()->where('classes.id', $schoolClass->id)->exists()) {
            abort(403);
        }

        return $schoolClass;
    }

    private function formatEvaluation(StudentEvaluation $evaluation): array
    {
        return [
            'status' => $evaluation->status,
            'not_required' => (bool) $evaluation->not_required,
            'comment' => $evaluation->comment ?? '',
            'responses' => $evaluation->responses,
        ];
    }
}
