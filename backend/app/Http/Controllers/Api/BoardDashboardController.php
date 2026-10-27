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
use Illuminate\Support\Facades\DB;

class BoardDashboardController extends Controller
{
    private const MONTH_LABELS = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

    /** Reference provincial benchmarks by assessment-grade band. */
    private const PROVINCIAL_BENCHMARKS = [
        'Kindergarten' => 85,
        'Grade 1' => 68,
        'Grade 2' => 71,
        'Grade 3' => 69,
        'Grade 3+' => 69,
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

        $schoolYear = $request->string('school_year')->toString();
        if ($schoolYear === '') {
            $configured = $board?->mergedSettings()['active_school_year'] ?? null;
            if (is_string($configured) && $configured !== '') {
                $schoolYear = $configured;
            } else {
                $schoolYear = $availableYears[array_key_last($availableYears)] ?? $this->currentSchoolYear();
            }
        }

        [$yearStart, $yearEnd] = $this->schoolYearRange($schoolYear);

        $studentCounts = $this->studentCountsForSchools($boardCode, $schoolIds, $schoolYear);
        $statusBySchool = $this->statusBreakdownBySchool($boardCode, $schoolIds, $schoolYear);
        $teacherCounts = User::query()
            ->where('role', 'teacher')
            ->where('account_status', 'active')
            ->where(function ($q) use ($boardCode, $schoolIds) {
                $q->where('school_board', $boardCode)
                    ->orWhereIn('school_id', $schoolIds);
            })
            ->selectRaw('school_id, count(*) as total')
            ->groupBy('school_id')
            ->pluck('total', 'school_id');

        $schoolRows = $schools->map(function (School $school) use ($studentCounts, $statusBySchool, $teacherCounts) {
            $schoolKey = (int) $school->id;
            $status = $statusBySchool[$schoolKey] ?? ['on_track' => 0, 'monitor' => 0, 'at_risk' => 0, 'total' => 0];
            $total = max(1, (int) ($status['total'] ?? 0));

            return [
                'id' => $schoolKey,
                'name' => $school->name,
                'city' => $school->city ?? '',
                'students' => (int) ($studentCounts[$schoolKey] ?? 0),
                'teachers' => (int) ($teacherCounts[$schoolKey] ?? 0),
                'on_track' => $this->percent((int) ($status['on_track'] ?? 0), $total),
                'monitor' => $this->percent((int) ($status['monitor'] ?? 0), $total),
                'at_risk' => $this->percent((int) ($status['at_risk'] ?? 0), $total),
                'trend' => '+0%',
            ];
        })->values()->all();

        $totalStudents = $this->uniqueStudentCountForBoard($boardCode, $schoolIds, $schoolYear);
        $totalTeachers = User::query()
            ->where('role', 'teacher')
            ->where('account_status', 'active')
            ->where(function ($q) use ($boardCode, $schoolIds) {
                $q->where('school_board', $boardCode)
                    ->orWhereIn('school_id', $schoolIds);
            })
            ->count();

        $avgOnTrack = $schoolRows
            ? (int) round(collect($schoolRows)->avg('on_track'))
            : 0;

        foreach ($schoolRows as &$row) {
            $row['trend'] = $this->formatSchoolTrend($row['on_track'], $avgOnTrack);
        }
        unset($row);

        $successRateByMonth = $this->successRateByMonth($boardCode, $schoolIds, $yearStart, $yearEnd, $schoolYear);

        return response()->json([
            'board' => [
                'code' => $boardCode,
                'name' => $board?->name ?? $user->name,
            ],
            'school_year' => $schoolYear,
            'available_years' => $availableYears ?: [$schoolYear],
            'summary' => [
                'participating_schools' => $schools->count(),
                'total_students' => $totalStudents,
                'active_teachers' => $totalTeachers,
                'avg_on_track' => $avgOnTrack,
                'latest_trend' => collect($successRateByMonth)->last()['rate'] ?? $avgOnTrack,
            ],
            'success_rate_by_month' => $successRateByMonth,
            'results_by_grade' => $this->resultsByGrade($boardCode, $schoolIds, $schoolYear),
            'schools' => $schoolRows,
        ]);
    }

    /** @param Collection<int, int> $schoolIds */
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

