<?php

namespace App\Services;

use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentEvaluation;
use App\Models\SystemAnnouncement;
use App\Models\TeacherNotification;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\App;

class TeacherNotificationService
{
    /** Days without login before the “we miss you” inactive reminder. */
    public const INACTIVE_REMINDER_DAYS = 90;

    /** Days without login before the suspension warning (30 days before suspension). */
    public const SUSPENSION_WARNING_DAYS = 120;

    /** Days without login when a free account is considered suspended. */
    public const SUSPENSION_DAYS = 150;

    public static function trialStarted(User $teacher): void
    {
        if (! $teacher->hasActiveTrial()) {
            return;
        }

        $locale = EmailLocale::resolve($teacher);
        $date = self::formatDate($teacher->trial_ends_at, $locale);

        self::create(
            $teacher,
            "trial-started:{$teacher->id}",
            'info',
            self::text($locale, 'notifications.trial_started.title'),
            self::text($locale, 'notifications.trial_started.message', ['date' => $date]),
            '/subscription',
        );
    }

    public static function trialEndingSoon(User $teacher, int $daysLeft): void
    {
        if ($daysLeft < 1 || ! $teacher->hasActiveTrial() || $teacher->isInstitutionalTeacher()) {
            return;
        }

        $locale = EmailLocale::resolve($teacher);
        $ends = self::formatDate($teacher->trial_ends_at, $locale) ?: self::soonLabel($locale);

        self::create(
            $teacher,
            "trial-ending:{$teacher->id}:{$daysLeft}",
            'warning',
            self::text($locale, 'notifications.trial_ending.title'),
            self::choice($locale, 'notifications.trial_ending.message', $daysLeft, [
                'days' => $daysLeft,
                'date' => $ends,
            ]),
            '/subscription',
            'trial_ending',
            ['days' => $daysLeft],
        );
    }

    public static function subscriptionActivated(User $teacher): void
    {
        $locale = EmailLocale::resolve($teacher);
        $plan = self::planLabel($teacher, $locale);

        self::create(
            $teacher,
            'subscription-activated:'.($teacher->stripe_subscription_id ?: $teacher->id),
            'success',
            self::text($locale, 'notifications.subscription_activated.title'),
            self::text($locale, 'notifications.subscription_activated.message', ['plan' => $plan]),
            '/subscription',
            'subscription_started',
        );

        self::create(
            $teacher,
            'payment-successful:'.($teacher->stripe_subscription_id ?: $teacher->id),
            'success',
            self::text($locale, 'notifications.payment_successful.title'),
            self::text($locale, 'notifications.payment_successful.message', ['plan' => $plan]),
            '/subscription',
            'payment_successful',
        );
    }

    public static function paymentFailed(User $teacher, ?string $invoiceId = null): void
    {
        $locale = EmailLocale::resolve($teacher);

        self::create(
            $teacher,
            'payment-failed:'.($invoiceId ?: ($teacher->stripe_subscription_id ?: $teacher->id).':'.now()->toDateString()),
            'warning',
            self::text($locale, 'notifications.payment_failed.title'),
            self::text($locale, 'notifications.payment_failed.message'),
            '/subscription',
            'payment_failed',
        );
    }

    public static function subscriptionRenewed(User $teacher, ?string $invoiceId = null, ?CarbonInterface $periodEnd = null): void
    {
        $locale = EmailLocale::resolve($teacher);
        $plan = self::planLabel($teacher, $locale);
        $until = self::formatDate($periodEnd, $locale);

        self::create(
            $teacher,
            'subscription-renewed:'.($invoiceId ?: ($teacher->stripe_subscription_id ?: $teacher->id).':'.($periodEnd?->toDateString() ?? now()->toDateString())),
            'success',
            self::text($locale, 'notifications.subscription_renewed.title'),
            $until
                ? self::text($locale, 'notifications.subscription_renewed.message_until', ['plan' => $plan, 'date' => $until])
                : self::text($locale, 'notifications.subscription_renewed.message', ['plan' => $plan]),
            '/subscription',
            'subscription_renewed',
            ['period_end' => $periodEnd],
        );
    }

