<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BackupRecord extends Model
{
    protected $fillable = [
        'filename',
        'type',
        'trigger',
        'disk',
        'size',
        'status',
        'error',
        'completed_at',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'size' => 'integer',
            'completed_at' => 'datetime',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
