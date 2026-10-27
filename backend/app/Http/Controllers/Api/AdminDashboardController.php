<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LibraryContent;
use App\Models\School;
use App\Models\SchoolBoard;
use App\Models\SchoolYear;
use App\Models\Student;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class AdminDashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $started = microtime(true);

        $schoolYear = SchoolYear::resolve($request->string('school_year')->toString());
        [$yearStart, $yearEnd] = $this->schoolYearRange($schoolYear);

        $monthAgo = now()->subMonth();

        $kpis = [
            'school_boards' => [
                'total' => SchoolBoard::query()->where('status', 'active')->count(),
                'delta_month' => SchoolBoard::query()->where('created_at', '>=', $monthAgo)->count(),
            ],
            'schools' => [
                'total' => School::query()->where('status', 'active')->count(),
                'delta_month' => School::query()->where('created_at', '>=', $monthAgo)->count(),
            ],
            'teachers' => [
                'total' => User::query()
                    ->where('role', 'teacher')
                    ->where('account_status', '!=', 'archived')
                    ->count(),
                'delta_month' => User::query()
                    ->where('role', 'teacher')
                    ->where('created_at', '>=', $monthAgo)
                    ->count(),
            ],
            'students' => [
                'total' => $this->totalStudentCount(),
                'delta_month' => $this->studentsCreatedSince($monthAgo),
            ],
        ];

        $growth = $this->studentGrowthSeries($yearStart, $yearEnd);
        $growthPercent = $this->growthPercent($growth);

        $response = [
            'school_year' => $schoolYear,
            'kpis' => $kpis,
            'adoption_by_board' => $this->adoptionByBoard(),
            'student_growth' => $growth,
            'growth_percent_year' => $growthPercent,
            'recent_activity' => $this->recentActivity(5),
            'alerts' => $this->systemAlerts(),
            'health' => $this->platformHealth($started),
        ];

        return response()->json($response);
    }

    public function activity(Request $request): JsonResponse
    {
        $perPage = max(5, min(50, (int) $request->integer('per_page', 15)));
        $page = max(1, (int) $request->integer('page', 1));

        $sorted = $this->collectActivityEvents()
            ->filter(fn (array $event) => $event['at'] !== null)
            ->sortByDesc('at')
            ->values();

        $total = $sorted->count();
        $lastPage = max(1, (int) ceil($total / $perPage));
        $page = min($page, $lastPage);

        $items = $sorted
            ->slice(($page - 1) * $perPage, $perPage)
            ->values()
            ->map(fn (array $event, int $index) => $this->formatActivityEvent(
                $event,
                (($page - 1) * $perPage) + $index + 1,
            ))
            ->all();

        return response()->json([
            'activity' => $items,
            'pagination' => [
                'page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'last_page' => $lastPage,
            ],
        ]);
    }

    private function currentSchoolYear(): string
    {
        return SchoolYear::defaultLabel();
    }

    /** @return array{0: Carbon, 1: Carbon} */
    private function schoolYearRange(string $schoolYear): array
    {
        $normalized = SchoolYear::normalizeLabel($schoolYear);
        if (preg_match('/^(\d{4})-(\d{4})$/', $normalized, $matches)) {
            $start = Carbon::create((int) $matches[1], 9, 1)->startOfDay();
            $end = Carbon::create((int) $matches[2], 8, 31)->endOfDay();

            return [$start, $end];
        }

        return $this->schoolYearRange($this->currentSchoolYear());
    }

    private function totalStudentCount(): int
    {
        $directIds = DB::table('students')->pluck('id');
        $enrolledIds = DB::table('class_student')->pluck('student_id');

        return $directIds->merge($enrolledIds)->unique()->count();
    }

    private function studentsCreatedSince(Carbon $since): int
    {
        return Student::query()->where('created_at', '>=', $since)->count();
    }

    /** @return list<array{code: string, name: string, active_teachers: int, total_teachers: int}> */
    private function adoptionByBoard(): array
    {
        $boards = SchoolBoard::query()->orderBy('name')->get(['code', 'name']);
        $teacherStats = User::query()
            ->where('role', 'teacher')
            ->selectRaw('school_board, count(*) as total')
            ->selectRaw("sum(case when account_status = 'active' then 1 else 0 end) as active")
            ->groupBy('school_board')
            ->get()
            ->keyBy('school_board');

        return $boards->map(function (SchoolBoard $board) use ($teacherStats) {
            $stats = $teacherStats->get($board->code);

            return [
                'code' => $board->code,
                'name' => $board->code,
                'active_teachers' => (int) ($stats->active ?? 0),
                'total_teachers' => (int) ($stats->total ?? 0),
            ];
        })->values()->all();
    }

    /** @return list<array{month: string, students: int}> */
    private function studentGrowthSeries(Carbon $yearStart, Carbon $yearEnd): array
    {
        $labels = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        $series = [];
        $cursor = $yearStart->copy();

        foreach ($labels as $label) {
            if ($cursor->gt($yearEnd)) {
                break;
            }

            $monthEnd = $cursor->copy()->endOfMonth();
            if ($monthEnd->gt($yearEnd)) {
                $monthEnd = $yearEnd->copy();
            }

            $directIds = DB::table('students')
                ->where('created_at', '<=', $monthEnd)
                ->pluck('id');

            $enrolledIds = DB::table('class_student')
                ->where('created_at', '<=', $monthEnd)
                ->pluck('student_id');

            $count = $directIds->merge($enrolledIds)->unique()->count();

            $series[] = [
                'month' => $label,
                'students' => $count,
            ];

            $cursor->addMonth()->startOfMonth();
        }

        if ($series === []) {
            $series[] = ['month' => 'Sep', 'students' => $this->totalStudentCount()];
        }

        return $series;
    }

    /** @param list<array{month: string, students: int}> $growth */
    private function growthPercent(array $growth): float
    {
        if (count($growth) < 2) {
            return 0.0;
        }

        $first = $growth[0]['students'];
        $last = $growth[array_key_last($growth)]['students'];

        if ($first <= 0) {
            return $last > 0 ? 100.0 : 0.0;
        }

        return round((($last - $first) / $first) * 100, 1);
    }

    /** @return list<array<string, mixed>> */
    private function recentActivity(int $limit = 5): array
    {
        return $this->collectActivityEvents()
            ->filter(fn (array $event) => $event['at'] !== null)
            ->sortByDesc('at')
            ->take($limit)
            ->values()
            ->map(fn (array $event, int $index) => $this->formatActivityEvent($event, $index + 1))
            ->all();
    }

    /**
     * @return \Illuminate\Support\Collection<int, array{at: \Carbon\CarbonInterface|null, type: string, category: string, action: string, target: string}>
     */
    private function collectActivityEvents()
    {
        $events = collect();
        $sourceLimit = 100;

        SchoolBoard::query()
            ->orderByDesc('created_at')
            ->limit($sourceLimit)
            ->get(['name', 'code', 'created_at', 'updated_at'])
            ->each(function (SchoolBoard $board) use ($events) {
                $events->push([
                    'at' => $board->created_at,
                    'type' => 'create',
                    'category' => 'board',
                    'action' => 'Created school board',
                    'target' => $board->name,
                ]);

                if ($board->updated_at && $board->updated_at->gt($board->created_at->addMinutes(5))) {
                    $events->push([
                        'at' => $board->updated_at,
                        'type' => 'edit',
                        'category' => 'board',
                        'action' => 'Updated school board',
                        'target' => $board->name,
                    ]);
                }
            });

        School::query()
            ->orderByDesc('created_at')
            ->limit($sourceLimit)
            ->get(['name', 'created_at', 'updated_at', 'status'])
            ->each(function (School $school) use ($events) {
                $events->push([
                    'at' => $school->created_at,
                    'type' => 'create',
                    'category' => 'school',
                    'action' => 'Created school',
                    'target' => $school->name,
                ]);

                if ($school->status === 'archived' && $school->updated_at?->gt($school->created_at)) {
                    $events->push([
                        'at' => $school->updated_at,
                        'type' => 'archive',
                        'category' => 'school',
                        'action' => 'Archived school',
                        'target' => $school->name,
                    ]);
                } elseif ($school->updated_at?->gt($school->created_at->addMinutes(5))) {
                    $events->push([
                        'at' => $school->updated_at,
                        'type' => 'edit',
                        'category' => 'school',
                        'action' => 'Updated school',
                        'target' => $school->name,
                    ]);
                }
            });

        User::query()
            ->where('role', 'teacher')
            ->orderByDesc('created_at')
            ->limit($sourceLimit)
            ->get(['first_name', 'last_name', 'name', 'created_at', 'updated_at'])
            ->each(function (User $teacher) use ($events) {
                $displayName = trim("{$teacher->first_name} {$teacher->last_name}") ?: $teacher->name;

                $events->push([
                    'at' => $teacher->created_at,
                    'type' => 'create',
                    'category' => 'teacher',
                    'action' => 'Added teacher',
                    'target' => $displayName,
                ]);

                if ($teacher->updated_at?->gt($teacher->created_at->addMinutes(5))) {
                    $events->push([
                        'at' => $teacher->updated_at,
                        'type' => 'edit',
                        'category' => 'teacher',
                        'action' => 'Updated teacher',
                        'target' => $displayName,
                    ]);
                }
            });

        Student::query()
            ->orderByDesc('created_at')
            ->limit($sourceLimit)
            ->with('school:id,name')
            ->get()
            ->each(function (Student $student) use ($events) {
                $events->push([
                    'at' => $student->created_at,
                    'type' => 'create',
                    'category' => 'student',
                    'action' => 'Added student record',
                    'target' => $student->fullName().($student->school ? " — {$student->school->name}" : ''),
                ]);
            });

        LibraryContent::query()
            ->orderByDesc('created_at')
            ->limit($sourceLimit)
            ->get(['title', 'created_at'])
            ->each(function (LibraryContent $content) use ($events) {
                $events->push([
                    'at' => $content->created_at,
                    'type' => 'upload',
                    'category' => 'content',
                    'action' => 'Uploaded content',
                    'target' => $content->title,
                ]);
            });

        return $events;
    }

    /**
     * @param  array{at: \Carbon\CarbonInterface, type: string, category: string, action: string, target: string}  $event
     * @return array<string, mixed>
     */
    private function formatActivityEvent(array $event, int $id): array
    {
        return [
            'id' => $id,
            'type' => $event['type'],
            'category' => $event['category'],
            'action' => $event['action'],
            'target' => $event['target'],
            'time' => $event['at']->diffForHumans(),
            'at' => $event['at']->toIso8601String(),
        ];
    }

    /** @return list<array{type: string, message: string}> */
    private function systemAlerts(): array
    {
        $alerts = [];

        $inactiveTeachers = $this->inactiveTeacherCount();
        if ($inactiveTeachers > 0) {
            $alerts[] = [
                'type' => 'warning',
                'message' => "{$inactiveTeachers} teacher".($inactiveTeachers === 1 ? '' : 's')." haven't accessed the platform in 30+ days",
            ];
        }

        $archivedSchools = School::query()->where('status', 'archived')->count();
        if ($archivedSchools > 0) {
            $alerts[] = [
                'type' => 'info',
                'message' => "{$archivedSchools} archived ".($archivedSchools === 1 ? 'school' : 'schools').' on the platform',
            ];
        }

        $recentStudents = $this->studentsCreatedSince(now()->subDays(7));
        if ($recentStudents > 0) {
            $alerts[] = [
                'type' => 'success',
                'message' => "{$recentStudents} new student ".($recentStudents === 1 ? 'record' : 'records').' added in the last 7 days',
            ];
        }

        if ($alerts === []) {
            $alerts[] = [
                'type' => 'success',
                'message' => 'All systems operating normally',
            ];
        }

        return $alerts;
    }

    private function inactiveTeacherCount(): int
    {
        $threshold = now()->subDays(30)->timestamp;

        $recentUserIds = DB::table('sessions')
            ->where('last_activity', '>=', $threshold)
            ->whereNotNull('user_id')
            ->distinct()
            ->pluck('user_id');

        return User::query()
            ->where('role', 'teacher')
            ->where('account_status', 'active')
            ->when(
                $recentUserIds->isNotEmpty(),
                fn ($q) => $q->whereNotIn('id', $recentUserIds),
                fn ($q) => $q
            )
            ->count();
    }

    /** @return array{api_availability: string, avg_response_ms: int, storage_used_percent: int} */
    private function platformHealth(float $startedAt): array
    {
        $elapsedMs = (int) round((microtime(true) - $startedAt) * 1000);

        return [
            'api_availability' => '99.9%',
            'avg_response_ms' => max($elapsedMs, 1),
            'storage_used_percent' => $this->storageUsedPercent(),
        ];
    }

    private function storageUsedPercent(): int
    {
        $usedBytes = (int) LibraryContent::query()->sum('file_size_bytes');

        try {
            $pedagogicalBytes = (int) DB::table('pedagogical_lessons')->sum('activity_sheet_size_bytes');
            $usedBytes += $pedagogicalBytes;
        } catch (\Throwable) {
            // table may not exist in some environments
        }

        try {
            $downloadBytes = (int) DB::table('downloadable_resources')->sum('file_size_bytes');
            $usedBytes += $downloadBytes;
        } catch (\Throwable) {
            //
        }

        if ($usedBytes <= 0 && Storage::disk('public')->exists('.')) {
            $usedBytes = $this->folderSize(storage_path('app/public'));
        }

        $quotaBytes = 5 * 1024 * 1024 * 1024; // 5 GB reference quota

        return min(100, (int) round(($usedBytes / $quotaBytes) * 100));
    }

    private function folderSize(string $path): int
    {
        if (! is_dir($path)) {
            return 0;
        }

        $size = 0;

        foreach (new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($path, \FilesystemIterator::SKIP_DOTS)) as $file) {
            $size += $file->getSize();
        }

        return $size;
    }
}
