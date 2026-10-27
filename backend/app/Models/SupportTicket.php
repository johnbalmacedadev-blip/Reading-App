<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupportTicket extends Model
{
    public const STATUSES = ['open', 'in_progress', 'resolved', 'closed'];

    public const CATEGORIES = ['general', 'technical', 'billing', 'account', 'other'];

    public const PRIORITIES = ['low', 'normal', 'high'];

    protected $fillable = [
        'user_id',
        'subject',
        'message',
        'category',
        'status',
        'priority',
        'admin_notes',
        'resolved_at',
    ];

    protected function casts(): array
    {
        return [
            'resolved_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function categoryLabel(): string
    {
        return match ($this->category) {
            'technical' => 'Technical',
            'billing' => 'Billing',
            'account' => 'Account',
            'other' => 'Other',
            default => 'General',
        };
    }

    public function statusLabel(): string
    {
        return match ($this->status) {
            'in_progress' => 'In progress',
            'resolved' => 'Resolved',
            'closed' => 'Closed',
            default => 'Open',
        };
    }
}