    /** @param Collection<int, int> $schoolIds */
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

                if ($schoolIds->isEmpty() && $teacherIds->isEmpty()) {
                    $q->whereRaw('1 = 0');
                }
            });

        if ($schoolYear !== '') {
            $query->where('school_year', $schoolYear);
        }

        return $query->get();
    }

    /** @param Collection<int, int>|null $allowedSchoolIds */
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

    /** @param Collection<int, int> $schoolIds */
    private function uniqueStudentCountForBoard(string $boardCode, Collection $schoolIds, string $schoolYear = ''): int
    {
        return $this->classesForBoard($boardCode, $schoolIds, $schoolYear)
            ->flatMap(fn (SchoolClass $class) => $class->students->pluck('id'))
            ->unique()
            ->count();
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
    private function successRateByMonth(string $boardCode, Collection $schoolIds, Carbon $yearStart, Carbon $yearEnd, string $schoolYear): array
    {
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
        $total = $this->uniqueStudentCountForBoard($boardCode, $schoolIds, $schoolYear);
        if ($total <= 0) {
            return 0;
        }

        $onTrack = 0;
        $seen = [];
        foreach ($this->classesForBoard($boardCode, $schoolIds, $schoolYear) as $class) {
            foreach ($class->students as $student) {
                $id = (int) $student->id;
                if (isset($seen[$id])) {
                    continue;
                }
                $seen[$id] = true;
                if ($student->status === 'on_track' || $student->status === null || $student->status === '') {
                    $onTrack++;
                }
            }
        }

        return $this->percent($onTrack, $total);
    }

    /** @param Collection<int, int> $schoolIds */
    private function resultsByGrade(string $boardCode, Collection $schoolIds, string $schoolYear = ''): array
    {
        $classTypes = ClassType::activeOrdered()->get();

        if ($classTypes->isEmpty()) {
            return [];
        }

        $lookup = $this->classTypeLookup($classTypes);
        $totalsByType = [];

        foreach ($classTypes as $type) {
            $totalsByType[$type->name] = ['on_track' => 0, 'total' => 0, 'type' => $type];
        }

        $seen = [];
        foreach ($this->classesForBoard($boardCode, $schoolIds, $schoolYear) as $class) {
            foreach ($class->students as $student) {
                $studentId = (int) $student->id;
                if (isset($seen[$studentId])) {
                    continue;
                }
                $seen[$studentId] = true;

                $resolved = $this->resolveClassTypeName((string) ($student->grade ?? $class->grade ?? ''), $lookup);
                if ($resolved === null || ! isset($totalsByType[$resolved])) {
                    continue;
                }

                $totalsByType[$resolved]['total']++;
                if ($student->status === 'on_track' || $student->status === null || $student->status === '') {
                    $totalsByType[$resolved]['on_track']++;
                }
            }
        }

        return $classTypes->map(function (ClassType $type) use ($totalsByType) {
            $stats = $totalsByType[$type->name];
            $total = (int) $stats['total'];
            $onTrack = (int) $stats['on_track'];
            $assessmentGrade = $type->assessment_grade ?: $type->name;

            return [
                'grade' => $type->name,
                'grade_label' => $type->name,
                'grade_label_fr' => $type->name_fr ?: $type->name,
                // Keep grade_key for older clients; prefer grade_label* for display.
                'grade_key' => $type->name,
                'board' => $total > 0 ? $this->percent($onTrack, $total) : 0,
                'provincial' => self::PROVINCIAL_BENCHMARKS[$assessmentGrade]
                    ?? self::PROVINCIAL_BENCHMARKS[ClassType::resolveAssessmentGrade($assessmentGrade)]
                    ?? 70,
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

        // Legacy student/class grade labels → configured class types.
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

        $key = mb_strtolower($trimmed);

        return $lookup['by_alias'][$key] ?? null;
    }

    private function percent(int $part, int $total): int
    {
        if ($total <= 0) {
            return 0;
        }

        return (int) round(($part / $total) * 100);
    }

    private function formatSchoolTrend(int $schoolOnTrack, int $boardAvg): string
    {
        $delta = $schoolOnTrack - $boardAvg;

        return ($delta >= 0 ? '+' : '').$delta.'%';
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
