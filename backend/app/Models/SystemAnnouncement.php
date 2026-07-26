<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SystemAnnouncement extends Model
{
    public const CATEGORIES = [
        'scheduled_maintenance',
        'unexpected_outage',
        'feature_release',
        'platform_announcement',
    ];

    protected $fillable = [
        'created_by',
        'category',
        'title',
        'message',
        'url',
        'audience',
        'delivered_count',
        'published_at',
    ];

    protected function casts(): array
    {
        return [
            'published_at' => 'datetime',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function notificationType(): string
    {
        return match ($this->category) {
            'scheduled_maintenance', 'unexpected_outage' => 'warning',
            default => 'info',
        };
    }

    public function categoryLabel(): string
    {
        return match ($this->category) {
            'scheduled_maintenance' => 'Scheduled maintenance',
            'unexpected_outage' => 'Unexpected outage',
            'feature_release' => 'Major feature release',
            'platform_announcement' => 'Important platform announcement',
            default => 'Announcement',
        };
    }
}
