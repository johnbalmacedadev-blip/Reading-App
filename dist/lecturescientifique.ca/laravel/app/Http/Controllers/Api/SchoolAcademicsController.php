<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\School;
use App\Models\SchoolBoard;
use App\Models\SchoolClass;
use App\Models\SchoolYear;
use App\Models\Student;
use App\Models\StudentEvaluation;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class SchoolAcademicsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($user->role !== 'school_admin' || ! $user->school_id) {
            abort(403, 'School portal access required.');
        }

        /** @var School $school */
        $school = School::query()->findOrFail($user->school_id);

        $classesQuery = SchoolClass::query()
            ->with(['teacher', 'students'])
            ->where(function ($query) use ($school) {
                $query->where('school_id', $school->id)
                    ->orWhereHas('teacher', fn ($teacherQuery) => $teacherQuery->where('school_id', $school->id));
            })
            ->orderBy('grade')
            ->orderBy('name');

        $availableYears = (clone $classesQuery)
            ->pluck('school_year')
            ->filter()
            ->unique()
            ->sort()
            ->values()
            ->all();

        $schoolYear = $request->string('school_year')->toString();

        if ($schoolYear !== '' && $schoolYear !== 'all') {
            $classesQuery->where('school_year', $schoolYear);
        }

        $classes = $classesQuery->get();
        $classIds = $classes->pluck('id');

        $evaluationsByKey = StudentEvaluation::query()
            ->whereIn('class_id', $classIds)
            ->get()
            ->groupBy(fn (StudentEvaluation $evaluation) => "{$evaluation->class_id}:{$evaluation->student_id}");

        $students = [];
        $teachersById = [];

        foreach ($classes as $class) {
            $teacherId = $class->teacher_id;
            $teacherName = $this->teacherName($class->teacher);
            $normalizedGrade = $this->normalizeGrade($class->grade);

            if ($teacherId) {
                if (! isset($teachersById[$teacherId])) {
                    $teachersById[$teacherId] = [
                        'id' => $teacherId,
                        'name' => $teacherName,
                        'grade' => $normalizedGrade,
                        'classes' => [],
                        'student_ateliers' => [],
                        'student_statuses' => [],
                    ];
                }

                if (! in_array($class->name, $teachersById[$teacherId]['classes'], true)) {
                    $teachersById[$teacherId]['classes'][] = $class->name;
                }
            }

            foreach ($class->students as $student) {
                $key = "{$class->id}:{$student->id}";
                $evaluations = $evaluationsByKey->get($key, collect());
                $statuses = $this->statusesForStudent($evaluations);
                $atelier = $this->currentAtelier($student, $evaluations);
                $enVoie = ! $this->isAtRisk($student, $statuses);

                $students[] = [
                    'id' => $student->id,
                    'name' => $student->fullName(),
                    'class_name' => $class->name,
                    'grade' => $normalizedGrade,
                    'teacher' => $teacherName,
                    'atelier' => $atelier,
                    'en_voie' => $enVoie,
                ];

                if ($teacherId) {
                    $teachersById[$teacherId]['student_ateliers'][] = $atelier;
                    $teachersById[$teacherId]['student_statuses'] = array_merge(
                        $teachersById[$teacherId]['student_statuses'],
                        $statuses
                    );
                }
            }
        }

        usort($students, fn (array $a, array $b) => strcmp($a['name'], $b['name']));

        $teachers = collect($teachersById)
            ->map(function (array $teacher) {
                $ateliers = $teacher['student_ateliers'];
                $avgAtelier = $ateliers
                    ? round(array_sum($ateliers) / count($ateliers), 1)
                    : 0.0;

                return [
                    'id' => $teacher['id'],
                    'name' => $teacher['name'],
                    'grade' => $teacher['grade'],
                    'classes' => $teacher['classes'],
                    'students' => count($ateliers),
                    'avg_atelier' => $avgAtelier,
                    'en_voie' => $this->onTrackPercent($teacher['student_statuses']),
                ];
            })
            ->sortBy('name')
            ->values()
            ->all();

        $grades = collect($students)
            ->pluck('grade')
            ->unique()
            ->sortBy(fn (string $grade) => $this->gradeSortOrder($grade))
            ->values()
            ->all();

        return response()->json([
            'school' => [
                'id' => $school->id,
                'name' => $school->name,
                'school_board' => $this->formatSchoolBoard($school->school_board),
            ],
            'school_year' => $schoolYear !== '' ? $schoolYear : SchoolYear::defaultLabel(),
            'available_years' => $availableYears,
            'grades' => $grades,
            'students' => $students,
            'teachers' => $teachers,
            'summary' => [
                'student_count' => count($students),
                'teacher_count' => count($teachers),
            ],
        ]);
    }

    /** @param Collection<int, StudentEvaluation> $evaluations */
    private function currentAtelier(Student $student, Collection $evaluations): int
    {
        $completedAtelier = $evaluations
            ->filter(fn (StudentEvaluation $evaluation) => $this->hasEvaluationProgress($evaluation))
            ->max('atelier_number');

        return (int) ($completedAtelier ?: $student->current_atelier ?: 1);
    }

    private function hasEvaluationProgress(StudentEvaluation $evaluation): bool
    {
        if ($evaluation->not_required) {
            return true;
        }

        $responses = $evaluation->responses;

        return is_array($responses) && count($responses) > 0;
    }

    /** @param Collection<int, StudentEvaluation> $evaluations */
    private function statusesForStudent(Collection $evaluations): array
    {
        $statuses = array_fill(0, 15, null);

        foreach ($evaluations as $evaluation) {
            if ($evaluation->atelier_number >= 1 && $evaluation->atelier_number <= 15) {
                $statuses[$evaluation->atelier_number - 1] = $evaluation->status;
            }
        }

        return $statuses;
    }

    /** @param array<int, string|null> $statuses */
    private function onTrackPercent(array $statuses): int
    {
        $scored = array_values(array_filter(
            $statuses,
            fn (?string $status) => in_array($status, ['success', 'adequate', 'needs-improvement'], true)
        ));

        if ($scored === []) {
            return 0;
        }

        $successCount = count(array_filter($scored, fn (string $status) => $status === 'success'));

        return (int) round(($successCount / count($scored)) * 100);
    }

    /** @param array<int, string|null> $statuses */
    private function isAtRisk(Student $student, array $statuses): bool
    {
        if ($student->status === 'at_risk') {
            return true;
        }

        $scored = array_values(array_filter(
            $statuses,
            fn (?string $status) => in_array($status, ['success', 'adequate', 'needs-improvement'], true)
        ));

        if ($scored === []) {
            return false;
        }

        $needsImprovement = count(array_filter($scored, fn (string $status) => $status === 'needs-improvement'));

        if (($needsImprovement / count($scored)) >= 0.4) {
            return true;
        }

        return $this->onTrackPercent($statuses) < 50;
    }

    private function teacherName(?User $teacher): string
    {
        if (! $teacher) {
            return '—';
        }

        if ($teacher->first_name) {
            $title = $teacher->title ? "{$teacher->title} " : '';

            return trim("{$title}{$teacher->first_name} {$teacher->last_name}");
        }

        return $teacher->name;
    }

    private function normalizeGrade(?string $grade): string
    {
        $value = strtolower(trim($grade ?? ''));

        return match (true) {
            $value === '' => 'Other',
            str_contains($value, 'maternelle'), $value === 'kindergarten' => 'Maternelle',
            str_contains($value, 'jardin') => 'Jardin',
            str_contains($value, '1re'), str_contains($value, 'grade 1'), str_contains($value, '1st') => '1re année',
            str_contains($value, '2e'), str_contains($value, 'grade 2'), str_contains($value, '2nd') => '2e année',
            str_contains($value, '3e'), str_contains($value, 'grade 3') => '3e année',
            default => $grade ?? 'Other',
        };
    }

    private function gradeSortOrder(string $grade): int
    {
        return match ($grade) {
            'Maternelle' => 1,
            'Jardin' => 2,
            '1re année' => 3,
            '2e année' => 4,
            '3e année' => 5,
            default => 99,
        };
    }

    /** @return array{code: string, name: string}|null */
    private function formatSchoolBoard(?string $boardCode): ?array
    {
        $code = trim((string) ($boardCode ?? ''));

        if ($code === '') {
            return null;
        }

        $board = SchoolBoard::query()->where('code', $code)->first();

        return [
            'code' => $code,
            'name' => $board?->name ?? $code,
        ];
    }
}
