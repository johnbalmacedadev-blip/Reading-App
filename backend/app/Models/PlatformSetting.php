<?php

namespace App\Models;

use App\Services\ResourceAccessService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class PlatformSetting extends Model
{
    protected $fillable = [
        'key',
        'value',
    ];

    public static function getValue(string $key, ?string $default = null): ?string
    {
        $settings = static::allCached();

        return array_key_exists($key, $settings) ? $settings[$key] : $default;
    }

    public static function setValue(string $key, ?string $value): void
    {
        static::query()->updateOrCreate(
            ['key' => $key],
            ['value' => $value],
        );

        Cache::forget('platform_settings');
    }

    public static function setMany(array $values): void
    {
        foreach ($values as $key => $value) {
            static::query()->updateOrCreate(
                ['key' => $key],
                ['value' => is_bool($value) ? ($value ? '1' : '0') : (is_scalar($value) || $value === null ? (string) ($value ?? '') : json_encode($value))],
            );
        }

        Cache::forget('platform_settings');
    }

    /** @return array<string, string|null> */
    public static function allCached(): array
    {
        return Cache::remember('platform_settings', 300, function () {
            return static::query()->pluck('value', 'key')->all();
        });
    }

    public static function defaultLanguage(): string
    {
        $lang = strtolower((string) static::getValue('default_language', 'fr'));

        return in_array($lang, ['en', 'fr'], true) ? $lang : 'fr';
    }

    public static function maxStudentsPerTeacher(): int
    {
        $value = (int) static::getValue('max_students_per_teacher', '30');

        return $value > 0 ? $value : 30;
    }

    public static function trialPeriodDays(): int
    {
        $value = (int) static::getValue('trial_period_days', '7');

        return max(7, min(365, $value > 0 ? $value : 7));
    }

    /**
     * Days before trial end when automatic reminder emails start (default 3).
     */
    public static function trialReminderStartDays(): int
    {
        $value = (int) static::getValue('trial_reminder_days', '3');
        $start = $value > 0 ? $value : 3;

        return max(1, min(static::trialPeriodDays(), $start));
    }

    /**
     * Enabled days-left checkpoints for automatic trial emails.
     * Missing setting defaults to every day in the reminder window.
     *
     * @return list<int>
     */
    public static function trialReminderDaysLeft(): array
    {
        $start = static::trialReminderStartDays();
        $raw = static::getValue('trial_reminder_days_enabled');
        if ($raw === null || $raw === '') {
            return range($start, 1);
        }

        $decoded = json_decode($raw, true);
        if (! is_array($decoded)) {
            return range($start, 1);
        }

        $enabled = [];
        foreach ($decoded as $day) {
            $n = (int) $day;
            if ($n >= 1 && $n <= $start) {
                $enabled[] = $n;
            }
        }

        $enabled = array_values(array_unique($enabled));
        rsort($enabled);

        return $enabled;
    }

    public static function trialExpiredEmailEnabled(): bool
    {
        return static::boolValue('trial_expired_email', true);
    }

    public static function boolValue(string $key, bool $default = false): bool
    {
        $raw = static::getValue($key);
        if ($raw === null) {
            return $default;
        }

        return in_array(strtolower(trim((string) $raw)), ['1', 'true', 'yes', 'on'], true);
    }

    /** @return array{
     *   teacher_can_export: bool,
     *   teacher_can_edit_student: bool,
     *   school_can_manage_teachers: bool,
     *   school_can_view_board: bool,
     *   board_can_edit_schools: bool,
     *   trial_can_download_export: bool,
     *   trial_period_days: int,
     *   trial_reminder_days: int,
     *   trial_reminder_days_enabled: list<int>,
     *   trial_expired_email: bool
     * } */
    public static function permissions(): array
    {
        return [
            'teacher_can_export' => static::boolValue('teacher_can_export', true),
            'teacher_can_edit_student' => static::boolValue('teacher_can_edit_student', true),
            'school_can_manage_teachers' => static::boolValue('school_can_manage_teachers', true),
            'school_can_view_board' => static::boolValue('school_can_view_board', false),
            'board_can_edit_schools' => static::boolValue('board_can_edit_schools', false),
            'trial_can_download_export' => static::boolValue('trial_can_download_export', false),
            'trial_period_days' => static::trialPeriodDays(),
            'trial_reminder_days' => static::trialReminderStartDays(),
            'trial_reminder_days_enabled' => static::trialReminderDaysLeft(),
            'trial_expired_email' => static::trialExpiredEmailEnabled(),
        ];
    }

    public static function assertPermission(string $key, bool $default = false): void
    {
        abort_unless(static::boolValue($key, $default), 403, 'This action is disabled by platform permissions.');
    }

    public static function assertTrialDownloadExportAllowed(?User $user, ?string $kind = null, ?string $key = null): void
    {
        if (! $user || $user->role === 'admin') {
            return;
        }

        if (static::boolValue('trial_can_download_export', false)) {
            return;
        }

        if (! $user->isTrialOnlyAccount()) {
            return;
        }

        if ($kind && $key !== null && $key !== '' && ResourceAccessService::userMayAccess($user, $kind, $key)) {
            return;
        }

        abort(403, 'Upgrade your plan to download this resource.');
    }
}
