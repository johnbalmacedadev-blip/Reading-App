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

class BoardDashboardController extends Controller
{
    private const MONTH_LABELS = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

    /** Reference provincial benchmarks (external data, not stored per board). */
    private const PROVINCIAL_BENCHMARKS = [
        'Kindergarten' => 85,
        'Grade 1' => 68,
        'Grade 2' => 71,
        'Grade 3' => 69,
    ];

    private const GRADE_KEYS = [
        'Kindergarten' => 'grade.kindergarten',
        'Grade 1' => 'grade.grade1',
        'Grade 2' => 'grade.grade2',
        'Grade 3' => 'grade.grade3',
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
            $status = $statusBySchool[$school->id] ?? ['on_track' => 0, 'monitor' => 0, 'at_risk' => 0, 'total' => 0];
            $total = max(1, $status['total']);

            return [
                'id' => $school->id,
                'name' => $school->name,
                'city' => $school->city ?? '',
                'students' => $studentCounts[$school->id] ?? 0,
                'teachers' => (int) ($teacherCounts[$school->id] ?? 0),
                'on_track' => $this->percent($status['on_track'], $total),
                'monitor' => $this->percent($status['monitor'], $total),
                'at_risk' => $this->percent($status['at_risk'], $total),
                'trend' => $this->formatTrend($status['on_track'], $status['total']),
            ];
        })->values()->all();

        $totalStudents = array_sum($studentCounts);
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
            ],
            'success_rate_by_month' => $this->successRateByMonth($schoolIds, $yearStart, $yearEnd, $schoolYear),
            'results_by_grade' => $this->resultsByGrade($schoolIds),
            'schools' => $schoolRows,
        ]);
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

    /** @param Collection<int, int> $schoolIds */
    private function resultsByGrade(Collection $schoolIds): array
    {
        if ($schoolIds->isEmpty()) {
            return [];
        }

        $rows = Student::query()
            ->whereIn('school_id', $schoolIds)
            ->selectRaw('grade')
            ->selectRaw("sum(case when status = 'on_track' or status is null then 1 else 0 end) as on_track")
            ->selectRaw('count(*) as total')
            ->groupBy('grade')
            ->get();

        $order = ['Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3'];

        return collect($order)->map(function (string $grade) use ($rows) {
            $row = $rows->firstWhere('grade', $grade);
            $total = (int) ($row->total ?? 0);
            $onTrack = (int) ($row->on_track ?? 0);

            return [
                'grade_key' => self::GRADE_KEYS[$grade] ?? $grade,
                'board' => $total > 0 ? $this->percent($onTrack, $total) : 0,
                'provincial' => self::PROVINCIAL_BENCHMARKS[$grade] ?? 70,
            ];
        })->values()->all();
    }

    private function percent(int $part, int $total): int
    {
        if ($total <= 0) {
            return 0;
        }

        return (int) round(($part / $total) * 100);
    }

    private function formatTrend(int $onTrack, int $total): string
    {
        if ($total <= 0) {
            return '0%';
        }

        $pct = (int) round(($onTrack / $total) * 100);

        return $pct >= 75 ? '+'.min(8, max(1, $pct - 70)).'%' : '+0%';
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
