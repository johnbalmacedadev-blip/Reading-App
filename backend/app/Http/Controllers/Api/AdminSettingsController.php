<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PlatformSetting;
use App\Services\EmailTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
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
        ]);

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
            'templates.en' => ['sometimes', 'array'],
            'templates.fr' => ['sometimes', 'array'],
        ]);

        EmailTemplate::saveTemplates($data['templates']);

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

        return response()->json([
            'logo_url' => '/api/admin/settings/email-logo?t='.time(),
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

        return response()->json([
            'logo_url' => '/api/admin/settings/email-logo?t='.time(),
            'logo_data_uri' => EmailTemplate::logoDataUri(),
            'has_custom_logo' => EmailTemplate::hasCustomLogo(),
            'message' => 'Email logo reset to default.',
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
        ];
    }

    private function authorizeAdmin(Request $request): void
    {
        abort_unless($request->user()?->role === 'admin', 403);
    }
}
