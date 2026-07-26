<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\TeacherNotificationService;
use Illuminate\Console\Command;

class SendInactiveAccountNudges extends Command
{
    protected $signature = 'notifications:inactive-account-nudges';

    protected $description = 'Send inactive-account and suspension-reminder emails to free teacher accounts';

    public function handle(): int
    {
        $missYouCount = 0;
        $suspensionCount = 0;

        User::query()
            ->where('role', 'teacher')
            ->where('account_status', '!=', 'archived')
            ->orderBy('id')
            ->chunkById(100, function ($teachers) use (&$missYouCount, &$suspensionCount) {
                foreach ($teachers as $teacher) {
                    /** @var User $teacher */
                    if (! TeacherNotificationService::eligibleForInactiveNudges($teacher)) {
                        continue;
                    }

                    $days = $teacher->daysSinceLastLogin();
                    if ($days === null) {
                        continue;
                    }

                    if ($days >= TeacherNotificationService::SUSPENSION_WARNING_DAYS) {
                        if (TeacherNotificationService::inactiveAccountNudge($teacher, 'suspension_reminder')) {
                            $suspensionCount++;
                        }
                    }

                    if ($days >= TeacherNotificationService::INACTIVE_REMINDER_DAYS) {
                        if (TeacherNotificationService::inactiveAccountNudge($teacher, 'inactive_reminder')) {
                            $missYouCount++;
                        }
                    }
                }
            });

        $this->info("Inactive reminders ensured: {$missYouCount}");
        $this->info("Suspension reminders ensured: {$suspensionCount}");

        return self::SUCCESS;
    }
}
