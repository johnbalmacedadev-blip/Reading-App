<?php

namespace App\Services;

use App\Models\PlatformSetting;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Validation\ValidationException;

class InstitutionalSubscriptionService
{
    public const NOTICE_TYPES = [
        'trial_ending',
        'trial_expired',
        'subscription_started',
        'subscription_renewed',
        'subscription_cancelled',
        'subscription_expired',
    ];

    /**
     * @param  array{
     *   access_mode?: string|null,
     *   trial_started_at?: string|null,
     *   trial_ends_at?: string|null,
     *   subscription_started_at?: string|null,
     *   subscription_ends_at?: string|null,
     * }  $data
     */
    public static function apply(User $user, array $data, bool $required = false): void
    {
        $mode = $data['access_mode'] ?? null;

        if ($mode === null || $mode === '') {
            if ($required) {
                throw ValidationException::withMessages([
                    'access_mode' => ['Choose trial period or active subscription.'],
                ]);
            }

            return;
        }

        if ($mode === 'trial') {
            $start = self::parseDayStart($data['trial_started_at'] ?? null)
                ?? ($user->trial_started_at?->copy()->startOfDay() ?? now()->startOfDay());
            $end = self::parseDayEnd($data['trial_ends_at'] ?? null)
                ?? $start->copy()->addDays(PlatformSetting::trialPeriodDays())->endOfDay();

            $user->forceFill([
                'trial_started_at' => $start,
                'trial_ends_at' => $end,
                'subscription_status' => 'trialing',
                'subscription_plan' => null,
                'subscription_billing' => null,
                'subscription_started_at' => null,
                'subscription_ends_at' => null,
            ]);

            return;
        }

        if ($mode === 'subscription') {
            $start = self::parseDayStart($data['subscription_started_at'] ?? null)
                ?? ($user->subscription_started_at?->copy()->startOfDay() ?? now()->startOfDay());
            $end = array_key_exists('subscription_ends_at', $data)
                ? self::parseDayEnd($data['subscription_ends_at'])
                : $user->subscription_ends_at;

            $user->forceFill([
                'subscription_status' => 'active',
                'subscription_plan' => $user->subscription_plan ?: 'institutional',
                'subscription_billing' => null,
                'subscription_started_at' => $start,
                'subscription_ends_at' => $end,
            ]);

            if (! $user->trial_started_at && ($data['trial_started_at'] ?? null)) {
                $user->trial_started_at = self::parseDayStart($data['trial_started_at']);
            }
            if (! $user->trial_ends_at && ($data['trial_ends_at'] ?? null)) {
                $user->trial_ends_at = self::parseDayEnd($data['trial_ends_at']);
            }
        }
    }

    /**
     * @param  'school_registration'|'board_registration'|'school_assigned'|'board_assigned'  $source
     */
    public static function applyInstitutionalCoverageFromSponsor(
        User $teacher,
        User $sponsor,
        string $source = 'school_registration',
    ): void {
        self::syncRegistrationCoverage($teacher, $sponsor, $source, activate: true);
    }

    /**
     * Keep a registration-licensed teacher aligned with the school/board portal licence.
     *
     * @param  'school_registration'|'board_registration'|'school_assigned'|'board_assigned'|null  $source
     */
    public static function syncRegistrationCoverage(
        User $teacher,
        User $sponsor,
        ?string $source = null,
        bool $activate = false,
    ): void {
        $started = null;
        $ends = null;

        if (in_array($sponsor->subscription_status, ['active', 'past_due'], true)) {
            $started = $sponsor->subscription_started_at?->copy()->startOfDay() ?? now()->startOfDay();
            $ends = $sponsor->subscription_ends_at?->copy();
        } elseif ($sponsor->subscription_status === 'trialing' || $sponsor->trial_ends_at) {
            // School/board may still be on trial — teacher coverage ends with that window,
            // but the teacher account itself is institutional (not an individual trial).
            $started = $sponsor->trial_started_at?->copy()->startOfDay()
                ?? $sponsor->subscription_started_at?->copy()->startOfDay()
                ?? now()->startOfDay();
            $ends = $sponsor->trial_ends_at?->copy() ?? $sponsor->subscription_ends_at?->copy();
        } else {
            $started = $sponsor->subscription_started_at?->copy()->startOfDay()
                ?? $sponsor->trial_started_at?->copy()->startOfDay()
                ?? now()->startOfDay();
            $ends = $sponsor->subscription_ends_at?->copy() ?? $sponsor->trial_ends_at?->copy();
        }

        $payload = [
            'affiliation_type' => 'institutional',
            'trial_started_at' => null,
            'trial_ends_at' => null,
            'subscription_status' => 'active',
            'subscription_plan' => 'institutional',
            'subscription_billing' => null,
            'subscription_started_at' => $started,
            'subscription_ends_at' => $ends,
        ];

        if ($source) {
            $payload['registration_source'] = $source;
        } elseif (! $teacher->registration_source) {
            $payload['registration_source'] = $sponsor->role === 'board_admin'
                ? 'board_registration'
                : 'school_registration';
        }

        if ($activate) {
            $payload['account_status'] = 'active';
            $payload['email_verified_at'] = $teacher->email_verified_at ?? now();
        }

        $teacher->forceFill($payload);

        if ($teacher->isDirty()) {
            $teacher->save();
        }
    }

    public static function sponsorHasActiveLicence(User $sponsor): bool
    {
        if ($sponsor->account_status === 'archived') {
            return false;
        }

        if ($sponsor->canAccessInstitutionalPortal()) {
            return true;
        }

        // Legacy portals with no billing fields yet still count as licensed.
        return $sponsor->subscription_status === null && $sponsor->trial_ends_at === null;
    }

