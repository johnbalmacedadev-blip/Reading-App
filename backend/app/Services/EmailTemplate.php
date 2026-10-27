<?php

namespace App\Services;

use App\Models\PlatformSetting;
use App\Models\User;
use Illuminate\Support\Facades\Storage;

class EmailTemplate
{
    public const SETTING_KEY = 'email_templates';

    public const LOGO_SETTING_KEY = 'email_logo_path';

    /** Content-ID for the inline logo attached by EmbedsEmailLogo (must not live on a trait — PHP forbids Trait::CONST). */
    public const EMAIL_LOGO_CID = 'email-logo@lecturescientifique';

    /** @var list<string> */
    public const LOCALES = ['en', 'fr'];

    public const AUDIENCE_TEACHER = 'teacher';

    public const AUDIENCE_SCHOOL = 'school';

    public const AUDIENCE_BOARD = 'board';

    /** @var list<string> */
    public const AUDIENCES = [
        self::AUDIENCE_TEACHER,
        self::AUDIENCE_SCHOOL,
        self::AUDIENCE_BOARD,
    ];

    /**
     * @var array<string, string>
     */
    public const AUDIENCE_LABELS = [
        self::AUDIENCE_TEACHER => 'Teachers',
        self::AUDIENCE_SCHOOL => 'School',
        self::AUDIENCE_BOARD => 'School Boards',
    ];

    /**
     * Editable email templates and their fields.
     *
     * @var array<string, list<string>>
     */
    public const TEMPLATES = [
        'welcome' => ['subject', 'heading', 'ready', 'login_with', 'temp_password', 'button', 'help', 'thanks', 'team'],
        'verify' => ['subject', 'heading', 'hello', 'created', 'login_email', 'temp_password', 'activate_help', 'button', 'expires', 'after', 'ignore', 'team'],
        'teacher_created' => ['subject', 'heading', 'hello', 'created', 'login_email', 'temp_password', 'activate_help', 'button', 'expires', 'after', 'ignore', 'team'],
        'reset' => ['subject', 'heading', 'hello', 'body', 'button', 'expires', 'ignore', 'team'],
        'trial_ending' => ['subject', 'heading', 'hello', 'body', 'button', 'team'],
        'trial_expired' => ['subject', 'heading', 'hello', 'body', 'button', 'team'],
        'trial_extended' => ['subject', 'heading', 'hello', 'body', 'button', 'team'],
        'subscription_started' => ['subject', 'heading', 'hello', 'body', 'button', 'team'],
        'payment_successful' => ['subject', 'heading', 'hello', 'body', 'button', 'team'],
        'payment_failed' => ['subject', 'heading', 'hello', 'body', 'button', 'team'],
        'subscription_renewed' => ['subject', 'heading', 'hello', 'body', 'button', 'team'],
        'subscription_cancelled' => ['subject', 'heading', 'hello', 'body', 'button', 'team'],
        'subscription_expired' => ['subject', 'heading', 'hello', 'body', 'button', 'team'],
        'school_added' => ['subject', 'heading', 'hello', 'body', 'button', 'team'],
        'announcement' => ['subject', 'heading', 'hello', 'body', 'button', 'team'],
        'inactive_reminder' => ['subject', 'heading', 'hello', 'body', 'button', 'team'],
        'suspension_reminder' => ['subject', 'heading', 'hello', 'body', 'button', 'team'],
    ];

