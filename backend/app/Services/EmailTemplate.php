<?php

namespace App\Services;

use App\Models\PlatformSetting;
use Illuminate\Support\Facades\Storage;

class EmailTemplate
{
    public const SETTING_KEY = 'email_templates';

    public const LOGO_SETTING_KEY = 'email_logo_path';

    /** @var list<string> */
    public const LOCALES = ['en', 'fr'];

    /**
     * Editable email templates and their fields.
     *
     * @var array<string, list<string>>
     */
    public const TEMPLATES = [
        'welcome' => ['subject', 'heading', 'ready', 'login_with', 'button', 'help', 'thanks', 'team'],
        'verify' => ['subject', 'heading', 'hello', 'created', 'login_email', 'temp_password', 'activate_help', 'button', 'expires', 'after', 'ignore', 'team'],
        'teacher_created' => ['subject', 'heading', 'hello', 'created', 'login_email', 'temp_password', 'activate_help', 'button', 'expires', 'after', 'ignore', 'team'],
        'reset' => ['subject', 'heading', 'hello', 'body', 'button', 'expires', 'ignore', 'team'],
        'trial_ending' => ['subject', 'heading', 'hello', 'body', 'button', 'team'],
        'trial_expired' => ['subject', 'heading', 'hello', 'body', 'button', 'team'],
        'subscription_started' => ['subject', 'heading', 'hello', 'body', 'button', 'team'],
        'payment_successful' => ['subject', 'heading', 'hello', 'body', 'button', 'team'],
        'payment_failed' => ['subject', 'heading', 'hello', 'body', 'button', 'team'],
        'subscription_renewed' => ['subject', 'heading', 'hello', 'body', 'button', 'team'],
        'subscription_cancelled' => ['subject', 'heading', 'hello', 'body', 'button', 'team'],
        'subscription_expired' => ['subject', 'heading', 'hello', 'body', 'button', 'team'],
        'announcement' => ['subject', 'heading', 'hello', 'body', 'button', 'team'],
        'inactive_reminder' => ['subject', 'heading', 'hello', 'body', 'button', 'team'],
        'suspension_reminder' => ['subject', 'heading', 'hello', 'body', 'button', 'team'],
    ];

    /**
     * @var array<string, string>
     */
    public const LABELS = [
        'welcome' => 'Welcome',
        'verify' => 'Verify email',
        'teacher_created' => 'Teacher account created',
        'reset' => 'Password reset',
        'trial_ending' => 'Trial ending soon',
        'trial_expired' => 'Trial expired',
        'subscription_started' => 'Subscription started',
        'payment_successful' => 'Payment successful',
        'payment_failed' => 'Payment failed',
        'subscription_renewed' => 'Subscription renewed',
        'subscription_cancelled' => 'Subscription cancelled',
        'subscription_expired' => 'Subscription expired',
        'announcement' => 'Announcement',
        'inactive_reminder' => 'Inactive account reminder',
        'suspension_reminder' => 'Account suspension reminder',
    ];

    /**
     * @var array<string, string>
     */
    public const FIELD_LABELS = [
        'subject' => 'Subject',
        'heading' => 'Heading',
        'hello' => 'Greeting',
        'body' => 'Body',
        'button' => 'Button label',
        'team' => 'Signature / team',
        'ready' => 'Ready message',
        'login_with' => 'Login intro',
        'help' => 'Help text',
        'thanks' => 'Thanks line',
        'created' => 'Account created',
        'login_email' => 'Login email line',
        'temp_password' => 'Temporary password line',
        'activate_help' => 'Activation help',
        'expires' => 'Expiry note',
        'after' => 'After activation',
        'ignore' => 'Ignore note',
    ];

    /**
     * Resolve a template line with optional overrides, falling back to lang files.
     *
     * @param  array<string, scalar|null>  $replace
     */
    public static function line(string $templateKey, string $field, array $replace = [], ?string $locale = null): string
    {
        $locale = self::normalizeLocale($locale ?? app()->getLocale());
        $override = self::overrideValue($locale, $templateKey, $field);

        if ($override !== null && $override !== '') {
            return self::replacePlaceholders($override, $replace);
        }

        return (string) __('emails.'.$templateKey.'.'.$field, $replace, $locale);
    }

    /**
     * Absolute filesystem path or null for the current email logo.
     */
    public static function logoPath(): ?string
    {
        $stored = PlatformSetting::getValue(self::LOGO_SETTING_KEY);
        if (is_string($stored) && $stored !== '' && Storage::disk('public')->exists($stored)) {
            return Storage::disk('public')->path($stored);
        }

        $fallback = public_path('images/email-logo.png');

        return file_exists($fallback) ? $fallback : null;
    }

    /**
     * Data URI for embedding the logo in outbound emails.
     */
    public static function logoDataUri(): ?string
    {
        $path = self::logoPath();
        if ($path === null) {
            return null;
        }

        $contents = @file_get_contents($path);
        if ($contents === false || $contents === '') {
            return null;
        }

        $mime = match (strtolower(pathinfo($path, PATHINFO_EXTENSION))) {
            'jpg', 'jpeg' => 'image/jpeg',
            'webp' => 'image/webp',
            'gif' => 'image/gif',
            default => 'image/png',
        };

        return 'data:'.$mime.';base64,'.base64_encode($contents);
    }

