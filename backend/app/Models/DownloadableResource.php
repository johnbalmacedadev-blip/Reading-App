<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DownloadableResource extends Model
{
    protected $fillable = [
        'downloadable_category_id',
        'title',
        'file_path',
        'file_format',
        'file_size_bytes',
        'sort_order',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(DownloadableCategory::class, 'downloadable_category_id');
    }

    public function formattedSize(): string
    {
        $bytes = (int) ($this->file_size_bytes ?? 0);

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
