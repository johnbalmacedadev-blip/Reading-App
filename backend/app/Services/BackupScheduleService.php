<?php

namespace App\Services;

use App\Models\BackupSetting;
use Illuminate\Support\Carbon;

class BackupScheduleService
{
    public function isDue(BackupSetting $settings, ?Carbon $now = null): bool
    {
        if (! $settings->enabled) {
            return false;
        }

        $now = ($now ?? Carbon::now())->copy()->setTimezone($settings->timezone);
        $target = $this->targetForCurrentPeriod($settings, $now);
        $lastRun = $settings->last_run_at?->copy()->setTimezone($settings->timezone);

        return $now->greaterThanOrEqualTo($target)
            && ($lastRun === null || $lastRun->lessThan($target));
    }

    public function nextRun(BackupSetting $settings, ?Carbon $now = null): ?Carbon
    {
        if (! $settings->enabled) {
            return null;
        }

        $now = ($now ?? Carbon::now())->copy()->setTimezone($settings->timezone);
        $target = $this->targetForCurrentPeriod($settings, $now);
        $lastRun = $settings->last_run_at?->copy()->setTimezone($settings->timezone);

        if ($now->lessThan($target) || $lastRun === null || $lastRun->lessThan($target)) {
            return $target;
        }

        return match ($settings->frequency) {
            'weekly' => $target->addWeek(),
            'monthly' => $this->monthlyTarget($target->addMonthNoOverflow(), $settings),
            default => $target->addDay(),
        };
    }

    private function targetForCurrentPeriod(BackupSetting $settings, Carbon $now): Carbon
    {
        [$hour, $minute] = array_map('intval', explode(':', $settings->time));

        return match ($settings->frequency) {
            'weekly' => $now->copy()
                ->startOfWeek(Carbon::MONDAY)
                ->addDays($settings->day_of_week === 0 ? 6 : $settings->day_of_week - 1)
                ->setTime($hour, $minute),
            'monthly' => $this->monthlyTarget($now, $settings)->setTime($hour, $minute),
            default => $now->copy()->setTime($hour, $minute),
        };
    }

    private function monthlyTarget(Carbon $date, BackupSetting $settings): Carbon
    {
        $day = min($settings->day_of_month, $date->copy()->endOfMonth()->day);

        return $date->copy()->day($day);
    }
}
