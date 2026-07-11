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

class SchoolReportsController extends Controller
{
    private const SKILL_GROUPS = [
        ['num' => 1, 'subject' => 'Alphabetics Knowledge', 'color' => '#38b6ff', 'ateliers' => [1, 2, 3]],
        ['num' => 2, 'subject' => 'Phonological Awareness', 'color' => '#c9e265', 'ateliers' => [4, 5, 6]],
        ['num' => 3, 'subject' => 'Decoding', 'color' => '#38b6ff', 'ateliers' => [7, 8, 9]],
        ['num' => 4, 'subject' => 'Fluency', 'color' => '#ffde59', 'ateliers' => [10, 11, 12]],
        ['num' => 5, 'subject' => 'Comprehension', 'color' => '#ff5757', 'ateliers' => [13, 14, 15]],
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

        $classRows = [];
        $atRiskStudents = [];
        $allEvaluationScores = [];
        $distinctStudentIds = collect();

        foreach ($classes as $class) {
            $studentCount = $class->students->count();
            $distinctStudentIds = $distinctStudentIds->merge($class->students->pluck('id'));

            $classStatuses = [];

            foreach ($class->students as $student) {
                $key = "{$class->id}:{$student->id}";
                $statuses = $this->statusesForStudent($evaluationsByKey->get($key, collect()));
                $classStatuses = array_merge($classStatuses, $statuses);
                $allEvaluationScores = array_merge($allEvaluationScores, $this->scoredEvaluations($evaluationsByKey->get($key, collect())));

                if ($this->isAtRisk($student, $statuses)) {
                    $atRiskStudents[] = [
                        'id' => $student->id,
                        'name' => $student->fullName(),
                        'class_name' => $class->name,
                        'teacher' => $this->teacherName($class->teacher),
                        'initials' => $this->initials($student->fullName()),
                    ];
                }
            }

            $classRows[] = [
                'id' => $class->id,
                'name' => $class->name,
                'grade' => $this->normalizeGrade($class->grade),
                'raw_grade' => $class->grade,
                'teacher' => $this->teacherName($class->teacher),
                'students' => $studentCount,
                'on_track' => $this->onTrackPercent($classStatuses),
            ];
        }

        $schoolOnTrack = $classRows
            ? (int) round(collect($classRows)->avg('on_track'))
            : 0;

        $gradeBenchmarks = collect($classRows)
            ->groupBy('grade')
            ->map(fn (Collection $group, string $grade) => [
                'grade' => $grade,
                'on_track' => (int) round($group->avg('on_track')),
                'class_count' => $group->count(),
                'student_count' => (int) $group->sum('students'),
            ])
            ->values()
            ->sortBy(fn (array $row) => $this->gradeSortOrder($row['grade']))
            ->values()
            ->all();

        $skills = collect(self::SKILL_GROUPS)
            ->map(function (array $skill) use ($evaluationsByKey, $classIds) {
                $scores = [];

                foreach ($classIds as $classId) {
                    foreach ($evaluationsByKey as $key => $evaluations) {
                        if (! str_starts_with($key, "{$classId}:")) {
                            continue;
                        }

                        foreach ($evaluations as $evaluation) {
                            if (! in_array($evaluation->atelier_number, $skill['ateliers'], true)) {
                                continue;
                            }

                            $score = $this->statusScore($evaluation->status);

                            if ($score !== null) {
                                $scores[] = $score;
                            }
                        }
                    }
                }

                return [
                    'num' => $skill['num'],
                    'subject' => $skill['subject'],
                    'color' => $skill['color'],
                    'score' => $scores ? (int) round(array_sum($scores) / count($scores)) : 0,
                ];
            })
            ->all();

        usort($atRiskStudents, fn (array $a, array $b) => strcmp($a['name'], $b['name']));

        return response()->json([
            'school' => [
                'id' => $school->id,
                'name' => $school->name,
                'school_board' => $this->formatSchoolBoard($school->school_board),
            ],
            'school_year' => $schoolYear !== '' ? $schoolYear : SchoolYear::defaultLabel(),
            'available_years' => $availableYears,
            'summary' => [
                'total_students' => $distinctStudentIds->unique()->count(),
                'total_classes' => count($classRows),
                'on_track_average' => $schoolOnTrack,
            ],
            'grade_benchmarks' => $gradeBenchmarks,
            'skills' => $skills,
            'classes' => $classRows,
            'at_risk_students' => $atRiskStudents,
        ]);
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

    /** @param Collection<int, StudentEvaluation> $evaluations */
    private function scoredEvaluations(Collection $evaluations): array
    {
        $scores = [];

        foreach ($evaluations as $evaluation) {
            $score = $this->statusScore($evaluation->status);

            if ($score !== null) {
                $scores[] = $score;
            }
        }

        return $scores;
    }

    private function statusScore(?string $status): ?int
    {
        return match ($status) {
            'success' => 100,
            'adequate' => 66,
            'needs-improvement' => 33,
            default => null,
        };
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

    private function initials(string $name): string
    {
        $parts = preg_split('/\s+/', trim($name)) ?: [];

        return strtoupper(collect($parts)->take(2)->map(fn (string $part) => mb_substr($part, 0, 1))->implode(''));
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