    /**
     * Which audiences can edit / receive each template.
     *
     * @var array<string, list<string>>
     */
    public const TEMPLATE_AUDIENCES = [
        'welcome' => [self::AUDIENCE_TEACHER, self::AUDIENCE_SCHOOL, self::AUDIENCE_BOARD],
        'verify' => [self::AUDIENCE_TEACHER, self::AUDIENCE_SCHOOL, self::AUDIENCE_BOARD],
        'teacher_created' => [self::AUDIENCE_TEACHER],
        'reset' => [self::AUDIENCE_TEACHER, self::AUDIENCE_SCHOOL, self::AUDIENCE_BOARD],
        'trial_ending' => [self::AUDIENCE_TEACHER, self::AUDIENCE_SCHOOL, self::AUDIENCE_BOARD],
        'trial_expired' => [self::AUDIENCE_TEACHER, self::AUDIENCE_SCHOOL, self::AUDIENCE_BOARD],
        'trial_extended' => [self::AUDIENCE_TEACHER, self::AUDIENCE_SCHOOL, self::AUDIENCE_BOARD],
        'subscription_started' => [self::AUDIENCE_TEACHER, self::AUDIENCE_SCHOOL, self::AUDIENCE_BOARD],
        'payment_successful' => [self::AUDIENCE_TEACHER, self::AUDIENCE_SCHOOL, self::AUDIENCE_BOARD],
        'payment_failed' => [self::AUDIENCE_TEACHER, self::AUDIENCE_SCHOOL, self::AUDIENCE_BOARD],
        'subscription_renewed' => [self::AUDIENCE_TEACHER, self::AUDIENCE_SCHOOL, self::AUDIENCE_BOARD],
        'subscription_cancelled' => [self::AUDIENCE_TEACHER, self::AUDIENCE_SCHOOL, self::AUDIENCE_BOARD],
        'subscription_expired' => [self::AUDIENCE_TEACHER, self::AUDIENCE_SCHOOL, self::AUDIENCE_BOARD],
        'school_added' => [self::AUDIENCE_BOARD],
        'announcement' => [self::AUDIENCE_TEACHER, self::AUDIENCE_SCHOOL, self::AUDIENCE_BOARD],
        'inactive_reminder' => [self::AUDIENCE_TEACHER, self::AUDIENCE_SCHOOL, self::AUDIENCE_BOARD],
        'suspension_reminder' => [self::AUDIENCE_TEACHER, self::AUDIENCE_SCHOOL, self::AUDIENCE_BOARD],
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
        'trial_extended' => 'Trial extended',
        'subscription_started' => 'Subscription started',
        'payment_successful' => 'Payment successful',
        'payment_failed' => 'Payment failed',
        'subscription_renewed' => 'Subscription renewed',
        'subscription_cancelled' => 'Subscription cancelled',
        'subscription_expired' => 'Subscription expired',
        'school_added' => 'School added to board',
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

    public static function audienceFromRole(?string $role): string
    {
        return match ($role) {
            'school_admin' => self::AUDIENCE_SCHOOL,
            'board_admin' => self::AUDIENCE_BOARD,
            default => self::AUDIENCE_TEACHER,
        };
    }

    public static function audienceFromUser(?User $user): string
    {
        return self::audienceFromRole($user?->role);
    }

    public static function normalizeAudience(?string $audience): string
    {
        $audience = strtolower(trim((string) $audience));

        return in_array($audience, self::AUDIENCES, true) ? $audience : self::AUDIENCE_TEACHER;
    }

    /**
     * Resolve a template line with optional overrides, falling back to lang files.
     *
     * @param  array<string, scalar|null>  $replace
     */
    public static function line(
        string $templateKey,
        string $field,
        array $replace = [],
        ?string $locale = null,
        ?string $audience = null,
    ): string {
        $locale = self::normalizeLocale($locale ?? app()->getLocale());
        $audience = self::normalizeAudience($audience);
        $override = self::overrideValue($audience, $locale, $templateKey, $field);

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

        // Fall back to the Appearance → Platform logo when no dedicated email logo is set.
        $platform = PlatformSetting::getValue(PlatformBranding::PLATFORM_LOGO_KEY);
        if (is_string($platform) && $platform !== '' && Storage::disk('public')->exists($platform)) {
            return Storage::disk('public')->path($platform);
        }

        foreach ([
            public_path('images/email-logo.png'),
            public_path('images/brand-logo.png'),
        ] as $fallback) {
            if (file_exists($fallback)) {
                return $fallback;
            }
        }

        return null;
    }

    /**
     * Absolute public URL for email clients (Gmail blocks data: URIs).
     * Always points at the Email Templates logo (BrandingController), not a stale static file.
     */
    public static function logoPublicUrl(): ?string
    {
        if (self::logoPath() === null) {
            return null;
        }

        // Keep a static copy as a secondary public fallback for environments that
        // proxy /images/* but not /api/branding/*.
        self::syncPublicLogoCopy();

        $version = PlatformSetting::getValue('email_logo_version');
        if (! is_string($version) || $version === '') {
            $version = (string) time();
        }

        $base = rtrim((string) config('app.url'), '/');

        return $base.'/api/branding/email-logo?v='.$version;
    }

    public static function bumpLogoVersion(): void
    {
        PlatformSetting::setValue('email_logo_version', (string) time());
        self::syncPublicLogoCopy();
    }

    /**
     * Keep a publicly served copy so email clients can load the logo over HTTPS.
     */
    public static function syncPublicLogoCopy(): void
    {
        $path = self::logoPath();
        if ($path === null || ! is_readable($path)) {
            return;
        }

        $destDir = public_path('images');
        if (! is_dir($destDir)) {
            @mkdir($destDir, 0755, true);
        }

        $dest = $destDir.DIRECTORY_SEPARATOR.'email-logo-current.png';
        @copy($path, $dest);
    }

    /**
     * Data URI for admin previews only — not for outbound email HTML.
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
     * @return array{
     *   audiences: list<array{key: string, label: string}>,
     *   templates: array<string, array<string, array<string, array<string, string>>>>,
     *   catalog: list<array{key: string, label: string, audiences: list<string>, fields: list<array{key: string, label: string}>}>,
     *   logo_url: string|null,
     *   logo_data_uri: string|null,
     *   has_custom_logo: bool
     * }
     */
    public static function forAdmin(): array
    {
        $overrides = self::storedOverrides();
        $templates = [];

        foreach (self::AUDIENCES as $audience) {
            $templates[$audience] = [];
            foreach (self::LOCALES as $locale) {
                $templates[$audience][$locale] = [];
                foreach (self::TEMPLATES as $key => $fields) {
                    if (! in_array($audience, self::TEMPLATE_AUDIENCES[$key] ?? [], true)) {
                        continue;
                    }

                    $templates[$audience][$locale][$key] = [];
                    foreach ($fields as $field) {
                        $override = $overrides[$audience][$locale][$key][$field] ?? null;
                        $templates[$audience][$locale][$key][$field] = is_string($override) && $override !== ''
                            ? $override
                            : (string) __('emails.'.$key.'.'.$field, [], $locale);
                    }
                }
            }
        }

        $catalog = [];
        foreach (self::TEMPLATES as $key => $fields) {
            $catalog[] = [
                'key' => $key,
                'label' => self::LABELS[$key] ?? $key,
                'audiences' => self::TEMPLATE_AUDIENCES[$key] ?? [self::AUDIENCE_TEACHER],
                'fields' => array_map(
                    fn (string $field) => [
                        'key' => $field,
                        'label' => self::FIELD_LABELS[$field] ?? ucfirst(str_replace('_', ' ', $field)),
                    ],
                    $fields,
                ),
            ];
        }

        $audiences = [];
        foreach (self::AUDIENCES as $key) {
            $audiences[] = [
                'key' => $key,
                'label' => self::AUDIENCE_LABELS[$key] ?? $key,
            ];
        }

        return [
            'audiences' => $audiences,
            'templates' => $templates,
            'catalog' => $catalog,
            'logo_url' => self::logoPublicUrl(),
            'logo_data_uri' => self::logoDataUri(),
            'has_custom_logo' => self::hasCustomLogo(),
        ];
    }

    /**
     * Persist admin-edited templates. Empty strings clear an override (revert to lang default).
     *
     * Accepts either the new nested shape `{ teacher: { en, fr }, ... }` or a single-audience
     * payload `{ audience: 'teacher', templates: { en, fr } }` / legacy `{ en, fr }`.
     *
     * @param  array<string, mixed>  $incoming
     */
    public static function saveTemplates(array $incoming, ?string $audience = null): void
    {
        $existing = self::storedOverrides();
        $next = $existing;

        $byAudience = self::normalizeIncomingTemplates($incoming, $audience);

        foreach ($byAudience as $audienceKey => $localeMap) {
            if (! in_array($audienceKey, self::AUDIENCES, true) || ! is_array($localeMap)) {
                continue;
            }

            foreach (self::LOCALES as $locale) {
                if (! isset($localeMap[$locale]) || ! is_array($localeMap[$locale])) {
                    continue;
                }

                foreach (self::TEMPLATES as $key => $fields) {
                    if (! in_array($audienceKey, self::TEMPLATE_AUDIENCES[$key] ?? [], true)) {
                        continue;
                    }

                    if (! isset($localeMap[$locale][$key]) || ! is_array($localeMap[$locale][$key])) {
                        continue;
                    }

                    foreach ($fields as $field) {
                        if (! array_key_exists($field, $localeMap[$locale][$key])) {
                            continue;
                        }

                        $value = $localeMap[$locale][$key][$field];
                        if (! is_string($value)) {
                            continue;
                        }

                        $trimmed = trim($value);
                        $default = (string) __('emails.'.$key.'.'.$field, [], $locale);

                        if ($trimmed === '' || $trimmed === $default) {
                            unset($next[$audienceKey][$locale][$key][$field]);
                        } else {
                            $next[$audienceKey][$locale][$key][$field] = $value;
                        }
                    }

                    if (isset($next[$audienceKey][$locale][$key]) && $next[$audienceKey][$locale][$key] === []) {
                        unset($next[$audienceKey][$locale][$key]);
                    }
                }

                if (isset($next[$audienceKey][$locale]) && $next[$audienceKey][$locale] === []) {
                    unset($next[$audienceKey][$locale]);
                }
            }

            if (isset($next[$audienceKey]) && $next[$audienceKey] === []) {
                unset($next[$audienceKey]);
            }
        }

        PlatformSetting::setValue(self::SETTING_KEY, json_encode($next, JSON_UNESCAPED_UNICODE));
    }

    private static function normalizeLocale(string $locale): string
    {
        $locale = strtolower(substr($locale, 0, 2));

        return in_array($locale, self::LOCALES, true) ? $locale : PlatformSetting::defaultLanguage();
    }

    private static function overrideValue(string $audience, string $locale, string $templateKey, string $field): ?string
    {
        $overrides = self::storedOverrides();
        $value = $overrides[$audience][$locale][$templateKey][$field] ?? null;

        return is_string($value) ? $value : null;
    }

    /**
     * @return array<string, array<string, array<string, array<string, string>>>>
     */
    private static function storedOverrides(): array
    {
        $raw = PlatformSetting::getValue(self::SETTING_KEY, '{}');
        $decoded = json_decode((string) $raw, true);

        if (! is_array($decoded)) {
            return [];
        }

        // Legacy flat shape: { en: { template: {...} }, fr: {...} }
        if (self::looksLikeLocaleMap($decoded)) {
            $decoded = [self::AUDIENCE_TEACHER => $decoded];
        }

        $result = [];
        foreach (self::AUDIENCES as $audience) {
            if (! isset($decoded[$audience]) || ! is_array($decoded[$audience])) {
                continue;
            }
            $result[$audience] = [];
            foreach (self::LOCALES as $locale) {
                if (! isset($decoded[$audience][$locale]) || ! is_array($decoded[$audience][$locale])) {
                    continue;
                }
                $result[$audience][$locale] = [];
                foreach ($decoded[$audience][$locale] as $key => $fields) {
                    if (! is_string($key) || ! is_array($fields) || ! isset(self::TEMPLATES[$key])) {
                        continue;
                    }
                    if (! in_array($audience, self::TEMPLATE_AUDIENCES[$key] ?? [], true)) {
                        continue;
                    }
                    $result[$audience][$locale][$key] = [];
                    foreach ($fields as $field => $value) {
                        if (is_string($field) && is_string($value) && in_array($field, self::TEMPLATES[$key], true)) {
                            $result[$audience][$locale][$key][$field] = $value;
                        }
                    }
                }
            }
        }

        return $result;
    }

    /**
     * @param  array<string, mixed>  $incoming
     * @return array<string, array<string, mixed>>
     */
    private static function normalizeIncomingTemplates(array $incoming, ?string $audience = null): array
    {
        if ($audience !== null) {
            return [self::normalizeAudience($audience) => $incoming];
        }

        // Full nested payload already keyed by audience.
        $hasAudienceKey = false;
        foreach (self::AUDIENCES as $key) {
            if (isset($incoming[$key]) && is_array($incoming[$key])) {
                $hasAudienceKey = true;
                break;
            }
        }
        if ($hasAudienceKey) {
            return $incoming;
        }

        // Legacy / single locale map → Teachers.
        if (self::looksLikeLocaleMap($incoming)) {
            return [self::AUDIENCE_TEACHER => $incoming];
        }

        return $incoming;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private static function looksLikeLocaleMap(array $data): bool
    {
        $hasLocale = false;
        foreach (self::LOCALES as $locale) {
            if (isset($data[$locale]) && is_array($data[$locale])) {
                $hasLocale = true;
                break;
            }
        }

        if (! $hasLocale) {
            return false;
        }

        foreach (self::AUDIENCES as $audience) {
            if (array_key_exists($audience, $data)) {
                return false;
            }
        }

        return true;
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
