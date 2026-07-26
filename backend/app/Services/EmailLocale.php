<?php

namespace App\Services;

use App\Models\PlatformSetting;
use App\Models\User;

class EmailLocale
{
    public static function resolve(?User $user = null): string
    {
        $preferred = strtolower(trim((string) ($user?->preferred_language ?? '')));
        if (in_array($preferred, ['en', 'fr'], true)) {
            return $preferred;
        }

        return PlatformSetting::defaultLanguage();
    }
}
