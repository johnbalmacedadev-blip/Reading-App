<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssessmentAtelierFile extends Model
{
    protected $fillable = [
        'assessment_id',
        'file_path',
        'original_name',
        'file_type',
        'mime_type',
        'file_size_bytes',
        'sort_order',
    ];

    public function assessment(): BelongsTo
    {
        return $this->belongsTo(Assessment::class);
    }

    public function contentType(): string
    {
        return match ($this->file_type) {
            'pdf' => 'application/pdf',
            'pptx' => 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'ppt' => 'application/vnd.ms-powerpoint',
            'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'doc' => 'application/msword',
            default => $this->mime_type ?: 'application/octet-stream',
        };
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
