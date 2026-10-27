<?php

namespace App\Services;

use App\Models\BackupSetting;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;

class BackupScheduleService
{
    public const HEARTBEAT_CACHE_KEY = 'backup_scheduler_heartbeat';

    public function pingScheduler(): void
    {
        Cache::put(self::HEARTBEAT_CACHE_KEY, now()->toIso8601String(), now()->addDay());
    }

    public function lastHeartbeat(): ?Carbon
    {
        $raw = Cache::get(self::HEARTBEAT_CACHE_KEY);
        if (! is_string($raw) || $raw === '') {
            return null;
        }

        try {
            return Carbon::parse($raw);
        } catch (\Throwable) {
            return null;
        }
    }

    public function isSchedulerActive(?Carbon $now = null): bool
    {
        $heartbeat = $this->lastHeartbeat();
        if (! $heartbeat) {
            return false;
        }

        $now = $now ?? Carbon::now();

        // schedule:run should hit every minute; allow a short grace window.
        return $heartbeat->greaterThan($now->copy()->subMinutes(5));
    }

    public function isDue(BackupSetting $settings, ?Carbon $now = null): bool
    {
        if (! $settings->enabled) {
            return false;
        }

        $now = $this->nowInTimezone($settings, $now);
        $target = $this->targetForCurrentPeriod($settings, $now);
        $lastRun = $this->lastRunInTimezone($settings);

        return $now->greaterThanOrEqualTo($target)
            && ($lastRun === null || $lastRun->lessThan($target));
    }

    public function nextRun(BackupSetting $settings, ?Carbon $now = null): ?Carbon
    {
        if (! $settings->enabled) {
            return null;
        }

        $now = $this->nowInTimezone($settings, $now);
        $target = $this->targetForCurrentPeriod($settings, $now);
        $lastRun = $this->lastRunInTimezone($settings);

        // Still waiting for today's/this period's slot, or due and not yet completed.
        if ($now->lessThan($target) || $lastRun === null || $lastRun->lessThan($target)) {
            // If the slot is already past and still due, surface "now" so the UI does not show a past time.
            return $now->greaterThanOrEqualTo($target) ? $now->copy() : $target;
        }

        return $this->advancePeriod($settings, $target);
    }

    public function normalizeTime(string $time): string
    {
        $time = trim($time);
        if (preg_match('/^\d{1,2}:\d{2}(:\d{2})?$/', $time) !== 1) {
            return $time;
        }

        [$hour, $minute] = array_map('intval', explode(':', $time));

        return sprintf('%02d:%02d', $hour, $minute);
    }

    private function nowInTimezone(BackupSetting $settings, ?Carbon $now = null): Carbon
    {
        return ($now ?? Carbon::now())->copy()->setTimezone($settings->timezone ?: config('backup.timezone'));
    }

    private function lastRunInTimezone(BackupSetting $settings): ?Carbon
    {
        return $settings->last_run_at?->copy()->setTimezone($settings->timezone ?: config('backup.timezone'));
    }

    private function targetForCurrentPeriod(BackupSetting $settings, Carbon $now): Carbon
    {
        [$hour, $minute] = array_map(
            'intval',
            explode(':', $this->normalizeTime((string) $settings->time)),
        );

        return match ($settings->frequency) {
            'weekly' => $now->copy()
                ->startOfWeek(Carbon::MONDAY)
                ->addDays(((int) $settings->day_of_week) === 0 ? 6 : ((int) $settings->day_of_week) - 1)
                ->setTime($hour, $minute, 0),
            'monthly' => $this->monthlyTarget($now, $settings)->setTime($hour, $minute, 0),
            default => $now->copy()->setTime($hour, $minute, 0),
        };
    }

    private function advancePeriod(BackupSetting $settings, Carbon $target): Carbon
    {
        return match ($settings->frequency) {
            'weekly' => $target->copy()->addWeek(),
            'monthly' => $this->monthlyTarget($target->copy()->addMonthNoOverflow(), $settings)
                ->setTime($target->hour, $target->minute, 0),
            default => $target->copy()->addDay(),
        };
    }

    private function monthlyTarget(Carbon $date, BackupSetting $settings): Carbon
    {
        $day = min(max(1, (int) $settings->day_of_month), $date->copy()->endOfMonth()->day);

        return $date->copy()->day($day);
    }
}
