<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentEvaluation extends Model
{
    protected $fillable = [
        'student_id',
        'class_id',
        'atelier_number',
        'status',
        'not_required',
        'comment',
        'responses',
    ];

    protected function casts(): array
    {
        return [
            'not_required' => 'boolean',
            'responses' => 'array',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function schoolClass(): BelongsTo
    {
        return $this->belongsTo(SchoolClass::class, 'class_id');
    }
}
