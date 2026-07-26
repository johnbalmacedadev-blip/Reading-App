<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentEvaluation;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class TeacherReportsController extends Controller
{
    private const WORKSHOP_RANGES = [
        ['key' => 'reports.workshopsUnit1', 'ateliers' => [1, 2, 3, 4]],
        ['key' => 'reports.workshopsUnit2to5', 'ateliers' => [5, 6, 7, 8, 9]],
        ['key' => 'reports.workshopsUnit6to10', 'ateliers' => [10, 11, 12, 13, 14, 15]],
    ];

    private const MONTH_KEYS = [
        'month.sep', 'month.oct', 'month.nov', 'month.dec',
        'month.jan', 'month.feb', 'month.mar', 'month.apr', 'month.may', 'month.jun',
    ];

    public function index(Request $request): JsonResponse
    {
        /** @var User $teacher */
        $teacher = $request->user();

        if ($teacher->role !== 'teacher') {
            abort(403, 'Teacher portal access required.');
        }

        if (! $teacher->canAccessReports()) {
            abort(403, 'Reports require an active Insights subscription.');
        }

        $classesQuery = SchoolClass::query()
            ->with(['students'])
            ->where('teacher_id', $teacher->id)
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
        if ($schoolYear === '') {
            $schoolYear = $availableYears[array_key_last($availableYears)] ?? $this->currentSchoolYear();
        }

        if ($schoolYear !== '' && $schoolYear !== 'all') {
            $classesQuery->where('school_year', $schoolYear);
        }

        $classes = $classesQuery->get();
        $classId = $request->integer('class_id');

        $selectedClasses = $classId > 0
            ? $classes->where('id', $classId)->values()
            : $classes;

        if ($classId > 0 && $selectedClasses->isEmpty()) {
            abort(404, 'Class not found.');
        }

        $classIds = $selectedClasses->pluck('id');

        $evaluationsByKey = $classIds->isEmpty()
            ? collect()
            : StudentEvaluation::query()
                ->whereIn('class_id', $classIds)
                ->get()
                ->groupBy(fn (StudentEvaluation $evaluation) => "{$evaluation->class_id}:{$evaluation->student_id}");

        $students = $this->collectStudents($selectedClasses);
        $studentMetrics = $this->buildStudentMetrics($students, $evaluationsByKey);

        $allStatuses = $this->flattenStatuses($studentMetrics);
        $statusTotals = $this->statusTotals($allStatuses);

        [$yearStart, $yearEnd] = $this->schoolYearRange($schoolYear);

        return response()->json([
            'school_year' => $schoolYear,
            'available_years' => $availableYears ?: [$schoolYear],
            'classes' => $classes->map(fn (SchoolClass $class) => [
                'id' => $class->id,
                'name' => $class->name,
                'grade' => $class->grade,
            ])->values()->all(),
            'selected_class_id' => $classId > 0 ? $classId : null,
            'summary' => [
                'num_classes' => $selectedClasses->count(),
                'num_students' => $students->count(),
                'good_grades' => $this->percent($statusTotals['success'], $statusTotals['total']),
                'satisfactory' => $this->percent($statusTotals['adequate'], $statusTotals['total']),
                'failing' => $this->percent($statusTotals['needs-improvement'], $statusTotals['total']),
                'not_submitted' => $this->percent($statusTotals['null'], $statusTotals['total']),
            ],
            'workshop_range' => $this->workshopRangeCounts($studentMetrics),
            'progress_over_time' => $this->progressOverTime($classIds, $yearStart, $yearEnd),
            'class_performance' => $this->classPerformance($studentMetrics),
        ]);
    }

    /** @param Collection<int, SchoolClass> $classes */
    private function collectStudents(Collection $classes): Collection
    {
        $students = collect();

        foreach ($classes as $class) {
            foreach ($class->students as $student) {
                $students->push([
                    'id' => $student->id,
                    'name' => $student->fullName(),
                    'class_id' => $class->id,
                    'class_name' => $class->name,
                    'grade' => $class->grade,
                ]);
            }
        }

        return $students;
    }

    /** @param Collection<int, array<string, mixed>> $students */
    private function buildStudentMetrics(Collection $students, Collection $evaluationsByKey): Collection
    {
        return $students->map(function (array $student) use ($evaluationsByKey) {
            $key = "{$student['class_id']}:{$student['id']}";
            $evaluations = $evaluationsByKey->get($key, collect());
            $statuses = $this->statusesForStudent($evaluations);
            $completed = $this->completedCount($statuses);
            $benchmark = $this->gradeBenchmark($student['grade']);
            $gap = max(0, $benchmark - $completed);
            $highestAtelier = $this->highestCompletedAtelier($statuses);

            return [
                ...$student,
                'statuses' => $statuses,
                'completed' => $completed,
                'benchmark' => $benchmark,
                'gap' => $gap,
                'highest_atelier' => $highestAtelier,
                'category' => $this->studentCategory($completed, $benchmark),
            ];
        });
    }

    /** @param Collection<int, array<string, mixed>> $studentMetrics */
    private function flattenStatuses(Collection $studentMetrics): array
    {
        $statuses = [];

        foreach ($studentMetrics as $student) {
            $statuses = array_merge($statuses, $student['statuses']);
        }

        return $statuses;
    }

    /** @param array<int, string|null> $statuses */
    private function statusTotals(array $statuses): array
    {
        $totals = [
            'success' => 0,
            'adequate' => 0,
            'needs-improvement' => 0,
            'null' => 0,
            'total' => count($statuses),
        ];

        foreach ($statuses as $status) {
            if ($status === 'success') {
                $totals['success']++;
            } elseif ($status === 'adequate') {
                $totals['adequate']++;
            } elseif ($status === 'needs-improvement') {
                $totals['needs-improvement']++;
            } else {
                $totals['null']++;
            }
        }

        return $totals;
    }

    /** @param Collection<int, array<string, mixed>> $studentMetrics */
    private function workshopRangeCounts(Collection $studentMetrics): array
    {
        return collect(self::WORKSHOP_RANGES)
            ->map(function (array $range) use ($studentMetrics) {
                $count = $studentMetrics->filter(function (array $student) use ($range) {
                    foreach ($range['ateliers'] as $atelier) {
                        $status = $student['statuses'][$atelier - 1] ?? null;
                        if ($status !== null && $status !== 'not-required') {
                            return true;
                        }
                    }

                    return false;
                })->count();

                return [
                    'key' => $range['key'],
                    'value' => $count,
                ];
            })
            ->values()
            ->all();
    }

    /** @param Collection<int, int> $classIds */
    private function progressOverTime(Collection $classIds, Carbon $yearStart, Carbon $yearEnd): array
    {
        $evaluations = $classIds->isEmpty()
            ? collect()
            : StudentEvaluation::query()
                ->whereIn('class_id', $classIds)
                ->whereBetween('updated_at', [$yearStart, $yearEnd])
                ->whereIn('status', ['success', 'adequate', 'needs-improvement'])
                ->get(['status', 'updated_at']);

        $series = [];
        $cursor = $yearStart->copy();

        foreach (self::MONTH_KEYS as $monthKey) {
            if ($cursor->gt($yearEnd)) {
                break;
            }

            $monthEnd = $cursor->copy()->endOfMonth();
            if ($monthEnd->gt($yearEnd)) {
                $monthEnd = $yearEnd->copy();
            }

            $monthEvals = $evaluations->filter(
                fn (StudentEvaluation $evaluation) => $evaluation->updated_at && $evaluation->updated_at->lte($monthEnd)
            );

            $average = 0;
            if ($monthEvals->isNotEmpty()) {
                $successCount = $monthEvals->where('status', 'success')->count();
                $average = (int) round(($successCount / $monthEvals->count()) * 100);
            }

            $series[] = [
                'month' => $monthKey,
                'average' => $average,
            ];

            $cursor->addMonth()->startOfMonth();
        }

        return $series;
    }

    /** @param Collection<int, array<string, mixed>> $studentMetrics */
    private function classPerformance(Collection $studentMetrics): array
    {
        $threshold = $studentMetrics->isEmpty()
            ? 0
            : (int) round($studentMetrics->avg('benchmark'));

        $onTrack = $studentMetrics->where('category', 'on_track')->count();
        $progressing = $studentMetrics->where('category', 'progressing')->count();
        $needingSupport = $studentMetrics->where('category', 'needing_support')->count();

        $allStatuses = $this->flattenStatuses($studentMetrics);
        $statusTotals = $this->statusTotals($allStatuses);
        $scoredTotal = max(1, $statusTotals['total'] - $statusTotals['null']);

        $engagedStudents = $studentMetrics
            ->filter(fn (array $student) => $student['highest_atelier'] > 0)
            ->sortByDesc('highest_atelier')
            ->take(3)
            ->values()
            ->map(fn (array $student) => [
                'id' => $student['id'],
                'name' => $student['name'],
                'class_id' => $student['class_id'],
                'atelier' => $student['highest_atelier'],
            ])
            ->all();

        $supportStudents = $studentMetrics
            ->filter(fn (array $student) => $student['gap'] > 0)
            ->sortByDesc('gap')
            ->take(3)
            ->values()
            ->map(fn (array $student) => [
                'id' => $student['id'],
                'name' => $student['name'],
                'class_id' => $student['class_id'],
                'atelier' => $student['highest_atelier'],
                'gap' => $student['gap'],
            ])
            ->all();

        $allStudents = $studentMetrics
            ->sortBy('name')
            ->values()
            ->map(fn (array $student) => [
                'id' => $student['id'],
                'name' => $student['name'],
                'class_id' => $student['class_id'],
            ])
            ->all();

        return [
            'threshold' => $threshold,
            'on_track' => $onTrack,
            'progressing' => $progressing,
            'needing_support' => $needingSupport,
            'distribution' => [
                [
                    'key' => 'reports.onTrackAcquired',
                    'value' => $this->percent($statusTotals['success'], $scoredTotal),
                    'color' => '#c9e265',
                ],
                [
                    'key' => 'common.monitor',
                    'value' => $this->percent($statusTotals['adequate'], $scoredTotal),
                    'color' => '#ffde59',
                ],
                [
                    'key' => 'common.atRisk',
                    'value' => $this->percent($statusTotals['needs-improvement'], $scoredTotal),
                    'color' => '#ff5757',
                ],
            ],
            'engaged_students' => $engagedStudents,
            'support_students' => $supportStudents,
            'all_students' => $allStudents,
        ];
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
    private function completedCount(array $statuses): int
    {
        return count(array_filter(
            $statuses,
            fn (?string $status) => $status !== null && $status !== 'not-required'
        ));
    }

    /** @param array<int, string|null> $statuses */
    private function highestCompletedAtelier(array $statuses): int
    {
        $highest = 0;

        foreach ($statuses as $index => $status) {
            if ($status !== null && $status !== 'not-required') {
                $highest = $index + 1;
            }
        }

        return $highest;
    }

    private function studentCategory(int $completed, int $benchmark): string
    {
        if ($benchmark <= 0) {
            return $completed > 0 ? 'on_track' : 'progressing';
        }

        if ($completed >= $benchmark) {
            return 'on_track';
        }

        if ($completed >= max(1, (int) floor($benchmark * 0.6))) {
            return 'progressing';
        }

        return 'needing_support';
    }

    private function gradeBenchmark(?string $grade): int
    {
        $value = strtolower(trim($grade ?? ''));

        return match (true) {
            str_contains($value, 'maternelle'), $value === 'kindergarten' => 2,
            str_contains($value, 'jardin') => 6,
            str_contains($value, '1re'), str_contains($value, 'grade 1'), str_contains($value, '1st') => 10,
            str_contains($value, '2e'), str_contains($value, 'grade 2'), str_contains($value, '2nd') => 14,
            default => 8,
        };
    }

    private function percent(int $part, int $total): int
    {
        if ($total <= 0) {
            return 0;
        }

        return (int) round(($part / $total) * 100);
    }

    private function currentSchoolYear(): string
    {
        $now = now();
        $startYear = $now->month >= 9 ? $now->year : $now->year - 1;

        return "{$startYear}-".($startYear + 1);
    }

    /** @return array{0: Carbon, 1: Carbon} */
    private function schoolYearRange(string $schoolYear): array
    {
        if (preg_match('/^(\d{4})-(\d{4})$/', $schoolYear, $matches)) {
            $start = Carbon::create((int) $matches[1], 9, 1)->startOfDay();
            $end = Carbon::create((int) $matches[2], 8, 31)->endOfDay();

            return [$start, $end];
        }

        return $this->schoolYearRange($this->currentSchoolYear());
    }
}
