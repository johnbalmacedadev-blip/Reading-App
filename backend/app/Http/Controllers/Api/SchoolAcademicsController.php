<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ClassType;
use App\Models\PlatformSetting;
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
        $classTypesByKey = $this->classTypeLookup();

        $evaluationsByKey = StudentEvaluation::query()
            ->whereIn('class_id', $classIds)
            ->get()
            ->groupBy(fn (StudentEvaluation $evaluation) => "{$evaluation->class_id}:{$evaluation->student_id}");

        $students = [];
        $teachersById = [];

        foreach ($classes as $class) {
            $teacherId = $class->teacher_id;
            $teacherName = $this->teacherName($class->teacher);
            $grade = $this->resolveGradeLabel($class->grade, $classTypesByKey);

            if ($teacherId) {
                if (! isset($teachersById[$teacherId])) {
                    $teachersById[$teacherId] = [
                        'id' => $teacherId,
                        'name' => $teacherName,
                        'grade' => $grade,
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
                    'grade' => $grade,
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

        // Grade filter options come from configured class types in the database.
        $configuredGrades = ClassType::activeOrdered()
            ->get(['name', 'name_fr', 'sort_order'])
            ->map(fn (ClassType $type) => [
                'value' => $type->name,
                'label' => $type->name,
                'label_fr' => $type->name_fr ?: $type->name,
            ])
            ->values()
            ->all();

        // Keep any school class grades that are not in class_types (legacy labels).
        $presentGrades = collect($students)
            ->pluck('grade')
            ->merge($classes->pluck('grade')->map(fn ($grade) => $this->resolveGradeLabel($grade, $classTypesByKey)))
            ->filter(fn ($grade) => is_string($grade) && $grade !== '')
            ->unique()
            ->values()
            ->all();

        $configuredValues = array_column($configuredGrades, 'value');
        foreach ($presentGrades as $grade) {
            if (! in_array($grade, $configuredValues, true)) {
                $configuredGrades[] = [
                    'value' => $grade,
                    'label' => $grade,
                    'label_fr' => $grade,
                ];
            }
        }

        $grades = array_values(array_column($configuredGrades, 'value'));

        return response()->json([
            'school' => [
                'id' => $school->id,
                'name' => $school->name,
                'school_board' => $this->formatSchoolBoard($school->school_board),
            ],
            'school_year' => $schoolYear !== '' ? $schoolYear : SchoolYear::defaultLabel(),
            'available_years' => $availableYears,
            'grades' => $grades,
            'grade_options' => $configuredGrades,
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

    /**
     * @return array{by_name: array<string, string>, by_alias: array<string, string>}
     */
    private function classTypeLookup(): array
    {
        $byName = [];
        $byAlias = [];

        foreach (ClassType::query()->orderBy('sort_order')->get(['name', 'name_fr', 'code']) as $type) {
            $byName[$type->name] = $type->name;
            foreach (array_filter([$type->name, $type->name_fr, $type->code]) as $alias) {
                $byAlias[mb_strtolower(trim((string) $alias))] = $type->name;
            }
        }

        return ['by_name' => $byName, 'by_alias' => $byAlias];
    }

    /**
     * Prefer the class-type label stored on the class (matches class_types.name).
     * Fall back to resolving aliases so legacy French labels still filter cleanly.
     *
     * @param  array{by_name: array<string, string>, by_alias: array<string, string>}|null  $lookup
     */
    private function resolveGradeLabel(?string $grade, ?array $lookup = null): string
    {
        $trimmed = trim((string) $grade);
        if ($trimmed === '') {
            return 'Other';
        }

        $lookup ??= $this->classTypeLookup();

        if (isset($lookup['by_name'][$trimmed])) {
            return $lookup['by_name'][$trimmed];
        }

        $aliasKey = mb_strtolower($trimmed);
        if (isset($lookup['by_alias'][$aliasKey])) {
            return $lookup['by_alias'][$aliasKey];
        }

        // Legacy French / short labels -> configured class type when possible.
        $legacyMap = [
            'Maternelle' => 'Junior Kindergarten (JK)',
            'Jardin' => 'Senior Kindergarten (SK)',
            'Kindergarten' => 'Junior Kindergarten (JK)',
            '1re année' => 'Grade 1',
            '2e année' => 'Grade 2',
            '3e année' => 'Grade 3+',
            '3e année+' => 'Grade 3+',
            'Grade 3' => 'Grade 3+',
        ];

        if (isset($legacyMap[$trimmed]) && isset($lookup['by_name'][$legacyMap[$trimmed]])) {
            return $legacyMap[$trimmed];
        }

        return $trimmed;
    }

    /** @return array{code: string, name: string}|null */
    private function formatSchoolBoard(?string $boardCode): ?array
    {
        if (! PlatformSetting::boolValue('school_can_view_board', false)) {
            return null;
        }

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
