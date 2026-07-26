<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\TeacherNotificationService;
use Illuminate\Console\Command;

class SendBillingNotifications extends Command
{
    protected $signature = 'notifications:billing-reminders';

    protected $description = 'Send trial ending soon and subscription expiry notifications to teachers';

    public function handle(): int
    {
        $trialDays = [7, 3, 1];
        $trialCount = 0;
        $expiryCount = 0;
        $expiredCount = 0;

        User::query()
            ->where('role', 'teacher')
            ->where('account_status', 'active')
            ->where('subscription_status', 'trialing')
            ->whereNotNull('trial_ends_at')
            ->where('trial_ends_at', '>', now())
            ->orderBy('id')
            ->chunkById(100, function ($teachers) use ($trialDays, &$trialCount) {
                foreach ($teachers as $teacher) {
                    /** @var User $teacher */
                    if ($teacher->isInstitutionalTeacher() || $teacher->hasActiveSubscription()) {
                        continue;
                    }

                    $daysLeft = $teacher->trialDaysRemaining();
                    if (in_array($daysLeft, $trialDays, true)) {
                        TeacherNotificationService::trialEndingSoon($teacher, $daysLeft);
                        $trialCount++;
                    }
                }
            });

        User::query()
            ->where('role', 'teacher')
            ->where('account_status', 'active')
            ->whereIn('subscription_status', ['canceled', 'cancelled', 'unpaid'])
            ->whereNotNull('subscription_ends_at')
            ->where('subscription_ends_at', '>', now())
            ->where('subscription_ends_at', '<=', now()->addDays(7))
            ->orderBy('id')
            ->chunkById(100, function ($teachers) use (&$expiryCount) {
                foreach ($teachers as $teacher) {
                    /** @var User $teacher */
                    TeacherNotificationService::subscriptionExpiring($teacher);
                    $expiryCount++;
                }
            });

        User::query()
            ->where('role', 'teacher')
            ->where('account_status', 'active')
            ->whereNotNull('subscription_ends_at')
            ->where('subscription_ends_at', '<=', now())
            ->where('subscription_ends_at', '>=', now()->subDays(2))
            ->orderBy('id')
            ->chunkById(100, function ($teachers) use (&$expiredCount) {
                foreach ($teachers as $teacher) {
                    /** @var User $teacher */
                    if ($teacher->hasActiveSubscription() || $teacher->isInstitutionalTeacher()) {
                        continue;
                    }

                    TeacherNotificationService::subscriptionExpired($teacher);
                    $expiredCount++;
                }
            });

        $this->info("Trial reminders created/ensured: {$trialCount}");
        $this->info("Expiry notices created/ensured: {$expiryCount}");
        $this->info("Expired notices created/ensured: {$expiredCount}");

        return self::SUCCESS;
    }
}