    public static function subscriptionCancelled(User $teacher): void
    {
        $locale = EmailLocale::resolve($teacher);
        $ends = self::formatDate($teacher->subscription_ends_at, $locale);

        self::create(
            $teacher,
            'subscription-cancelled:'.($teacher->stripe_subscription_id ?: $teacher->id),
            'warning',
            self::text($locale, 'notifications.subscription_cancelled.title'),
            $ends
                ? self::text($locale, 'notifications.subscription_cancelled.message_until', ['date' => $ends])
                : self::text($locale, 'notifications.subscription_cancelled.message'),
            '/subscription',
            'subscription_cancelled',
        );
    }

    public static function subscriptionExpiring(User $teacher): void
    {
        if (! $teacher->subscription_ends_at) {
            return;
        }

        $locale = EmailLocale::resolve($teacher);
        $ends = self::formatDate($teacher->subscription_ends_at, $locale);

        self::create(
            $teacher,
            "subscription-expiring:{$teacher->id}:{$teacher->subscription_ends_at->toDateString()}",
            'warning',
            self::text($locale, 'notifications.subscription_expiring.title'),
            self::text($locale, 'notifications.subscription_expiring.message', ['date' => $ends]),
            '/subscription',
        );
    }

    public static function subscriptionExpired(User $teacher): void
    {
        if (! $teacher->subscription_ends_at || $teacher->subscription_ends_at->isFuture()) {
            return;
        }

        $locale = EmailLocale::resolve($teacher);
        $ends = self::formatDate($teacher->subscription_ends_at, $locale);

        self::create(
            $teacher,
            "subscription-expired:{$teacher->id}:{$teacher->subscription_ends_at->toDateString()}",
            'warning',
            self::text($locale, 'notifications.subscription_expired.title'),
            self::text($locale, 'notifications.subscription_expired.message', ['date' => $ends]),
            '/subscription',
            'subscription_expired',
        );
    }

    /**
     * Admin-triggered notice that always creates a fresh in-app notification and email.
     *
     * @param  'trial_ending'|'trial_expired'  $type
     */
    public static function adminForceTrialNotice(User $teacher, string $type): void
    {
        $locale = EmailLocale::resolve($teacher);
        $ends = self::formatDate($teacher->trial_ends_at, $locale) ?: self::formatDate(now(), $locale);
        $stamp = now()->format('YmdHis');

        if ($type === 'trial_ending') {
            $daysLeft = max(1, $teacher->trialDaysRemaining());
            if ($teacher->trial_ends_at && $teacher->trial_ends_at->isPast()) {
                $daysLeft = 1;
            }

            TeacherNotification::query()->create([
                'teacher_id' => $teacher->id,
                'event_key' => "admin-trial-ending:{$teacher->id}:{$stamp}",
                'type' => 'warning',
                'title' => self::text($locale, 'notifications.trial_ending.title'),
                'message' => self::choice($locale, 'notifications.trial_ending.message', $daysLeft, [
                    'days' => $daysLeft,
                    'date' => $ends,
                ]),
                'url' => '/subscription',
            ]);
            NotificationMailer::sendTrialEnding($teacher, $daysLeft);

            return;
        }

        TeacherNotification::query()->create([
            'teacher_id' => $teacher->id,
            'event_key' => "admin-trial-expired:{$teacher->id}:{$stamp}",
            'type' => 'warning',
            'title' => self::text($locale, 'notifications.trial_expired.title'),
            'message' => self::text($locale, 'notifications.trial_expired.message', ['date' => $ends]),
            'url' => '/subscription',
        ]);
        NotificationMailer::sendTrialExpired($teacher);
    }

