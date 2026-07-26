<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TeacherNotification extends Model
{
    protected $fillable = [
        'teacher_id',
        'event_key',
        'type',
        'title',
        'message',
        'url',
        'read_at',
        'dismissed_at',
    ];

    protected function casts(): array
    {
        return [
            'read_at' => 'datetime',
            'dismissed_at' => 'datetime',
        ];
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }
}
