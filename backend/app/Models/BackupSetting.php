<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BackupSetting extends Model
{
    protected $fillable = [
        'enabled',
        'frequency',
        'time',
        'day_of_week',
        'day_of_month',
        'backup_type',
        'retention_count',
        'timezone',
        'last_run_at',
    ];

    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
            'day_of_week' => 'integer',
            'day_of_month' => 'integer',
            'retention_count' => 'integer',
            'last_run_at' => 'datetime',
        ];
    }

    public static function current(): self
    {
        $settings = self::query()->first();

        if ($settings) {
            return $settings;
        }

        return self::query()->create([
            'enabled' => false,
            'frequency' => 'daily',
            'time' => '02:00',
            'day_of_week' => 0,
            'day_of_month' => 1,
            'backup_type' => 'database',
            'retention_count' => 7,
            'timezone' => config('backup.timezone'),
        ])->refresh();
    }
}