    /**
     * @param  'inactive_reminder'|'suspension_reminder'  $type
     */
    public static function inactiveAccountNudge(User $teacher, string $type, bool $force = false): bool
    {
        if (! $force && ! self::eligibleForInactiveNudges($teacher)) {
            return false;
        }

        $locale = EmailLocale::resolve($teacher);
        $activityKey = ($teacher->last_login_at ?? $teacher->created_at)?->toDateString() ?? 'none';
        $isInactiveReminder = $type === 'inactive_reminder';

        $eventKey = $force
            ? ($isInactiveReminder
                ? "admin-inactive-reminder:{$teacher->id}:".now()->format('YmdHis')
                : "admin-suspension-reminder:{$teacher->id}:".now()->format('YmdHis'))
            : ($isInactiveReminder
                ? "inactive-reminder:{$teacher->id}:{$activityKey}"
                : "suspension-reminder:{$teacher->id}:{$activityKey}");

        $title = self::text(
            $locale,
            $isInactiveReminder ? 'notifications.inactive_reminder.title' : 'notifications.suspension_reminder.title'
        );
        $message = self::text(
            $locale,
            $isInactiveReminder ? 'notifications.inactive_reminder.message' : 'notifications.suspension_reminder.message'
        );

        if ($force) {
            TeacherNotification::query()->create([
                'teacher_id' => $teacher->id,
                'event_key' => $eventKey,
                'type' => $isInactiveReminder ? 'info' : 'warning',
                'title' => $title,
                'message' => $message,
                'url' => '/signin',
            ]);
            if ($isInactiveReminder) {
                NotificationMailer::sendInactiveReminder($teacher);
            } else {
                NotificationMailer::sendSuspensionReminder($teacher);
            }

            return true;
        }

        $notification = TeacherNotification::query()->firstOrCreate(
            ['event_key' => $eventKey],
            [
                'teacher_id' => $teacher->id,
                'type' => $isInactiveReminder ? 'info' : 'warning',
                'title' => $title,
                'message' => $message,
                'url' => '/signin',
            ],
        );

        if (! $notification->wasRecentlyCreated) {
            return false;
        }

        if ($isInactiveReminder) {
            NotificationMailer::sendInactiveReminder($teacher);
        } else {
            NotificationMailer::sendSuspensionReminder($teacher);
        }

        return true;
    }

    public static function eligibleForInactiveNudges(User $teacher): bool
    {
        if ($teacher->role !== 'teacher' || $teacher->account_status === 'archived') {
            return false;
        }

        if ($teacher->isInstitutionalTeacher() || $teacher->hasActiveSubscription()) {
            return false;
        }

        return true;
    }

    public static function systemAnnouncement(User $teacher, SystemAnnouncement $announcement): void
    {
        self::create(
            $teacher,
            "announcement:{$announcement->id}:teacher:{$teacher->id}",
            $announcement->notificationType(),
            $announcement->title,
            $announcement->message,
            $announcement->url ?: null,
            'announcement',
            ['announcement' => $announcement],
        );
    }

    public static function classCreated(User $teacher, SchoolClass $schoolClass): void
    {
        $locale = EmailLocale::resolve($teacher);

        self::create(
            $teacher,
            "class-created:{$schoolClass->id}",
            'info',
            self::text($locale, 'notifications.class_created.title'),
            self::text($locale, 'notifications.class_created.message', ['class' => $schoolClass->name]),
            "/class/{$schoolClass->id}",
        );
    }

    public static function studentAdded(User $teacher, SchoolClass $schoolClass, Student $student): void
    {
        $locale = EmailLocale::resolve($teacher);

        self::create(
            $teacher,
            "student-added:{$schoolClass->id}:{$student->id}",
            'success',
            self::text($locale, 'notifications.student_added.title'),
            self::text($locale, 'notifications.student_added.message', [
                'student' => $student->fullName(),
                'class' => $schoolClass->name,
            ]),
            "/class/{$schoolClass->id}",
        );
    }

    public static function evaluationUpdated(
        User $teacher,
        SchoolClass $schoolClass,
        Student $student,
        StudentEvaluation $evaluation,
    ): void {
        if ($evaluation->status === 'needs-improvement' && ! $evaluation->not_required) {
            $locale = EmailLocale::resolve($teacher);

            self::create(
                $teacher,
                "student-support:{$evaluation->id}",
                'warning',
                self::text($locale, 'notifications.student_support.title'),
                self::text($locale, 'notifications.student_support.message', [
                    'student' => $student->fullName(),
                    'atelier' => $evaluation->atelier_number,
                ]),
                "/evaluation/{$student->id}/{$evaluation->atelier_number}?classId={$schoolClass->id}",
            );
        }

        self::createWorkshopNotificationsIfComplete(
            $teacher,
            $schoolClass,
            (int) $evaluation->atelier_number,
        );
    }

