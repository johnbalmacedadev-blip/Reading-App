<?php

namespace App\Services;

use App\Mail\PortalEventEmail;
use App\Mail\ResetPasswordEmail;
use App\Mail\TeacherAccountCreatedEmail;
use App\Mail\WelcomeEmail;
use App\Mail\EmailBlastMail;
use App\Mail\AdminAccountChangeEmail;
use App\Models\PlatformSetting;
use App\Models\SupportTicket;
use App\Models\SystemAnnouncement;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use Throwable;

class NotificationMailer
{
    public static function sendWelcome(User $user, ?string $temporaryPassword = null): void
    {
        self::safeSend($user, new WelcomeEmail($user, $temporaryPassword));
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
        $to = trim((string) ($user->contact_email ?: $user->email));
        $result = self::safeSendToAddress(
            $to,
            new ResetPasswordEmail($user, $resetUrl, $expiresMinutes),
            $user->id,
        );

        if ($result === 'failed' || $result === 'skipped') {
            throw new \RuntimeException(
                $result === 'skipped'
                    ? 'No deliverable email address is configured for this account.'
                    : 'Unable to send reset email.'
            );
        }
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
            self::subscriptionUrl($user),
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
            self::subscriptionUrl($user),
        ));
    }

    public static function sendTrialExtended(User $user, int $days): void
    {
        self::safeSend($user, new PortalEventEmail(
            $user,
            'trial_extended',
            [
                'days' => $days,
                'date' => $user->trial_ends_at?->format('F j, Y') ?? '',
            ],
            self::subscriptionUrl($user),
        ));
    }

    public static function sendSubscriptionStarted(User $user): void
    {
        self::safeSend($user, new PortalEventEmail(
            $user,
            'subscription_started',
            ['plan' => self::planLabel($user)],
            self::subscriptionUrl($user),
        ));
    }

    public static function sendPaymentSuccessful(User $user): void
    {
        self::safeSend($user, new PortalEventEmail(
            $user,
            'payment_successful',
            ['plan' => self::planLabel($user)],
            self::subscriptionUrl($user),
        ));
    }

    public static function sendPaymentFailed(User $user): void
    {
        self::safeSend($user, new PortalEventEmail(
            $user,
            'payment_failed',
            [],
            self::subscriptionUrl($user),
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
            self::subscriptionUrl($user),
        ));
    }

    public static function sendSubscriptionCancelled(User $user): void
    {
        self::safeSend($user, new PortalEventEmail(
            $user,
            'subscription_cancelled',
            ['date' => $user->subscription_ends_at?->format('F j, Y') ?? ''],
            self::subscriptionUrl($user),
        ));
    }

    public static function sendSubscriptionExpired(User $user): void
    {
        self::safeSend($user, new PortalEventEmail(
            $user,
            'subscription_expired',
            ['date' => $user->subscription_ends_at?->format('F j, Y') ?? now()->format('F j, Y')],
            self::subscriptionUrl($user),
        ));
    }

    /**
     * Notify a board portal that one of its schools was just onboarded.
     */
    public static function sendSchoolAdded(
        User $boardAdmin,
        string $schoolName,
        string $boardName,
        int $teacherCount = 0,
    ): void {
        $teachers = $teacherCount > 0
            ? (string) __('emails.school_added_teachers', ['count' => $teacherCount], EmailLocale::resolve($boardAdmin))
            : '';

        self::safeSend($boardAdmin, new PortalEventEmail(
            $boardAdmin,
            'school_added',
            [
                'school' => $schoolName,
                'board' => $boardName,
                'teachers' => $teachers,
            ],
            self::frontendUrl('/board'),
        ));
    }

    public static function sendAnnouncement(User $user, SystemAnnouncement $announcement): string
    {
        $url = $announcement->url
            ?: match ($user->role) {
                'school_admin' => self::frontendUrl('/school'),
                'board_admin' => self::frontendUrl('/board'),
                default => self::frontendUrl('/library'),
            };

        return self::safeSend($user, new PortalEventEmail(
            $user,
            'announcement',
            [
                'title' => $announcement->title,
                'message' => $announcement->message,
            ],
            $url,
        ));
    }

    /** Notify the configured support inbox about a new ticket. @return 'sent'|'skipped'|'failed' */
    public static function sendSupportTicket(SupportTicket $ticket): string
    {
        $to = trim((string) PlatformSetting::getValue('support_email', 'support@lecturesci.ca'));
        if ($to === '' || ! filter_var($to, FILTER_VALIDATE_EMAIL)) {
            Log::warning('Support ticket email skipped — invalid support_email', [
                'ticket_id' => $ticket->id,
                'support_email' => $to,
            ]);

            return 'skipped';
        }

        $user = $ticket->user;
        $roleLabel = match ($user?->role) {
            'school_admin' => 'School admin',
            'board_admin' => 'School board admin',
            'teacher' => 'Teacher',
            default => $user?->role ?? 'User',
        };

        $subject = "[Support #{$ticket->id}] {$ticket->subject}";
        $body = '<p><strong>New support ticket</strong></p>'
            .'<p><strong>From:</strong> '.e($user?->displayName() ?? 'Unknown')
            .' &lt;'.e((string) ($user?->email ?? '')).'&gt; ('.e($roleLabel).')</p>'
            .'<p><strong>Category:</strong> '.e($ticket->categoryLabel()).'</p>'
            .'<p><strong>Priority:</strong> '.e($ticket->priority).'</p>'
            .'<p><strong>Subject:</strong> '.e($ticket->subject).'</p>'
            .'<p><strong>Message:</strong></p>'
            .'<p>'.nl2br(e($ticket->message)).'</p>'
            .'<p style="color:#64748b;font-size:12px;">Ticket #'.$ticket->id
            .' · '.e(optional($ticket->created_at)->toDateTimeString() ?? '').'</p>';

        try {
            Mail::html($body, function ($message) use ($to, $subject, $user) {
                $message->to($to)->subject($subject);
                $reply = trim((string) ($user?->email ?? ''));
                if ($reply !== '' && ! str_ends_with(strtolower($reply), '@portal.local')) {
                    $message->replyTo($reply, $user?->displayName() ?? $reply);
                }
            });

            return 'sent';
        } catch (Throwable $e) {
            Log::error('Support ticket email failed', [
                'ticket_id' => $ticket->id,
                'support_email' => $to,
                'error' => $e->getMessage(),
            ]);

            return 'failed';
        }
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

    /**
     * Send a custom HTML email blast (admin mass mail).
     *
     * @param  list<string>  $attachmentPaths
     * @return 'sent'|'skipped'|'failed'
     */
    public static function sendEmailBlast(User $user, string $subject, string $htmlBody, array $attachmentPaths = []): string
    {
        return self::safeSend($user, new EmailBlastMail($user, $subject, $htmlBody, $attachmentPaths));
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

    /**
     * Activation + confirmation emails for admin username/contact email changes.
     *
     * @param  array{username?: string|null, email?: string|null, old_username?: string|null, old_email?: string|null}  $change
     * @return array{activation: 'sent'|'skipped'|'failed', confirmation: 'sent'|'skipped'|'failed'}
     */
    public static function sendAdminCredentialChange(User $user, string $activationUrl, array $change): array
    {
        $locale = PlatformSetting::defaultLanguage();
        $details = array_merge([
            'name' => $user->displayName(),
        ], $change);

        $activationTo = trim((string) ($change['email'] ?? $change['old_email'] ?? $user->contact_email ?? ''));
        $confirmationTo = trim((string) ($change['old_email'] ?? ''));

        $activation = self::safeSendToAddress(
            $activationTo,
            new AdminAccountChangeEmail('activation', $locale, $details, $activationUrl),
            $user->id,
        );

        $confirmation = 'skipped';
        if ($confirmationTo !== '') {
            $confirmation = self::safeSendToAddress(
                $confirmationTo,
                new AdminAccountChangeEmail('confirmation', $locale, $details, null),
                $user->id,
            );
        } elseif ($activationTo !== '' && $activation === 'sent') {
            // First-time or username-only change: send confirmation to the same inbox.
            $confirmation = self::safeSendToAddress(
                $activationTo,
                new AdminAccountChangeEmail('confirmation', $locale, $details, null),
                $user->id,
            );
        }

        return [
            'activation' => $activation,
            'confirmation' => $confirmation,
        ];
    }

    private static function planLabel(User $user): string
    {
        if ($user->role === 'school_admin') {
            return 'School';
        }

        if ($user->role === 'board_admin') {
            return 'School board';
        }

        return $user->subscription_plan === 'insights' ? 'Insights' : 'Essentials';
    }

    private static function subscriptionUrl(User $user): string
    {
        return match ($user->role) {
            'school_admin' => self::frontendUrl('/school/subscription'),
            'board_admin' => self::frontendUrl('/board/subscription'),
            default => self::frontendUrl('/subscription'),
        };
    }

    private static function frontendUrl(string $path = '/'): string
    {
        return rtrim(config('app.frontend_url', config('app.url')), '/').$path;
    }

    /** @return 'sent'|'skipped'|'failed' */
    private static function safeSend(User $user, object $mailable): string
    {
        return self::safeSendToAddress(trim((string) $user->email), $mailable, $user->id);
    }

    /** @return 'sent'|'skipped'|'failed' */
    private static function safeSendToAddress(string $email, object $mailable, ?int $userId = null): string
    {
        $email = trim($email);
        if ($email === '' || str_ends_with(strtolower($email), '@portal.local') || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Log::info('Skipped portal email for non-deliverable address', [
                'user_id' => $userId,
                'email' => $email,
                'mailable' => $mailable::class,
            ]);

            return 'skipped';
        }

        try {
            Mail::to($email)->send($mailable);

            return 'sent';
        } catch (Throwable $e) {
            Log::error('Portal email failed', [
                'user_id' => $userId,
                'email' => $email,
                'mailable' => $mailable::class,
                'error' => $e->getMessage(),
            ]);

            return 'failed';
        }
    }
}
