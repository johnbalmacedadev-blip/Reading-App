<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SchoolYear extends Model
{
    protected $fillable = [
        'label',
        'is_default',
    ];

    protected function casts(): array
    {
        return [
            'is_default' => 'boolean',
        ];
    }

    public static function defaultLabel(): string
    {
        $default = static::query()->where('is_default', true)->value('label');

        if ($default) {
            return $default;
        }

        $latest = static::query()->orderByDesc('label')->value('label');

        if ($latest) {
            return $latest;
        }

        return static::inferCurrentLabel();
    }

    public static function inferCurrentLabel(): string
    {
        $now = now();
        $startYear = $now->month >= 9 ? $now->year : $now->year - 1;

        return "{$startYear}-".($startYear + 1);
    }

    public static function resolve(?string $requested): string
    {
        $label = trim((string) ($requested ?? ''));

        if ($label !== '' && static::query()->where('label', $label)->exists()) {
            return $label;
        }

        return static::defaultLabel();
    }

    public static function setDefault(self $schoolYear): void
    {
        static::query()->where('is_default', true)->update(['is_default' => false]);
        $schoolYear->update(['is_default' => true]);
    }
}
