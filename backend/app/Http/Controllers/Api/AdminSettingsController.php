<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PlatformSetting;
use App\Services\EmailTemplate;
use App\Services\PlatformBranding;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminSettingsController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        return response()->json([
            'settings' => $this->formatted(),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $data = $request->validate([
            'default_language' => ['sometimes', 'in:en,fr'],
            'date_format' => ['sometimes', 'string', 'max:30'],
            'number_format' => ['sometimes', 'in:en,fr'],
            'timezone' => ['sometimes', 'string', 'max:60'],
            'platform_name' => ['sometimes', 'string', 'max:120'],
            'support_email' => ['sometimes', 'email', 'max:255'],
            'primary_color' => ['sometimes', 'regex:/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/'],
            'accent_color' => ['sometimes', 'regex:/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/'],
            'dark_mode' => ['sometimes', 'boolean'],
            'teacher_can_export' => ['sometimes', 'boolean'],
            'teacher_can_edit_student' => ['sometimes', 'boolean'],
            'school_can_manage_teachers' => ['sometimes', 'boolean'],
            'school_can_view_board' => ['sometimes', 'boolean'],
            'board_can_edit_schools' => ['sometimes', 'boolean'],
            'trial_can_download_export' => ['sometimes', 'boolean'],
            'trial_period_days' => ['sometimes', 'integer', 'min:7', 'max:365'],
            'trial_reminder_days' => ['sometimes', 'integer', 'min:1', 'max:365'],
            'trial_reminder_days_enabled' => ['sometimes', 'array'],
            'trial_reminder_days_enabled.*' => ['integer', 'min:1', 'max:365'],
            'trial_expired_email' => ['sometimes', 'boolean'],
        ]);

        if (isset($data['primary_color'])) {
            $data['primary_color'] = PlatformBranding::normalizeHex(
                $data['primary_color'],
                PlatformBranding::DEFAULT_PRIMARY_COLOR,
            );
        }
        if (isset($data['accent_color'])) {
            $data['accent_color'] = PlatformBranding::normalizeHex(
                $data['accent_color'],
                PlatformBranding::DEFAULT_ACCENT_COLOR,
            );
        }
        if (array_key_exists('dark_mode', $data)) {
            $data['dark_mode'] = $data['dark_mode'] ? '1' : '0';
        }

        foreach ([
            'teacher_can_export',
            'teacher_can_edit_student',
            'school_can_manage_teachers',
            'school_can_view_board',
            'board_can_edit_schools',
            'trial_can_download_export',
            'trial_expired_email',
        ] as $permKey) {
            if (array_key_exists($permKey, $data)) {
                $data[$permKey] = $data[$permKey] ? '1' : '0';
            }
        }

        if (array_key_exists('trial_period_days', $data)) {
            $data['trial_period_days'] = (string) max(7, min(365, (int) $data['trial_period_days']));
        }

        if (array_key_exists('trial_reminder_days', $data)) {
            $trialDays = array_key_exists('trial_period_days', $data)
                ? (int) $data['trial_period_days']
                : PlatformSetting::trialPeriodDays();
            $reminderDays = (int) $data['trial_reminder_days'];
            if ($reminderDays > $trialDays) {
                throw ValidationException::withMessages([
                    'trial_reminder_days' => [
                        "Trial-ends reminder cannot be greater than the trial period ({$trialDays} days).",
                    ],
                ]);
            }
            $data['trial_reminder_days'] = (string) max(1, min($trialDays, $reminderDays));
        }

        $reminderStart = array_key_exists('trial_reminder_days', $data)
            ? (int) $data['trial_reminder_days']
            : PlatformSetting::trialReminderStartDays();

        if (array_key_exists('trial_reminder_days_enabled', $data)) {
            $enabled = [];
            foreach ($data['trial_reminder_days_enabled'] as $day) {
                $n = (int) $day;
                if ($n >= 1 && $n <= $reminderStart) {
                    $enabled[] = $n;
                }
            }
            $data['trial_reminder_days_enabled'] = array_values(array_unique($enabled));
        } elseif (array_key_exists('trial_reminder_days', $data)) {
            $previousStart = PlatformSetting::trialReminderStartDays();
            $previousEnabled = PlatformSetting::trialReminderDaysLeft();
            $enabled = [];
            for ($day = $reminderStart; $day >= 1; $day--) {
                if ($day > $previousStart || in_array($day, $previousEnabled, true)) {
                    $enabled[] = $day;
                }
            }
            $data['trial_reminder_days_enabled'] = $enabled;
        }

        PlatformSetting::setMany($data);

        return response()->json([
            'settings' => $this->formatted(),
            'message' => 'Settings saved.',
        ]);
    }

    public function emailTemplates(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        return response()->json(EmailTemplate::forAdmin());
    }

    public function updateEmailTemplates(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $data = $request->validate([
            'templates' => ['required', 'array'],
            'audience' => ['sometimes', 'nullable', 'in:teacher,school,board'],
            'templates.teacher' => ['sometimes', 'array'],
            'templates.school' => ['sometimes', 'array'],
            'templates.board' => ['sometimes', 'array'],
            'templates.en' => ['sometimes', 'array'],
            'templates.fr' => ['sometimes', 'array'],
        ]);

        EmailTemplate::saveTemplates($data['templates'], $data['audience'] ?? null);

        return response()->json([
            ...EmailTemplate::forAdmin(),
            'message' => 'Email templates saved.',
        ]);
    }

    public function uploadEmailLogo(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $request->validate([
            'logo' => ['required', 'image', 'max:2048', 'mimes:jpg,jpeg,png,webp,gif'],
        ]);

        $previous = PlatformSetting::getValue(EmailTemplate::LOGO_SETTING_KEY);
        if (is_string($previous) && $previous !== '' && Storage::disk('public')->exists($previous)) {
            Storage::disk('public')->delete($previous);
        }

        $file = $request->file('logo');
        $extension = strtolower($file->getClientOriginalExtension() ?: 'png');
        $path = $file->storeAs('email', 'logo-'.Str::uuid().'.'.$extension, 'public');

        PlatformSetting::setValue(EmailTemplate::LOGO_SETTING_KEY, $path);
        EmailTemplate::bumpLogoVersion();

        return response()->json([
            'logo_url' => EmailTemplate::logoPublicUrl(),
            'logo_data_uri' => EmailTemplate::logoDataUri(),
            'has_custom_logo' => true,
            'message' => 'Email logo updated.',
        ]);
    }

    public function emailLogo(Request $request): StreamedResponse|JsonResponse
    {
        $this->authorizeAdmin($request);

        $path = EmailTemplate::logoPath();
        if ($path === null || ! is_readable($path)) {
            return response()->json(['message' => 'No email logo configured.'], 404);
        }

        $mime = match (strtolower(pathinfo($path, PATHINFO_EXTENSION))) {
            'jpg', 'jpeg' => 'image/jpeg',
            'webp' => 'image/webp',
            'gif' => 'image/gif',
            default => 'image/png',
        };

        return response()->stream(function () use ($path) {
            echo file_get_contents($path);
        }, 200, [
            'Content-Type' => $mime,
            'Cache-Control' => 'private, max-age=60',
        ]);
    }

    public function resetEmailLogo(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $previous = PlatformSetting::getValue(EmailTemplate::LOGO_SETTING_KEY);
        if (is_string($previous) && $previous !== '' && Storage::disk('public')->exists($previous)) {
            Storage::disk('public')->delete($previous);
        }

        PlatformSetting::setValue(EmailTemplate::LOGO_SETTING_KEY, null);
        EmailTemplate::bumpLogoVersion();

        return response()->json([
            'logo_url' => EmailTemplate::logoPublicUrl(),
            'logo_data_uri' => EmailTemplate::logoDataUri(),
            'has_custom_logo' => EmailTemplate::hasCustomLogo(),
            'message' => 'Email logo reset to default.',
        ]);
    }

    public function uploadFavicon(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $request->validate([
            'favicon' => [
                'required',
                'file',
                'max:2048',
                'mimetypes:image/png,image/jpeg,image/webp,image/gif,image/x-icon,image/vnd.microsoft.icon,image/svg+xml,image/ico',
            ],
        ]);

        $previous = PlatformSetting::getValue(PlatformBranding::FAVICON_SETTING_KEY);
        if (is_string($previous) && $previous !== '' && Storage::disk('public')->exists($previous)) {
            Storage::disk('public')->delete($previous);
        }

        $file = $request->file('favicon');
        $extension = strtolower($file->getClientOriginalExtension() ?: 'png');
        if ($extension === 'jpeg') {
            $extension = 'jpg';
        }
        $path = $file->storeAs('branding', 'favicon-'.Str::uuid().'.'.$extension, 'public');

        PlatformSetting::setValue(PlatformBranding::FAVICON_SETTING_KEY, $path);
        PlatformBranding::bumpFaviconVersion();

        return response()->json([
            ...PlatformBranding::faviconPayload(),
            'message' => 'Favicon updated.',
        ]);
    }

    public function favicon(Request $request): StreamedResponse|JsonResponse
    {
        $this->authorizeAdmin($request);

        $path = PlatformBranding::faviconPath();
        if ($path === null || ! is_readable($path)) {
            return response()->json(['message' => 'No favicon configured.'], 404);
        }

        $mime = PlatformBranding::faviconMime($path);

        return response()->stream(function () use ($path) {
            echo file_get_contents($path);
        }, 200, [
            'Content-Type' => $mime,
            'Cache-Control' => 'private, max-age=60',
        ]);
    }

    public function resetFavicon(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $previous = PlatformSetting::getValue(PlatformBranding::FAVICON_SETTING_KEY);
        if (is_string($previous) && $previous !== '' && Storage::disk('public')->exists($previous)) {
            Storage::disk('public')->delete($previous);
        }

        PlatformSetting::setValue(PlatformBranding::FAVICON_SETTING_KEY, null);
        PlatformBranding::bumpFaviconVersion();

        return response()->json([
            ...PlatformBranding::faviconPayload(),
            'message' => 'Favicon reset to default.',
        ]);
    }

    public function uploadPlatformLogo(Request $request): JsonResponse
    {
        return $this->uploadLogoVariant($request, PlatformBranding::PLATFORM_LOGO_KEY, 'Platform logo updated.');
    }

    public function resetPlatformLogo(Request $request): JsonResponse
    {
        return $this->resetLogoVariant($request, PlatformBranding::PLATFORM_LOGO_KEY, 'Platform logo reset to default.');
    }

    public function uploadLoginLogo(Request $request): JsonResponse
    {
        return $this->uploadLogoVariant($request, PlatformBranding::LOGIN_LOGO_KEY, 'Login logo updated.');
    }

    public function resetLoginLogo(Request $request): JsonResponse
    {
        return $this->resetLogoVariant($request, PlatformBranding::LOGIN_LOGO_KEY, 'Login logo reset to default.');
    }

    private function uploadLogoVariant(Request $request, string $settingKey, string $message): JsonResponse
    {
        $this->authorizeAdmin($request);

        $request->validate([
            'logo' => [
                'required',
                'file',
                'max:4096',
                'mimetypes:image/png,image/jpeg,image/webp,image/gif,image/svg+xml',
            ],
        ]);

        $previous = PlatformSetting::getValue($settingKey);
        if (is_string($previous) && $previous !== '' && Storage::disk('public')->exists($previous)) {
            Storage::disk('public')->delete($previous);
        }

        $file = $request->file('logo');
        $extension = strtolower($file->getClientOriginalExtension() ?: 'png');
        if ($extension === 'jpeg') {
            $extension = 'jpg';
        }
        $prefix = $settingKey === PlatformBranding::LOGIN_LOGO_KEY ? 'login-logo' : 'platform-logo';
        $path = $file->storeAs('branding', $prefix.'-'.Str::uuid().'.'.$extension, 'public');

        PlatformSetting::setValue($settingKey, $path);
        PlatformBranding::bumpLogoVersion();
        if ($settingKey === PlatformBranding::PLATFORM_LOGO_KEY) {
            EmailTemplate::bumpLogoVersion();
        }

        return response()->json([
            ...PlatformBranding::logoPayload(),
            'message' => $message,
        ]);
    }

    private function resetLogoVariant(Request $request, string $settingKey, string $message): JsonResponse
    {
        $this->authorizeAdmin($request);

        $previous = PlatformSetting::getValue($settingKey);
        if (is_string($previous) && $previous !== '' && Storage::disk('public')->exists($previous)) {
            Storage::disk('public')->delete($previous);
        }

        PlatformSetting::setValue($settingKey, null);
        PlatformBranding::bumpLogoVersion();
        if ($settingKey === PlatformBranding::PLATFORM_LOGO_KEY) {
            EmailTemplate::bumpLogoVersion();
        }

        return response()->json([
            ...PlatformBranding::logoPayload(),
            'message' => $message,
        ]);
    }

    private function formatted(): array
    {
        return [
            'default_language' => PlatformSetting::defaultLanguage(),
            'date_format' => PlatformSetting::getValue('date_format', 'DD/MM/YYYY'),
            'number_format' => PlatformSetting::getValue('number_format', 'fr') === 'en' ? 'en' : 'fr',
            'timezone' => PlatformSetting::getValue('timezone', 'America/Toronto'),
            'platform_name' => PlatformSetting::getValue('platform_name', 'Lecture Scientifique'),
            'support_email' => PlatformSetting::getValue('support_email', 'support@lecturesci.ca'),
            ...PlatformSetting::permissions(),
            ...PlatformBranding::publicPayload(),
        ];
    }

    private function authorizeAdmin(Request $request): void
    {
        abort_unless($request->user()?->role === 'admin', 403);
    }
}
