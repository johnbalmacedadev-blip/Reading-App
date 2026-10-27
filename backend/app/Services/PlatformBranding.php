<?php

namespace App\Services;

use App\Models\PlatformSetting;
use Illuminate\Support\Facades\Storage;

class PlatformBranding
{
    public const FAVICON_SETTING_KEY = 'favicon_path';

    public const FAVICON_VERSION_KEY = 'favicon_version';

    public const PLATFORM_LOGO_KEY = 'platform_logo_path';

    public const LOGIN_LOGO_KEY = 'login_logo_path';

    public const LOGO_VERSION_KEY = 'logo_version';

    public const PRIMARY_COLOR_KEY = 'primary_color';

    public const ACCENT_COLOR_KEY = 'accent_color';

    public const DARK_MODE_KEY = 'dark_mode';

    public const DEFAULT_PRIMARY_COLOR = '#004aad';

    public const DEFAULT_ACCENT_COLOR = '#38b6ff';

    /**
     * Absolute filesystem path for the active favicon (custom or default).
     */
    public static function faviconPath(): ?string
    {
        return self::resolveStoredOrFallback(
            self::FAVICON_SETTING_KEY,
            [
                public_path('favicon.png'),
                public_path('favicon.ico'),
                public_path('images/email-logo.png'),
            ],
        );
    }

    public static function hasCustomFavicon(): bool
    {
        return self::hasStoredFile(self::FAVICON_SETTING_KEY);
    }

    public static function faviconVersion(): string
    {
        return self::versionValue(self::FAVICON_VERSION_KEY);
    }

    public static function faviconUrl(): string
    {
        return '/api/branding/favicon?v='.self::faviconVersion();
    }

    public static function faviconMime(?string $path = null): string
    {
        return self::imageMime($path ?? self::faviconPath());
    }

    public static function faviconDataUri(): ?string
    {
        return self::dataUriFor(self::faviconPath());
    }

    /**
     * @return array{favicon_url: string, favicon_data_uri: string|null, has_custom_favicon: bool, favicon_version: string}
     */
    public static function faviconPayload(): array
    {
        return [
            'favicon_url' => self::faviconUrl(),
            'favicon_data_uri' => self::faviconDataUri(),
            'has_custom_favicon' => self::hasCustomFavicon(),
            'favicon_version' => self::faviconVersion(),
        ];
    }

    public static function bumpFaviconVersion(): void
    {
        PlatformSetting::setValue(self::FAVICON_VERSION_KEY, (string) time());
    }

    public static function platformLogoPath(): ?string
    {
        return self::resolveStoredOrFallback(
            self::PLATFORM_LOGO_KEY,
            [
                public_path('images/brand-logo.png'),
                public_path('images/email-logo.png'),
            ],
        );
    }

    public static function loginLogoPath(): ?string
    {
        return self::resolveStoredOrFallback(
            self::LOGIN_LOGO_KEY,
            [
                public_path('images/login-logo-white.png'),
                public_path('images/brand-logo-white.png'),
                // Fall back to color logo; frontend can invert until a white asset is uploaded.
                public_path('images/brand-logo.png'),
                public_path('images/email-logo.png'),
            ],
        );
    }

    public static function hasCustomPlatformLogo(): bool
    {
        return self::hasStoredFile(self::PLATFORM_LOGO_KEY);
    }

    public static function hasCustomLoginLogo(): bool
    {
        return self::hasStoredFile(self::LOGIN_LOGO_KEY);
    }

    public static function logoVersion(): string
    {
        return self::versionValue(self::LOGO_VERSION_KEY);
    }

    public static function bumpLogoVersion(): void
    {
        PlatformSetting::setValue(self::LOGO_VERSION_KEY, (string) time());
    }

    public static function platformLogoUrl(): string
    {
        return '/api/branding/logo/platform?v='.self::logoVersion();
    }

    public static function loginLogoUrl(): string
    {
        return '/api/branding/logo/login?v='.self::logoVersion();
    }

    public static function logoPath(string $variant): ?string
    {
        return $variant === 'login' ? self::loginLogoPath() : self::platformLogoPath();
    }

