<?php

namespace App\Models;

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
                ['value' => $value],
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
}