    public static function hasCustomLogo(): bool
    {
        $stored = PlatformSetting::getValue(self::LOGO_SETTING_KEY);

        return is_string($stored) && $stored !== '' && Storage::disk('public')->exists($stored);
    }

    /**
     * Merged templates for admin editing (overrides over lang defaults).
     *
     * @return array{templates: array<string, array<string, array<string, string>>>, catalog: list<array{key: string, label: string, fields: list<array{key: string, label: string}>}>, logo_url: string|null, logo_data_uri: string|null, has_custom_logo: bool}
     */
    public static function forAdmin(): array
    {
        $overrides = self::storedOverrides();
        $templates = [];

        foreach (self::LOCALES as $locale) {
            $templates[$locale] = [];
            foreach (self::TEMPLATES as $key => $fields) {
                $templates[$locale][$key] = [];
                foreach ($fields as $field) {
                    $override = $overrides[$locale][$key][$field] ?? null;
                    $templates[$locale][$key][$field] = is_string($override) && $override !== ''
                        ? $override
                        : (string) __('emails.'.$key.'.'.$field, [], $locale);
                }
            }
        }

        $catalog = [];
        foreach (self::TEMPLATES as $key => $fields) {
            $catalog[] = [
                'key' => $key,
                'label' => self::LABELS[$key] ?? $key,
                'fields' => array_map(
                    fn (string $field) => [
                        'key' => $field,
                        'label' => self::FIELD_LABELS[$field] ?? ucfirst(str_replace('_', ' ', $field)),
                    ],
                    $fields,
                ),
            ];
        }

        return [
            'templates' => $templates,
            'catalog' => $catalog,
            'logo_url' => '/api/admin/settings/email-logo?t='.time(),
            'logo_data_uri' => self::logoDataUri(),
            'has_custom_logo' => self::hasCustomLogo(),
        ];
    }

    /**
     * Persist admin-edited templates. Empty strings clear an override (revert to lang default).
     *
     * @param  array<string, mixed>  $incoming
     */
    public static function saveTemplates(array $incoming): void
    {
        $existing = self::storedOverrides();
        $next = $existing;

        foreach (self::LOCALES as $locale) {
            if (! isset($incoming[$locale]) || ! is_array($incoming[$locale])) {
                continue;
            }

            foreach (self::TEMPLATES as $key => $fields) {
                if (! isset($incoming[$locale][$key]) || ! is_array($incoming[$locale][$key])) {
                    continue;
                }

                foreach ($fields as $field) {
                    if (! array_key_exists($field, $incoming[$locale][$key])) {
                        continue;
                    }

                    $value = $incoming[$locale][$key][$field];
                    if (! is_string($value)) {
                        continue;
                    }

                    $trimmed = trim($value);
                    $default = (string) __('emails.'.$key.'.'.$field, [], $locale);

                    if ($trimmed === '' || $trimmed === $default) {
                        unset($next[$locale][$key][$field]);
                    } else {
                        $next[$locale][$key][$field] = $value;
                    }
                }

                if (isset($next[$locale][$key]) && $next[$locale][$key] === []) {
                    unset($next[$locale][$key]);
                }
            }

            if (isset($next[$locale]) && $next[$locale] === []) {
                unset($next[$locale]);
            }
        }

        PlatformSetting::setValue(self::SETTING_KEY, json_encode($next, JSON_UNESCAPED_UNICODE));
    }

    private static function normalizeLocale(string $locale): string
    {
        $locale = strtolower(substr($locale, 0, 2));

        return in_array($locale, self::LOCALES, true) ? $locale : PlatformSetting::defaultLanguage();
    }

    private static function overrideValue(string $locale, string $templateKey, string $field): ?string
    {
        $overrides = self::storedOverrides();
        $value = $overrides[$locale][$templateKey][$field] ?? null;

        return is_string($value) ? $value : null;
    }

    /**
     * @return array<string, array<string, array<string, string>>>
     */
    private static function storedOverrides(): array
    {
        $raw = PlatformSetting::getValue(self::SETTING_KEY, '{}');
        $decoded = json_decode((string) $raw, true);

        if (! is_array($decoded)) {
            return [];
        }

        $result = [];
        foreach (self::LOCALES as $locale) {
            if (! isset($decoded[$locale]) || ! is_array($decoded[$locale])) {
                continue;
            }
            $result[$locale] = [];
            foreach ($decoded[$locale] as $key => $fields) {
                if (! is_string($key) || ! is_array($fields) || ! isset(self::TEMPLATES[$key])) {
                    continue;
                }
                $result[$locale][$key] = [];
                foreach ($fields as $field => $value) {
                    if (is_string($field) && is_string($value) && in_array($field, self::TEMPLATES[$key], true)) {
                        $result[$locale][$key][$field] = $value;
                    }
                }
            }
        }

        return $result;
    }

    /**
     * @param  array<string, scalar|null>  $replace
     */
    private static function replacePlaceholders(string $value, array $replace): string
    {
        foreach ($replace as $key => $replacement) {
            $value = str_replace(':'.$key, (string) ($replacement ?? ''), $value);
        }

        return $value;
    }
}