    /**
     * @return array{
     *   platform_logo_url: string,
     *   platform_logo_data_uri: string|null,
     *   has_custom_platform_logo: bool,
     *   login_logo_url: string,
     *   login_logo_data_uri: string|null,
     *   has_custom_login_logo: bool,
     *   logo_version: string
     * }
     */
    public static function logoPayload(): array
    {
        return [
            'platform_logo_url' => self::platformLogoUrl(),
            'platform_logo_data_uri' => self::dataUriFor(self::platformLogoPath()),
            'has_custom_platform_logo' => self::hasCustomPlatformLogo(),
            'login_logo_url' => self::loginLogoUrl(),
            'login_logo_data_uri' => self::dataUriFor(self::loginLogoPath()),
            'has_custom_login_logo' => self::hasCustomLoginLogo(),
            'logo_version' => self::logoVersion(),
        ];
    }

    /**
     * @return array{
     *   favicon_url: string,
     *   favicon_data_uri: string|null,
     *   has_custom_favicon: bool,
     *   favicon_version: string,
     *   platform_logo_url: string,
     *   platform_logo_data_uri: string|null,
     *   has_custom_platform_logo: bool,
     *   login_logo_url: string,
     *   login_logo_data_uri: string|null,
     *   has_custom_login_logo: bool,
     *   logo_version: string
     * }
     */
    public static function publicPayload(): array
    {
        return [
            ...self::faviconPayload(),
            ...self::logoPayload(),
            ...self::themePayload(),
            'trial_period_days' => PlatformSetting::trialPeriodDays(),
        ];
    }

    /**
     * @return array{primary_color: string, accent_color: string, dark_mode: bool}
     */
    public static function themePayload(): array
    {
        return [
            'primary_color' => self::normalizeHex(
                PlatformSetting::getValue(self::PRIMARY_COLOR_KEY),
                self::DEFAULT_PRIMARY_COLOR,
            ),
            'accent_color' => self::normalizeHex(
                PlatformSetting::getValue(self::ACCENT_COLOR_KEY),
                self::DEFAULT_ACCENT_COLOR,
            ),
            'dark_mode' => filter_var(
                PlatformSetting::getValue(self::DARK_MODE_KEY, '0'),
                FILTER_VALIDATE_BOOLEAN,
            ),
        ];
    }

    public static function normalizeHex(mixed $value, string $fallback): string
    {
        if (! is_string($value)) {
            return strtolower($fallback);
        }

        $value = trim($value);
        if (preg_match('/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/', $value) !== 1) {
            return strtolower($fallback);
        }

        if (strlen($value) === 4) {
            $value = sprintf('#%s%s%s%s%s%s', $value[1], $value[1], $value[2], $value[2], $value[3], $value[3]);
        }

        return strtolower($value);
    }

    public static function imageMime(?string $path): string
    {
        if ($path === null) {
            return 'image/png';
        }

        return match (strtolower(pathinfo($path, PATHINFO_EXTENSION))) {
            'ico' => 'image/x-icon',
            'jpg', 'jpeg' => 'image/jpeg',
            'webp' => 'image/webp',
            'gif' => 'image/gif',
            'svg' => 'image/svg+xml',
            default => 'image/png',
        };
    }

    private static function hasStoredFile(string $key): bool
    {
        $stored = PlatformSetting::getValue($key);

        return is_string($stored) && $stored !== '' && Storage::disk('public')->exists($stored);
    }

    private static function versionValue(string $key): string
    {
        $version = PlatformSetting::getValue($key);

        return is_string($version) && $version !== '' ? $version : '0';
    }

    /**
     * @param  list<string>  $fallbacks
     */
    private static function resolveStoredOrFallback(string $key, array $fallbacks): ?string
    {
        $stored = PlatformSetting::getValue($key);
        if (is_string($stored) && $stored !== '' && Storage::disk('public')->exists($stored)) {
            return Storage::disk('public')->path($stored);
        }

        foreach ($fallbacks as $fallback) {
            if (is_string($fallback) && file_exists($fallback)) {
                return $fallback;
            }
        }

        return null;
    }

    private static function dataUriFor(?string $path): ?string
    {
        if ($path === null) {
            return null;
        }

        $contents = @file_get_contents($path);
        if ($contents === false || $contents === '') {
            return null;
        }

        return 'data:'.self::imageMime($path).';base64,'.base64_encode($contents);
    }
}
