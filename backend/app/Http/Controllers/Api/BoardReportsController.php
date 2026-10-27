<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ClassType;
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

class BoardReportsController extends Controller
{
    private const MONTH_LABELS = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

    /** Target workshop number by assessment-grade band (end-of-grade expectation). */
    private const GRADE_TARGETS = [
        'Kindergarten' => 2,
        'Grade 1' => 6,
        'Grade 2' => 10,
        'Grade 3' => 14,
        'Grade 3+' => 14,
    ];

    /** @var array{on_track: int, monitor: int, at_risk: int} */
    private array $statusThresholds = [
        'on_track' => 75,
        'monitor' => 50,
        'at_risk' => 50,
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

        $boardClasses = $this->classesForBoard($boardCode, $schoolIds);
        $availableYears = $boardClasses
            ->pluck('school_year')
            ->filter()
            ->unique()
            ->sort()
            ->values()
            ->all();

        $settings = $board?->mergedSettings() ?? SchoolBoard::defaultSettings();
        $thresholds = is_array($settings['thresholds'] ?? null)
            ? $settings['thresholds']
            : SchoolBoard::defaultSettings()['thresholds'];
        $this->statusThresholds = [
            'on_track' => (int) ($thresholds['on_track'] ?? 75),
            'monitor' => (int) ($thresholds['monitor'] ?? 50),
            'at_risk' => (int) ($thresholds['at_risk'] ?? 50),
        ];

        $schoolYear = $request->string('school_year')->toString();
        if ($schoolYear === '') {
            $configured = $settings['active_school_year'] ?? null;
            if (is_string($configured) && $configured !== '') {
                $schoolYear = $configured;
            } else {
                $schoolYear = $availableYears[array_key_last($availableYears)] ?? $this->currentSchoolYear();
            }
        }

        [$yearStart, $yearEnd] = $this->schoolYearRange($schoolYear);

        $studentCounts = $this->studentCountsForSchools($boardCode, $schoolIds, $schoolYear);
        $statusBySchool = $this->statusBreakdownBySchool($boardCode, $schoolIds, $schoolYear);
        $successRateByMonth = $this->successRateByMonth($boardCode, $schoolIds, $yearStart, $yearEnd, $schoolYear);

        $schoolRows = $schools->map(function (School $school) use ($studentCounts, $statusBySchool) {
            $schoolKey = (int) $school->id;
            $status = $statusBySchool[$schoolKey] ?? ['on_track' => 0, 'monitor' => 0, 'at_risk' => 0, 'total' => 0];
            $total = max(1, (int) ($status['total'] ?? 0));

            return [
                'id' => $schoolKey,
                'name' => $school->name,
                'city' => $school->city ?? '',
                'students' => (int) ($studentCounts[$schoolKey] ?? 0),
                'on_track' => $this->percent((int) ($status['on_track'] ?? 0), $total),
                'monitor' => $this->percent((int) ($status['monitor'] ?? 0), $total),
                'at_risk' => $this->percent((int) ($status['at_risk'] ?? 0), $total),
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
                'total_students' => $this->studentsForBoard($boardCode, $schoolIds, $schoolYear)->unique('id')->count(),
                'avg_on_track' => $avgOnTrack,
                'latest_trend' => $latestTrend,
            ],
            'success_rate_by_month' => $successRateByMonth,
            'grade_benchmarks' => $this->gradeBenchmarks($boardCode, $schoolIds, $schoolYear),
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

            $payload['classes'] = $this->classesForSchool($school, $schoolYear);
            $allSchoolStudents = $this->studentsForSchool($school, $schoolYear);

            $payload['school'] = array_merge([
                'id' => $school->id,
                'name' => $school->name,
                'city' => $school->city ?? '',
            ], $this->summarizeStudentRows($allSchoolStudents));

            $classId = (int) $request->query('class_id', 0);
            if ($classId > 0) {
                $classIds = collect($payload['classes'])->pluck('id');
                if (! $classIds->contains($classId)) {
                    abort(404, 'Class not found for this school.');
                }

                $payload['students'] = $this->studentsForClass($classId);
            } else {
                $payload['students'] = $allSchoolStudents;
            }
        }

        return response()->json($payload);
    }

    /** @param Collection<int, int> $schoolIds */
    private function gradeBenchmarks(string $boardCode, Collection $schoolIds, string $schoolYear = ''): array
    {
        $classTypes = ClassType::activeOrdered()->get();

        if ($classTypes->isEmpty()) {
            return [];
        }

        $students = $this->studentsForBoard($boardCode, $schoolIds, $schoolYear)
            ->unique('id')
            ->values();

        $lookup = $this->classTypeLookup($classTypes);
        $buckets = [];

        foreach ($classTypes as $type) {
            $buckets[$type->name] = [
                'type' => $type,
                'ateliers' => [],
            ];
        }

        foreach ($students as $student) {
            $resolved = $this->resolveClassTypeName((string) ($student->grade ?? ''), $lookup);
            if ($resolved === null || ! isset($buckets[$resolved])) {
                continue;
            }

            $buckets[$resolved]['ateliers'][] = (int) ($student->current_atelier ?: 0);
        }

        return $classTypes->map(function (ClassType $type) use ($buckets) {
            $ateliers = $buckets[$type->name]['ateliers'];
            $assessmentGrade = $type->assessment_grade ?: ClassType::resolveAssessmentGrade($type->name);
            $target = self::GRADE_TARGETS[$assessmentGrade]
                ?? self::GRADE_TARGETS[ClassType::resolveAssessmentGrade($assessmentGrade)]
                ?? 14;

            return [
                'grade' => $type->name,
                'grade_label' => $type->name,
                'grade_label_fr' => $type->name_fr ?: $type->name,
                'grade_key' => $type->name,
                'target_atelier' => $target,
                'avg_completed' => $ateliers === [] ? 0 : (int) round(array_sum($ateliers) / count($ateliers)),
                'student_count' => count($ateliers),
            ];
        })->values()->all();
    }

    /**
     * @param  Collection<int, ClassType>  $classTypes
     * @return array{by_alias: array<string, string>}
     */
    private function classTypeLookup(Collection $classTypes): array
    {
        $byAlias = [];

        foreach ($classTypes as $type) {
            foreach (array_filter([$type->name, $type->name_fr, $type->code]) as $alias) {
                $byAlias[mb_strtolower(trim((string) $alias))] = $type->name;
            }
        }

        $legacy = [
            'kindergarten' => 'Junior Kindergarten (JK)',
            'maternelle' => 'Junior Kindergarten (JK)',
            'jardin' => 'Senior Kindergarten (SK)',
            '1re année' => 'Grade 1',
            '1re annee' => 'Grade 1',
            '2e année' => 'Grade 2',
            '2e annee' => 'Grade 2',
            '3e année' => 'Grade 3+',
            '3e annee' => 'Grade 3+',
            '3e année+' => 'Grade 3+',
            'grade 3' => 'Grade 3+',
        ];

        foreach ($legacy as $alias => $preferred) {
            if (isset($byAlias[mb_strtolower($preferred)])) {
                $byAlias[$alias] = $preferred;
            }
        }

        return ['by_alias' => $byAlias];
    }

    /** @param  array{by_alias: array<string, string>}  $lookup */
    private function resolveClassTypeName(string $grade, array $lookup): ?string
    {
        $trimmed = trim($grade);
        if ($trimmed === '') {
            return null;
        }

        return $lookup['by_alias'][mb_strtolower($trimmed)] ?? null;
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

    private function studentsForSchool(School $school, string $schoolYear): array
    {
        $classRows = $this->classesForSchool($school, $schoolYear);
        $studentsById = [];

        foreach ($classRows as $classRow) {
            foreach ($this->studentsForClass((int) $classRow['id']) as $student) {
                $studentsById[(int) $student['id']] = $student;
            }
        }

        return collect($studentsById)
            ->sortBy('name')
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

        $onTrackPct = $this->onTrackPercent($statuses);
        if ($onTrackPct >= $this->statusThresholds['on_track']) {
            return 'on_track';
        }
        if ($onTrackPct >= $this->statusThresholds['monitor']) {
            return 'monitor';
        }

        return 'at_risk';
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

    /**
     * Teachers associated with this board: direct board affiliation or assigned school.
     *
     * @param  Collection<int, int>  $schoolIds
     * @return Collection<int, int>
     */
    private function boardTeacherIds(string $boardCode, Collection $schoolIds): Collection
    {
        return User::query()
            ->where('role', 'teacher')
            ->where(function ($query) use ($boardCode, $schoolIds) {
                $query->where('school_board', $boardCode)
                    ->orWhere('requested_board_code', $boardCode);

                if ($schoolIds->isNotEmpty()) {
                    $query->orWhereIn('school_id', $schoolIds);
                }
            })
            ->pluck('id');
    }

    /**
     * Classes belonging to board schools or to teachers associated with the board/schools.
     *
     * @param  Collection<int, int>  $schoolIds
     * @return Collection<int, SchoolClass>
     */
    private function classesForBoard(string $boardCode, Collection $schoolIds, string $schoolYear = ''): Collection
    {
        $teacherIds = $this->boardTeacherIds($boardCode, $schoolIds);

        $query = SchoolClass::query()
            ->with(['teacher', 'students'])
            ->where(function ($q) use ($schoolIds, $teacherIds) {
                if ($schoolIds->isNotEmpty()) {
                    $q->whereIn('school_id', $schoolIds);
                }

                if ($teacherIds->isNotEmpty()) {
                    $method = $schoolIds->isNotEmpty() ? 'orWhereIn' : 'whereIn';
                    $q->{$method}('teacher_id', $teacherIds);
                }

                // Avoid matching every class when both sets are empty.
                if ($schoolIds->isEmpty() && $teacherIds->isEmpty()) {
                    $q->whereRaw('1 = 0');
                }
            })
            ->orderBy('grade')
            ->orderBy('name');

        if ($schoolYear !== '') {
            $query->where('school_year', $schoolYear);
        }

        return $query->get();
    }

    /**
     * Prefer a school id that belongs to this board. Teacher assignment wins when
     * class.school_id is missing or points outside the board school set.
     *
     * @param  Collection<int, int>|null  $allowedSchoolIds
     */
    private function resolveClassSchoolId(SchoolClass $class, ?Collection $allowedSchoolIds = null): ?int
    {
        $classSchoolId = $class->school_id ? (int) $class->school_id : null;
        $teacherSchoolId = $class->teacher?->school_id ? (int) $class->teacher->school_id : null;

        if ($allowedSchoolIds !== null && $allowedSchoolIds->isNotEmpty()) {
            $allowed = $allowedSchoolIds->map(fn ($id) => (int) $id)->all();

            if ($teacherSchoolId && in_array($teacherSchoolId, $allowed, true)) {
                return $teacherSchoolId;
            }

            if ($classSchoolId && in_array($classSchoolId, $allowed, true)) {
                return $classSchoolId;
            }

            return null;
        }

        return $teacherSchoolId ?: $classSchoolId;
    }

    /** @param list<array{id:int,status:string}> $studentRows */
    private function summarizeStudentRows(array $studentRows): array
    {
        $total = count($studentRows);
        $onTrack = 0;
        $monitor = 0;
        $atRisk = 0;

        foreach ($studentRows as $row) {
            match ($row['status'] ?? 'on_track') {
                'monitor' => $monitor++,
                'at_risk' => $atRisk++,
                default => $onTrack++,
            };
        }

        $denom = max(1, $total);

        return [
            'students' => $total,
            'on_track' => $this->percent($onTrack, $denom),
            'monitor' => $this->percent($monitor, $denom),
            'at_risk' => $this->percent($atRisk, $denom),
        ];
    }

    /**
     * @param  Collection<int, int>  $schoolIds
     * @return Collection<int, Student>
     */
    private function studentsForBoard(string $boardCode, Collection $schoolIds, string $schoolYear = ''): Collection
    {
        return $this->classesForBoard($boardCode, $schoolIds, $schoolYear)
            ->flatMap(fn (SchoolClass $class) => $class->students)
            ->values();
    }

    /** @param Collection<int, int> $schoolIds */
    private function studentCountsForSchools(string $boardCode, Collection $schoolIds, string $schoolYear = ''): array
    {
        $counts = [];
        foreach ($schoolIds as $schoolId) {
            $counts[(int) $schoolId] = 0;
        }

        $seenBySchool = [];

        foreach ($this->classesForBoard($boardCode, $schoolIds, $schoolYear) as $class) {
            $schoolId = $this->resolveClassSchoolId($class, $schoolIds);
            if (! $schoolId || ! array_key_exists($schoolId, $counts)) {
                continue;
            }

            foreach ($class->students as $student) {
                $seenBySchool[$schoolId][(int) $student->id] = true;
            }
        }

        foreach ($seenBySchool as $schoolId => $studentMap) {
            $counts[$schoolId] = count($studentMap);
        }

        return $counts;
    }

    /** @param Collection<int, int> $schoolIds */
    private function statusBreakdownBySchool(string $boardCode, Collection $schoolIds, string $schoolYear = ''): array
    {
        $breakdown = [];
        foreach ($schoolIds as $schoolId) {
            $breakdown[(int) $schoolId] = ['on_track' => 0, 'monitor' => 0, 'at_risk' => 0, 'total' => 0];
        }

        $seen = [];

        foreach ($this->classesForBoard($boardCode, $schoolIds, $schoolYear) as $class) {
            $schoolId = $this->resolveClassSchoolId($class, $schoolIds);
            if (! $schoolId || ! isset($breakdown[$schoolId])) {
                continue;
            }

            foreach ($class->students as $student) {
                $studentId = (int) $student->id;
                if (isset($seen[$schoolId][$studentId])) {
                    continue;
                }
                $seen[$schoolId][$studentId] = true;

                $key = match ($student->status) {
                    'monitor' => 'monitor',
                    'at_risk' => 'at_risk',
                    default => 'on_track',
                };
                $breakdown[$schoolId][$key]++;
                $breakdown[$schoolId]['total']++;
            }
        }

        return $breakdown;
    }

    /** @param Collection<int, int> $schoolIds */
    private function successRateByMonth(
        string $boardCode,
        Collection $schoolIds,
        Carbon $yearStart,
        Carbon $yearEnd,
        string $schoolYear
    ): array {
        $classIds = $this->classesForBoard($boardCode, $schoolIds, $schoolYear)->pluck('id');

        $evaluations = $classIds->isEmpty()
            ? collect()
            : StudentEvaluation::query()
                ->whereIn('class_id', $classIds)
                ->whereBetween('updated_at', [$yearStart, $yearEnd])
                ->whereIn('status', ['success', 'adequate', 'needs-improvement'])
                ->get(['status', 'updated_at']);

        $series = [];
        $cursor = $yearStart->copy();
        $fallback = $this->boardOnTrackPercent($boardCode, $schoolIds, $schoolYear);

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
            } else {
                $rate = $fallback;
            }

            $series[] = ['month' => $label, 'rate' => $rate];
            $cursor->addMonth()->startOfMonth();
        }

        if ($series === []) {
            $series[] = ['month' => 'Sep', 'rate' => $fallback];
        }

        return $series;
    }

    /** @param Collection<int, int> $schoolIds */
    private function boardOnTrackPercent(string $boardCode, Collection $schoolIds, string $schoolYear = ''): int
    {
        $students = $this->studentsForBoard($boardCode, $schoolIds, $schoolYear)->unique('id');
        if ($students->isEmpty()) {
            return 0;
        }

        $onTrack = $students->filter(
            fn (Student $student) => $student->status === 'on_track' || $student->status === null || $student->status === ''
        )->count();

        return $this->percent($onTrack, $students->count());
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
        $normalized = \App\Models\SchoolYear::normalizeLabel($schoolYear);
        if (preg_match('/^(\d{4})-(\d{4})$/', $normalized, $matches)) {
            $start = Carbon::create((int) $matches[1], 9, 1)->startOfDay();
            $end = Carbon::create((int) $matches[2], 8, 31)->endOfDay();

            return [$start, $end];
        }

        return $this->schoolYearRange($this->currentSchoolYear());
    }
}
