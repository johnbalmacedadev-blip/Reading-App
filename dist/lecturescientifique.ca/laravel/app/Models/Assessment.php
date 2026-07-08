<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Assessment extends Model
{
    protected $fillable = [
        'title',
        'unit',
        'atelier',
        'grade',
        'status',
        'school_board',
        'source_assessment_id',
    ];

    public function sourceAssessment(): BelongsTo
    {
        return $this->belongsTo(Assessment::class, 'source_assessment_id');
    }

    public function boardCopies(): HasMany
    {
        return $this->hasMany(Assessment::class, 'source_assessment_id');
    }

    public function isPlatformOriginal(): bool
    {
        return $this->school_board === null;
    }

    public function questions(): HasMany
    {
        return $this->hasMany(AssessmentQuestion::class)->orderBy('sort_order');
    }
}