    public static function registrationSourceLabel(?string $source): ?string
    {
        return match ($source) {
            'school_registration' => 'School registration',
            'board_registration' => 'Board registration',
            'school_assigned' => 'Assigned to school',
            'board_assigned' => 'Assigned to board',
            default => null,
        };
    }

    /** @return array<string, mixed> */
    public static function format(?User $user): array
    {
        if (! $user) {
            return [
                'access_mode' => null,
                'access' => 'None',
                'trial_started_at' => null,
                'trial_ends_at' => null,
                'subscription_started_at' => null,
                'subscription_ends_at' => null,
                'is_trial_active' => false,
                'is_subscription_active' => false,
                'trial_days_remaining' => 0,
                'can_access_portal' => false,
            ];
        }

        return [
            'access_mode' => self::accessMode($user),
            'access' => self::accessLabel($user),
            'trial_started_at' => $user->trial_started_at?->toDateString(),
            'trial_ends_at' => $user->trial_ends_at?->toDateString(),
            'subscription_started_at' => $user->subscription_started_at?->toDateString(),
            'subscription_ends_at' => $user->subscription_ends_at?->toDateString(),
            'is_trial_active' => $user->hasActiveTrial(),
            'is_subscription_active' => $user->hasActiveSubscription(),
            'trial_days_remaining' => $user->trialDaysRemaining(),
            'can_access_portal' => $user->canAccessInstitutionalPortal(),
        ];
    }

    public static function accessMode(User $user): ?string
    {
        if ($user->subscription_status === 'active' || $user->subscription_status === 'past_due') {
            return 'subscription';
        }

        if ($user->subscription_status === 'trialing' || $user->trial_ends_at) {
            return 'trial';
        }

        // Legacy / unset — treat as subscription for admin defaults.
        if ($user->subscription_status === null && $user->trial_ends_at === null) {
            return 'subscription';
        }

        return null;
    }

    public static function accessLabel(User $user): string
    {
        if ($user->subscription_status === null && $user->trial_ends_at === null) {
            return 'Active';
        }

        if ($user->hasActiveSubscription()) {
            return 'Subscribed';
        }

        if ($user->hasActiveTrial()) {
            return 'Trial';
        }

        if ($user->subscription_status === 'active' || $user->subscription_status === 'past_due') {
            return 'Subscription expired';
        }

        if ($user->subscription_status === 'trialing' || $user->trial_ends_at) {
            return 'Trial expired';
        }

        return 'None';
    }

    public static function sendBillingNotice(User $user, string $type): void
    {
        if (! in_array($type, self::NOTICE_TYPES, true)) {
            throw ValidationException::withMessages([
                'type' => ['Invalid notice type.'],
            ]);
        }

        match ($type) {
            'trial_ending' => NotificationMailer::sendTrialEnding(
                $user,
                max(1, $user->trialDaysRemaining() ?: 1)
            ),
            'trial_expired' => NotificationMailer::sendTrialExpired($user),
            'subscription_started' => NotificationMailer::sendSubscriptionStarted($user),
            'subscription_renewed' => NotificationMailer::sendSubscriptionRenewed(
                $user,
                $user->subscription_ends_at
            ),
            'subscription_cancelled' => NotificationMailer::sendSubscriptionCancelled($user),
            'subscription_expired' => NotificationMailer::sendSubscriptionExpired($user),
        };
    }

    /**
     * Extend an active trial, or reactivate an expired one.
     *
     * @return array{days: int, trial_ends_at: \Carbon\Carbon}
     */
    public static function extendTrial(User $user, ?int $days = null): array
    {
        $defaultDays = min(30, PlatformSetting::trialPeriodDays());
        $days = max(1, min(30, $days ?? $defaultDays));

        if ($user->hasActiveTrial() && $user->trial_ends_at) {
            $end = $user->trial_ends_at->copy()->addDays($days)->endOfDay();
            $user->forceFill([
                'trial_ends_at' => $end,
                'subscription_status' => 'trialing',
            ]);
        } else {
            $start = now()->startOfDay();
            $end = $start->copy()->addDays($days)->endOfDay();
            $user->forceFill([
                'trial_started_at' => $start,
                'trial_ends_at' => $end,
                'subscription_status' => 'trialing',
                'subscription_plan' => null,
                'subscription_billing' => null,
                'subscription_started_at' => null,
                'subscription_ends_at' => null,
            ]);
        }

        $user->save();

        return [
            'days' => $days,
            'trial_ends_at' => $user->trial_ends_at,
        ];
    }

    /**
     * @return array{days: int, trial_ends_at: \Carbon\Carbon}
     */
    public static function extendTrialAndNotify(User $user, ?int $days = null): array
    {
        $result = self::extendTrial($user, $days);
        NotificationMailer::sendTrialExtended($user, $result['days']);

        return $result;
    }

    public static function noticeLabel(string $type): string
    {
        return match ($type) {
            'trial_ending' => 'trial ending soon',
            'trial_expired' => 'trial expired',
            'subscription_started' => 'subscription started',
            'subscription_renewed' => 'subscription renewed',
            'subscription_cancelled' => 'subscription cancelled',
            'subscription_expired' => 'subscription expired',
            default => $type,
        };
    }

    private static function parseDayStart(?string $value): ?Carbon
    {
        if ($value === null || trim($value) === '') {
            return null;
        }

        return Carbon::parse($value)->startOfDay();
    }

    private static function parseDayEnd(?string $value): ?Carbon
    {
        if ($value === null || trim($value) === '') {
            return null;
        }

        return Carbon::parse($value)->endOfDay();
    }
}