    private static function createWorkshopNotificationsIfComplete(
        User $teacher,
        SchoolClass $schoolClass,
        int $atelierNumber,
    ): void {
        $studentCount = $schoolClass->students()->count();
        if ($studentCount === 0) {
            return;
        }

        $completedCount = StudentEvaluation::query()
            ->where('class_id', $schoolClass->id)
            ->where('atelier_number', $atelierNumber)
            ->get()
            ->filter(fn (StudentEvaluation $evaluation) => $evaluation->not_required
                || ($evaluation->responses !== null && $evaluation->responses !== []))
            ->pluck('student_id')
            ->unique()
            ->count();

        if ($completedCount < $studentCount) {
            return;
        }

        $locale = EmailLocale::resolve($teacher);

        self::create(
            $teacher,
            "workshop-completed:{$schoolClass->id}:{$atelierNumber}",
            'success',
            self::text($locale, 'notifications.workshop_completed.title'),
            self::text($locale, 'notifications.workshop_completed.message', [
                'atelier' => $atelierNumber,
                'class' => $schoolClass->name,
            ]),
            "/class/{$schoolClass->id}",
        );

        if ($teacher->canAccessReports()) {
            self::create(
                $teacher,
                "report-ready:{$schoolClass->id}:{$atelierNumber}",
                'info',
                self::text($locale, 'notifications.report_ready.title'),
                self::text($locale, 'notifications.report_ready.message', [
                    'atelier' => $atelierNumber,
                    'class' => $schoolClass->name,
                ]),
                "/reports?class_id={$schoolClass->id}",
            );
        }
    }

    private static function create(
        User $teacher,
        string $eventKey,
        string $type,
        string $title,
        string $message,
        ?string $url = null,
        ?string $emailEvent = null,
        array $emailParams = [],
    ): void {
        $notification = TeacherNotification::query()->firstOrCreate(
            ['event_key' => $eventKey],
            [
                'teacher_id' => $teacher->id,
                'type' => $type,
                'title' => $title,
                'message' => $message,
                'url' => $url,
            ],
        );

        if ($notification->wasRecentlyCreated && $emailEvent) {
            match ($emailEvent) {
                'trial_ending' => NotificationMailer::sendTrialEnding($teacher, (int) ($emailParams['days'] ?? 1)),
                'subscription_started' => NotificationMailer::sendSubscriptionStarted($teacher),
                'payment_successful' => NotificationMailer::sendPaymentSuccessful($teacher),
                'payment_failed' => NotificationMailer::sendPaymentFailed($teacher),
                'subscription_renewed' => NotificationMailer::sendSubscriptionRenewed($teacher, $emailParams['period_end'] ?? null),
                'subscription_cancelled' => NotificationMailer::sendSubscriptionCancelled($teacher),
                'subscription_expired' => NotificationMailer::sendSubscriptionExpired($teacher),
                'inactive_reminder' => NotificationMailer::sendInactiveReminder($teacher),
                'suspension_reminder' => NotificationMailer::sendSuspensionReminder($teacher),
                'announcement' => isset($emailParams['announcement'])
                    ? NotificationMailer::sendAnnouncement($teacher, $emailParams['announcement'])
                    : null,
                default => null,
            };
        }
    }

    private static function planLabel(User $teacher, string $locale): string
    {
        if ($teacher->subscription_plan === 'insights') {
            return 'Insights';
        }

        return 'Essentials';
    }

    private static function formatDate(?CarbonInterface $date, string $locale): ?string
    {
        if (! $date) {
            return null;
        }

        return $date->copy()->locale($locale)->translatedFormat($locale === 'fr' ? 'j F Y' : 'F j, Y');
    }

    private static function soonLabel(string $locale): string
    {
        return $locale === 'fr' ? 'bientôt' : 'soon';
    }

    /** @param array<string, mixed> $replace */
    private static function text(string $locale, string $key, array $replace = []): string
    {
        $previous = App::getLocale();
        App::setLocale($locale);
        try {
            return (string) __($key, $replace);
        } finally {
            App::setLocale($previous);
        }
    }

    /** @param array<string, mixed> $replace */
    private static function choice(string $locale, string $key, int $number, array $replace = []): string
    {
        $previous = App::getLocale();
        App::setLocale($locale);
        try {
            return (string) trans_choice($key, $number, $replace);
        } finally {
            App::setLocale($previous);
        }
    }
}
