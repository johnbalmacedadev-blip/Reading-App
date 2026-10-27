<?php

namespace App\Console\Commands;

use App\Models\PlatformSetting;
use App\Models\User;
use App\Services\NotificationMailer;
use App\Services\TeacherNotificationService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;

class SendBillingNotifications extends Command
{
    protected $signature = 'notifications:billing-reminders';

    protected $description = 'Send trial ending soon, trial expired, and subscription expiry notifications';

    public function handle(): int
    {
        $trialDays = PlatformSetting::trialReminderDaysLeft();
        $trialCount = 0;
        $trialExpiredCount = 0;
        $expiryCount = 0;
        $expiredCount = 0;

        User::query()
            ->whereIn('role', ['teacher', 'school_admin', 'board_admin'])
            ->where('account_status', 'active')
            ->where('subscription_status', 'trialing')
            ->whereNotNull('trial_ends_at')
            ->where('trial_ends_at', '>', now())
            ->orderBy('id')
            ->chunkById(100, function ($users) use ($trialDays, &$trialCount) {
                foreach ($users as $user) {
                    /** @var User $user */
                    if ($user->role === 'teacher' && ($user->isInstitutionalTeacher() || $user->hasActiveSubscription())) {
                        continue;
                    }
                    if ($user->hasActiveSubscription()) {
                        continue;
                    }
                    if (! $user->hasActiveTrial()) {
                        continue;
                    }

                    $daysLeft = $user->trialDaysRemaining();
                    if (! in_array($daysLeft, $trialDays, true)) {
                        continue;
                    }

                    $this->notifyTrialEnding($user, $daysLeft);
                    $trialCount++;
                }
            });

        User::query()
            ->whereIn('role', ['teacher', 'school_admin', 'board_admin'])
            ->where('account_status', 'active')
            ->where('subscription_status', 'trialing')
            ->whereNotNull('trial_ends_at')
            ->where('trial_ends_at', '<=', now())
            ->where('trial_ends_at', '>=', now()->subDays(3))
            ->orderBy('id')
            ->chunkById(100, function ($users) use (&$trialExpiredCount) {
                foreach ($users as $user) {
                    /** @var User $user */
                    if ($user->hasActiveSubscription()) {
                        continue;
                    }
                    if ($user->role === 'teacher' && $user->isInstitutionalTeacher()) {
                        continue;
                    }

                    if (! PlatformSetting::trialExpiredEmailEnabled()) {
                        continue;
                    }

                    $this->notifyTrialExpired($user);
                    $trialExpiredCount++;
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
        $this->info("Trial expired notices created/ensured: {$trialExpiredCount}");
        $this->info("Expiry notices created/ensured: {$expiryCount}");
        $this->info("Expired notices created/ensured: {$expiredCount}");

        return self::SUCCESS;
    }

    private function notifyTrialEnding(User $user, int $daysLeft): void
    {
        if ($user->role === 'teacher') {
            TeacherNotificationService::trialEndingSoon($user, $daysLeft);

            return;
        }

        if (! Cache::add("trial-ending-mail:{$user->id}:{$daysLeft}", 1, now()->addHours(30))) {
            return;
        }

        NotificationMailer::sendTrialEnding($user, $daysLeft);
    }

    private function notifyTrialExpired(User $user): void
    {
        if ($user->role === 'teacher') {
            TeacherNotificationService::trialExpired($user);

            return;
        }

        if (! Cache::add("trial-expired-mail:{$user->id}", 1, now()->addDays(14))) {
            return;
        }

        NotificationMailer::sendTrialExpired($user);
    }
}
