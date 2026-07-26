<?php

namespace App\Services;

use App\Mail\PortalEventEmail;
use App\Mail\ResetPasswordEmail;
use App\Mail\TeacherAccountCreatedEmail;
use App\Mail\WelcomeEmail;
use App\Models\SystemAnnouncement;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use Throwable;

class NotificationMailer
{
    public static function sendWelcome(User $user): void
    {
        self::safeSend($user, new WelcomeEmail($user));
    }

    public static function sendVerifyAccount(User $user, string $temporaryPassword): void
    {
        if ($user->role === 'teacher') {
            $activationUrl = URL::temporarySignedRoute(
                'account.activate',
                now()->addDays(7),
                ['user' => $user->id],
            );
            self::safeSend($user, new TeacherAccountCreatedEmail($user, $activationUrl, $temporaryPassword));

            return;
        }

        $activationUrl = URL::temporarySignedRoute(
            'account.activate',
            now()->addDays(7),
            ['user' => $user->id],
        );

        $loginUrl = match ($user->role) {
            'school_admin' => self::frontendUrl('/?portal=ecole'),
            'board_admin' => self::frontendUrl('/?portal=conseil'),
            default => self::frontendUrl('/signin'),
        };

        self::safeSend($user, new PortalEventEmail(
            $user,
            'verify',
            [
                'password' => $temporaryPassword,
                'url' => $loginUrl,
            ],
            $activationUrl,
        ));
    }

    public static function sendResetPassword(User $user, string $resetUrl, int $expiresMinutes = 30): void
    {
        self::safeSend($user, new ResetPasswordEmail($user, $resetUrl, $expiresMinutes));
    }

    public static function sendTrialEnding(User $user, int $daysLeft): void
    {
        self::safeSend($user, new PortalEventEmail(
            $user,
            'trial_ending',
            [
                'days' => $daysLeft,
                'date' => $user->trial_ends_at?->format('F j, Y') ?? '',
            ],
            self::frontendUrl('/subscription'),
        ));
    }

    public static function sendTrialExpired(User $user): void
    {
        self::safeSend($user, new PortalEventEmail(
            $user,
            'trial_expired',
            [
                'date' => $user->trial_ends_at?->format('F j, Y') ?? now()->format('F j, Y'),
            ],
            self::frontendUrl('/subscription'),
        ));
    }

    public static function sendSubscriptionStarted(User $user): void
    {
        self::safeSend($user, new PortalEventEmail(
            $user,
            'subscription_started',
            ['plan' => self::planLabel($user)],
            self::frontendUrl('/subscription'),
        ));
    }

    public static function sendPaymentSuccessful(User $user): void
    {
        self::safeSend($user, new PortalEventEmail(
            $user,
            'payment_successful',
            ['plan' => self::planLabel($user)],
            self::frontendUrl('/subscription'),
        ));
    }

    public static function sendPaymentFailed(User $user): void
    {
        self::safeSend($user, new PortalEventEmail(
            $user,
            'payment_failed',
            [],
            self::frontendUrl('/subscription'),
        ));
    }

    public static function sendSubscriptionRenewed(User $user, ?CarbonInterface $periodEnd = null): void
    {
        self::safeSend($user, new PortalEventEmail(
            $user,
            'subscription_renewed',
            [
                'plan' => self::planLabel($user),
                'date' => $periodEnd?->format('F j, Y') ?? $user->subscription_ends_at?->format('F j, Y') ?? '',
            ],
            self::frontendUrl('/subscription'),
        ));
    }

    public static function sendSubscriptionCancelled(User $user): void
    {
        self::safeSend($user, new PortalEventEmail(
            $user,
            'subscription_cancelled',
            ['date' => $user->subscription_ends_at?->format('F j, Y') ?? ''],
            self::frontendUrl('/subscription'),
        ));
    }

    public static function sendSubscriptionExpired(User $user): void
    {
        self::safeSend($user, new PortalEventEmail(
            $user,
            'subscription_expired',
            ['date' => $user->subscription_ends_at?->format('F j, Y') ?? now()->format('F j, Y')],
            self::frontendUrl('/subscription'),
        ));
    }

    public static function sendAnnouncement(User $user, SystemAnnouncement $announcement): void
    {
        $url = $announcement->url
            ?: match ($user->role) {
                'school_admin' => self::frontendUrl('/school'),
                'board_admin' => self::frontendUrl('/board'),
                default => self::frontendUrl('/library'),
            };

        self::safeSend($user, new PortalEventEmail(
            $user,
            'announcement',
            [
                'title' => $announcement->title,
                'message' => $announcement->message,
            ],
            $url,
        ));
    }

    public static function sendInactiveReminder(User $user): void
    {
        self::safeSend($user, new PortalEventEmail(
            $user,
            'inactive_reminder',
            [],
            self::frontendUrl('/signin'),
        ));
    }

    public static function sendSuspensionReminder(User $user): void
    {
        self::safeSend($user, new PortalEventEmail(
            $user,
            'suspension_reminder',
            [],
            self::frontendUrl('/signin'),
        ));
    }

    private static function planLabel(User $user): string
    {
        return $user->subscription_plan === 'insights' ? 'Insights' : 'Essentials';
    }

    private static function frontendUrl(string $path = '/'): string
    {
        return rtrim(config('app.frontend_url', config('app.url')), '/').$path;
    }

    private static function safeSend(User $user, object $mailable): void
    {
        $email = trim((string) $user->email);
        if ($email === '' || str_ends_with(strtolower($email), '@portal.local')) {
            Log::info('Skipped portal email for non-deliverable address', [
                'user_id' => $user->id,
                'email' => $email,
                'mailable' => $mailable::class,
            ]);

            return;
        }

        try {
            Mail::to($email)->send($mailable);
        } catch (Throwable $e) {
            Log::error('Portal email failed', [
                'user_id' => $user->id,
                'email' => $email,
                'mailable' => $mailable::class,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
