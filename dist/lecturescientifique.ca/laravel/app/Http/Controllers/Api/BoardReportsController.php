<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\School;
use App\Models\SchoolBoard;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentEvaluation;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class BoardReportsController extends Controller
{
    private const MONTH_LABELS = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

    /** @var list<array{grade_key: string, target_atelier: int, match: list<string>}> */
    private const GRADE_BENCHMARKS = [
        ['grade_key' => 'grade.kindergarten', 'target_atelier' => 2, 'match' => ['kindergarten', 'maternelle']],
        ['grade_key' => 'grade.garden', 'target_atelier' => 6, 'match' => ['jardin']],
        ['grade_key' => 'grade.grade1', 'target_atelier' => 10, 'match' => ['1re', 'grade 1', '1st']],
        ['grade_key' => 'grade.grade2', 'target_atelier' => 14, 'match' => ['2e', 'grade 2', '2nd']],
    ];

    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($user->role !== 'board_admin' || ! $user->school_board) {
            abort(403, 'School board portal access required.');
        }

        $boardCode = $user->school_board;
        $board = SchoolBoard::query()->where('code', $boardCode)->first();

        $schools = School::query()
            ->where('school_board', $boardCode)
            ->where('status', 'active')
            ->orderBy('name')
            ->get(['id', 'name', 'city']);

        $schoolIds = $schools->pluck('id');

        $availableYears = SchoolClass::query()
            ->whereIn('school_id', $schoolIds)
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

        [$yearStart, $yearEnd] = $this->schoolYearRange($schoolYear);

        $studentCounts = $this->studentCountsForSchools($schoolIds);
        $statusBySchool = $this->statusBreakdownBySchool($schoolIds);
        $successRateByMonth = $this->successRateByMonth($schoolIds, $yearStart, $yearEnd, $schoolYear);

        $schoolRows = $schools->map(function (School $school) use ($studentCounts, $statusBySchool) {
            $status = $statusBySchool[$school->id] ?? ['on_track' => 0, 'monitor' => 0, 'at_risk' => 0, 'total' => 0];
            $total = max(1, $status['total']);

            return [
                'id' => $school->id,
                'name' => $school->name,
                'city' => $school->city ?? '',
                'students' => $studentCounts[$school->id] ?? 0,
                'on_track' => $this->percent($status['on_track'], $total),
                'monitor' => $this->percent($status['monitor'], $total),
                'at_risk' => $this->percent($status['at_risk'], $total),
            ];
        })->values()->all();

        $avgOnTrack = $schoolRows
            ? (int) round(collect($schoolRows)->avg('on_track'))
            : 0;

        $latestTrend = collect($successRateByMonth)->last()['rate'] ?? $avgOnTrack;

        $payload = [
            'board' => [
                'code' => $boardCode,
                'name' => $board?->name ?? $user->name,
            ],
            'school_year' => $schoolYear,
            'available_years' => $availableYears ?: [$schoolYear],
            'summary' => [
                'participating_schools' => $schools->count(),
                'total_students' => array_sum($studentCounts),
                'avg_on_track' => $avgOnTrack,
                'latest_trend' => $latestTrend,
            ],
            'success_rate_by_month' => $successRateByMonth,
            'grade_benchmarks' => $this->gradeBenchmarks($schoolIds),
            'schools' => $schoolRows,
            'school' => null,
            'classes' => [],
            'students' => [],
        ];

        $schoolId = (int) $request->query('school_id', 0);
        if ($schoolId > 0) {
            $school = $schools->firstWhere('id', $schoolId);
            if (! $school) {
                abort(404, 'School not found for this board.');
            }

            $schoolStatus = $statusBySchool[$school->id] ?? ['on_track' => 0, 'monitor' => 0, 'at_risk' => 0, 'total' => 0];
            $schoolTotal = max(1, $schoolStatus['total']);

            $payload['school'] = [
                'id' => $school->id,
                'name' => $school->name,
                'city' => $school->city ?? '',
                'students' => $studentCounts[$school->id] ?? 0,
                'on_track' => $this->percent($schoolStatus['on_track'], $schoolTotal),
                'monitor' => $this->percent($schoolStatus['monitor'], $schoolTotal),
                'at_risk' => $this->percent($schoolStatus['at_risk'], $schoolTotal),
            ];

            $payload['classes'] = $this->classesForSchool($school, $schoolYear);

            $classId = (int) $request->query('class_id', 0);
            if ($classId > 0) {
                $classIds = collect($payload['classes'])->pluck('id');
                if (! $classIds->contains($classId)) {
                    abort(404, 'Class not found for this school.');
                }

                $payload['students'] = $this->studentsForClass($classId);
            }
        }

        return response()->json($payload);
    }

    /** @param Collection<int, int> $schoolIds */
    private function gradeBenchmarks(Collection $schoolIds): array
    {
        if ($schoolIds->isEmpty()) {
            return [];
        }

        $students = Student::query()
            ->whereIn('school_id', $schoolIds)
            ->get(['grade', 'current_atelier']);

        return collect(self::GRADE_BENCHMARKS)->map(function (array $benchmark) use ($students) {
            $matched = $students->filter(fn (Student $student) => $this->gradeMatches($student->grade, $benchmark['match']));
            $avgCompleted = $matched->isEmpty()
                ? 0
                : (int) round($matched->avg('current_atelier'));

            return [
                'grade_key' => $benchmark['grade_key'],
                'target_atelier' => $benchmark['target_atelier'],
                'avg_completed' => $avgCompleted,
                'student_count' => $matched->count(),
            ];
        })->values()->all();
    }

    /** @param list<string> $patterns */
    private function gradeMatches(?string $grade, array $patterns): bool
    {
        $value = strtolower(trim($grade ?? ''));

        foreach ($patterns as $pattern) {
            if (str_contains($value, strtolower($pattern))) {
                return true;
            }
        }

        return false;
    }

    private function classesForSchool(School $school, string $schoolYear): array
    {
        $classesQuery = SchoolClass::query()
            ->with(['teacher', 'students'])
            ->where(function ($query) use ($school) {
                $query->where('school_id', $school->id)
                    ->orWhereHas('teacher', fn ($teacherQuery) => $teacherQuery->where('school_id', $school->id));
            })
            ->orderBy('grade')
            ->orderBy('name');

        if ($schoolYear !== '') {
            $classesQuery->where('school_year', $schoolYear);
        }

        $classes = $classesQuery->get();
        $classIds = $classes->pluck('id');

        $evaluationsByKey = StudentEvaluation::query()
            ->whereIn('class_id', $classIds)
            ->get()
            ->groupBy(fn (StudentEvaluation $evaluation) => "{$evaluation->class_id}:{$evaluation->student_id}");

        $rows = [];

        foreach ($classes as $class) {
            $statuses = [];

            foreach ($class->students as $student) {
                $key = "{$class->id}:{$student->id}";
                $statuses = array_merge(
                    $statuses,
                    $this->statusesForStudent($evaluationsByKey->get($key, collect()))
                );
            }

            $rows[] = [
                'id' => $class->id,
                'name' => $class->name,
                'grade' => $class->grade,
                'teacher' => $this->teacherName($class->teacher),
                'students' => $class->students->count(),
                'on_track' => $this->onTrackPercent($statuses),
            ];
        }

        return $rows;
    }

    private function studentsForClass(int $classId): array
    {
        $class = SchoolClass::query()
            ->with('students')
            ->findOrFail($classId);

        $evaluationsByStudent = StudentEvaluation::query()
            ->where('class_id', $classId)
            ->get()
            ->groupBy('student_id');

        return $class->students
            ->sortBy(fn (Student $student) => $student->fullName())
            ->map(function (Student $student) use ($class, $evaluationsByStudent) {
                $evaluations = $evaluationsByStudent->get($student->id, collect());
                $completedAtelier = $evaluations
                    ->filter(fn (StudentEvaluation $e) => $this->hasEvaluationProgress($e))
                    ->max('atelier_number');

                return [
                    'id' => $student->id,
                    'name' => $student->fullName(),
                    'grade' => $class->grade,
                    'current_atelier' => (int) ($completedAtelier ?: $student->current_atelier ?: 1),
                    'status' => $this->studentStatusKey($student, $evaluations),
                ];
            })
            ->values()
            ->all();
    }

    /** @param Collection<int, StudentEvaluation> $evaluations */
    private function studentStatusKey(Student $student, Collection $evaluations): string
    {
        if ($student->status === 'at_risk') {
            return 'at_risk';
        }

        if ($student->status === 'monitor') {
            return 'monitor';
        }

        $statuses = $this->statusesForStudent($evaluations);
        $scored = array_values(array_filter(
            $statuses,
            fn (?string $status) => in_array($status, ['success', 'adequate', 'needs-improvement'], true)
        ));

        if ($scored === []) {
            return 'on_track';
        }

        $needsImprovement = count(array_filter($scored, fn (string $status) => $status === 'needs-improvement'));
        if (($needsImprovement / count($scored)) >= 0.4) {
            return 'at_risk';
        }

        return $this->onTrackPercent($statuses) >= 50 ? 'on_track' : 'monitor';
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

    /** @param Collection<int, int> $schoolIds */
    private function studentCountsForSchools(Collection $schoolIds): array
    {
        if ($schoolIds->isEmpty()) {
            return [];
        }

        $directStudentIds = DB::table('students')
            ->whereIn('school_id', $schoolIds)
            ->select('school_id', 'id')
            ->get()
            ->groupBy('school_id');

        $enrolledStudentIds = DB::table('class_student')
            ->join('classes', 'classes.id', '=', 'class_student.class_id')
            ->whereIn('classes.school_id', $schoolIds)
            ->select('classes.school_id', 'class_student.student_id')
            ->get()
            ->groupBy('school_id');

        $counts = [];

        foreach ($schoolIds as $schoolId) {
            $counts[$schoolId] = collect($directStudentIds->get($schoolId, []))
                ->pluck('id')
                ->merge(collect($enrolledStudentIds->get($schoolId, []))->pluck('student_id'))
                ->unique()
                ->count();
        }

        return $counts;
    }

    /** @param Collection<int, int> $schoolIds */
    private function statusBreakdownBySchool(Collection $schoolIds): array
    {
        if ($schoolIds->isEmpty()) {
            return [];
        }

        $rows = Student::query()
            ->whereIn('school_id', $schoolIds)
            ->selectRaw('school_id, status, count(*) as total')
            ->groupBy('school_id', 'status')
            ->get();

        $breakdown = [];

        foreach ($schoolIds as $schoolId) {
            $breakdown[$schoolId] = ['on_track' => 0, 'monitor' => 0, 'at_risk' => 0, 'total' => 0];
        }

        foreach ($rows as $row) {
            $key = match ($row->status) {
                'monitor' => 'monitor',
                'at_risk' => 'at_risk',
                default => 'on_track',
            };
            $breakdown[$row->school_id][$key] += (int) $row->total;
            $breakdown[$row->school_id]['total'] += (int) $row->total;
        }

        return $breakdown;
    }

    /** @param Collection<int, int> $schoolIds */
    private function successRateByMonth(Collection $schoolIds, Carbon $yearStart, Carbon $yearEnd, string $schoolYear): array
    {
        $classIds = SchoolClass::query()
            ->whereIn('school_id', $schoolIds)
            ->when($schoolYear !== '', fn ($q) => $q->where('school_year', $schoolYear))
            ->pluck('id');

        $evaluations = $classIds->isEmpty()
            ? collect()
            : StudentEvaluation::query()
                ->whereIn('class_id', $classIds)
                ->whereBetween('updated_at', [$yearStart, $yearEnd])
                ->whereIn('status', ['success', 'adequate', 'needs-improvement'])
                ->get(['status', 'updated_at']);

        $series = [];
        $cursor = $yearStart->copy();

        foreach (self::MONTH_LABELS as $label) {
            if ($cursor->gt($yearEnd)) {
                break;
            }

            $monthEnd = $cursor->copy()->endOfMonth();
            if ($monthEnd->gt($yearEnd)) {
                $monthEnd = $yearEnd->copy();
            }

            $monthEvals = $evaluations->filter(
                fn (StudentEvaluation $e) => $e->updated_at && $e->updated_at->lte($monthEnd)
            );

            $rate = 0;
            if ($monthEvals->isNotEmpty()) {
                $successCount = $monthEvals->where('status', 'success')->count();
                $rate = (int) round(($successCount / $monthEvals->count()) * 100);
            } elseif ($schoolIds->isNotEmpty()) {
                $rate = $this->boardOnTrackPercent($schoolIds);
            }

            $series[] = ['month' => $label, 'rate' => $rate];
            $cursor->addMonth()->startOfMonth();
        }

        if ($series === []) {
            $series[] = ['month' => 'Sep', 'rate' => $this->boardOnTrackPercent($schoolIds)];
        }

        return $series;
    }

    /** @param Collection<int, int> $schoolIds */
    private function boardOnTrackPercent(Collection $schoolIds): int
    {
        if ($schoolIds->isEmpty()) {
            return 0;
        }

        $totals = Student::query()
            ->whereIn('school_id', $schoolIds)
            ->selectRaw("sum(case when status = 'on_track' or status is null then 1 else 0 end) as on_track")
            ->selectRaw('count(*) as total')
            ->first();

        return $this->percent((int) ($totals->on_track ?? 0), (int) ($totals->total ?? 0));
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
