<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LibraryContent extends Model
{
    protected $fillable = [
        'title',
        'type',
        'unit',
        'atelier',
        'format',
        'file_size_bytes',
        'file_path',
        'uploader',
        'interactive_view',
    ];

    protected function casts(): array
    {
        return [
            'interactive_view' => 'boolean',
        ];
    }

    public function formattedSize(): string
    {
        $bytes = $this->file_size_bytes;

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
