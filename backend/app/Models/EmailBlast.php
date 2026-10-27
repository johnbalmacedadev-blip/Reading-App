<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmailBlast extends Model
{
    public const AUDIENCES = [
        'teachers' => 'Teachers',
        'school' => 'Schools',
        'board' => 'School Boards',
    ];

    public const FILTER_LABELS = [
        'subscription' => 'with subscription',
        'essentials' => 'Essentials',
        'insights' => 'Insights',
        'trial' => 'trial',
    ];

    protected $fillable = [
        'created_by',
        'subject',
        'body_html',
        'audiences',
        'audience_filters',
        'attachments',
        'delivered_count',
        'email_sent',
        'email_skipped',
        'email_failed',
    ];

    protected function casts(): array
    {
        return [
            'audiences' => 'array',
            'audience_filters' => 'array',
            'attachments' => 'array',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function audienceLabels(): array
    {
        $filters = $this->audience_filters ?? [];

        return collect($this->audiences ?? [])
            ->map(function ($key) use ($filters) {
                $base = self::AUDIENCES[$key] ?? ucfirst((string) $key);
                $selected = $filters[$key] ?? [];
                if (! is_array($selected) || $selected === []) {
                    return $base;
                }
                $parts = collect($selected)
                    ->map(fn ($f) => self::FILTER_LABELS[$f] ?? $f)
                    ->filter()
                    ->values()
                    ->all();

                return $parts === [] ? $base : $base.' ('.implode(', ', $parts).')';
            })
            ->values()
            ->all();
    }
}
