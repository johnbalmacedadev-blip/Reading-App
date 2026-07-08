<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssessmentQuestion extends Model
{
    protected $fillable = [
        'assessment_id',
        'sort_order',
        'text',
        'options',
        'correct_index',
    ];

    protected function casts(): array
    {
        return [
            'options' => 'array',
        ];
    }

    public function assessment(): BelongsTo
    {
        return $this->belongsTo(Assessment::class);
    }
}
