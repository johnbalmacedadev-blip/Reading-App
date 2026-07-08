<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PedagogicalUnit extends Model
{
    protected $fillable = [
        'title',
        'description',
        'color',
        'text_color',
        'atelier_numbers',
        'sort_order',
        'quick_sheet_path',
        'quick_sheet_format',
        'quick_sheet_size_bytes',
    ];

    protected function casts(): array
    {
        return [
            'atelier_numbers' => 'array',
        ];
    }

    public function lessons(): HasMany
    {
        return $this->hasMany(PedagogicalLesson::class)->orderBy('lesson_number');
    }

    public function lessonCount(): int
    {
        return $this->lessons()->count();
    }

    public function atelierCount(): int
    {
        return count($this->atelier_numbers ?? []);
    }

    public function formattedQuickSheetSize(): string
    {
        return $this->formatBytes((int) ($this->quick_sheet_size_bytes ?? 0));
    }

    private function formatBytes(int $bytes): string
    {
        if ($bytes <= 0) {
            return '—';
        }

        if ($bytes < 1024) {
            return $bytes.' B';
        }

        if ($bytes < 1024 * 1024) {
            return round($bytes / 1024, 1).' KB';
        }

        return round($bytes / (1024 * 1024), 1).' MB';
    }
}
