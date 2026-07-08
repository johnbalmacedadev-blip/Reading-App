<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PedagogicalLesson extends Model
{
    protected $fillable = [
        'pedagogical_unit_id',
        'lesson_number',
        'interactive_path',
        'interactive_format',
        'interactive_size_bytes',
        'activity_sheet_path',
        'activity_sheet_format',
        'activity_sheet_size_bytes',
    ];

    public function unit(): BelongsTo
    {
        return $this->belongsTo(PedagogicalUnit::class, 'pedagogical_unit_id');
    }

    public function hasInteractive(): bool
    {
        return (bool) $this->interactive_path;
    }

    public function hasActivitySheet(): bool
    {
        return (bool) $this->activity_sheet_path;
    }

    public function interactiveViewable(): bool
    {
        return in_array(strtoupper($this->interactive_format ?? ''), ['PDF', 'PPT', 'PPTX'], true);
    }
}
