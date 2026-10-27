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

    /**
     * Canonical storage format: "2025-2026".
     * Accepts "2025-2026", "2025-26", "2025 - 26", en/em dashes.
     */
    public static function normalizeLabel(?string $label): string
    {
        $raw = trim((string) ($label ?? ''));
        if ($raw === '') {
            return '';
        }

        $raw = str_replace(['–', '—'], '-', $raw);
        $raw = preg_replace('/\s+/', '', $raw) ?? $raw;

        if (preg_match('/^(\d{4})-(\d{4})$/', $raw, $matches)) {
            return $matches[1].'-'.$matches[2];
        }

        if (preg_match('/^(\d{4})-(\d{2})$/', $raw, $matches)) {
            $start = (int) $matches[1];
            $endTwo = (int) $matches[2];
            $century = intdiv($start, 100) * 100;
            $end = $century + $endTwo;
            if ($end <= $start) {
                $end += 100;
            }

            return $start.'-'.$end;
        }

        return trim((string) ($label ?? ''));
    }

    /** Display format: "2025 - 26". */
    public static function displayLabel(?string $label): string
    {
        $canonical = static::normalizeLabel($label);
        if (preg_match('/^(\d{4})-(\d{4})$/', $canonical, $matches)) {
            return $matches[1].' - '.substr($matches[2], -2);
        }

        $raw = trim((string) ($label ?? ''));

        return $raw === '' ? '' : preg_replace('/\s*[-–—]\s*/', ' - ', $raw) ?? $raw;
    }

    public static function isValidSpan(?string $label): bool
    {
        $canonical = static::normalizeLabel($label);
        if (! preg_match('/^(\d{4})-(\d{4})$/', $canonical, $matches)) {
            return false;
        }

        return ((int) $matches[2]) === ((int) $matches[1]) + 1;
    }

    public static function resolve(?string $requested): string
    {
        $label = static::normalizeLabel($requested);

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
