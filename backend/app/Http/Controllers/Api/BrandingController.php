<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\EmailTemplate;
use App\Services\PlatformBranding;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class BrandingController extends Controller
{
    public function show(): JsonResponse
    {
        return response()->json(PlatformBranding::publicPayload());
    }

    public function favicon(): StreamedResponse|JsonResponse
    {
        return $this->streamImage(PlatformBranding::faviconPath(), 'Favicon not found.');
    }

    public function emailLogo(): StreamedResponse|JsonResponse
    {
        return $this->streamImage(EmailTemplate::logoPath(), 'Email logo not found.');
    }

    public function logo(string $variant): StreamedResponse|JsonResponse
    {
        if (! in_array($variant, ['platform', 'login'], true)) {
            return response()->json(['message' => 'Invalid logo variant.'], 404);
        }

        return $this->streamImage(
            PlatformBranding::logoPath($variant),
            'Logo not found.',
        );
    }

    private function streamImage(?string $path, string $missingMessage): StreamedResponse|JsonResponse
    {
        if ($path === null || ! is_readable($path)) {
            return response()->json(['message' => $missingMessage], 404);
        }

        $mime = PlatformBranding::imageMime($path);

        return response()->stream(function () use ($path) {
            echo file_get_contents($path);
        }, 200, [
            'Content-Type' => $mime,
            'Cache-Control' => 'public, max-age=86400',
        ]);
    }
}
