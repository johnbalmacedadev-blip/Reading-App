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
        'archived_at',
        'template_id',
        'template_draft',
        'school_board',
        'source_assessment_id',
        'school_id',
        'teacher_id',
    ];

    protected $casts = [
        'template_draft' => 'array',
        'archived_at' => 'datetime',
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
        return $this->school_board === null
            && $this->school_id === null
            && $this->teacher_id === null;
    }

    public function isSchoolCopy(): bool
    {
        return $this->school_id !== null;
    }

    public function isTeacherCopy(): bool
    {
        return $this->teacher_id !== null;
    }

    public function questions(): HasMany
    {
        return $this->hasMany(AssessmentQuestion::class)->orderBy('sort_order');
    }
}
