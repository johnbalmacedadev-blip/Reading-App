<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SchoolBoard extends Model
{
    protected $fillable = [
        'name',
        'contact_person',
        'code',
        'region',
        'status',
        'portal_password_encrypted',
        'settings',
    ];

    protected function casts(): array
    {
        return [
            'settings' => 'array',
        ];
    }

    public function schools(): HasMany
    {
        return $this->hasMany(School::class, 'school_board', 'code');
    }

    /** @return array<string, mixed> */
    public static function defaultSettings(): array
    {
        return [
            'allow_french' => true,
            'allow_english' => true,
            'teachers_change_language' => true,
            'schools_modify_ateliers' => true,
            'lock_ateliers_1_to_17' => false,
            'allow_schools_export' => true,
            'allow_not_required' => true,
            'share_anonymous_data' => true,
            'active_school_year' => null,
            'thresholds' => [
                'on_track' => 75,
                'monitor' => 50,
                'at_risk' => 50,
            ],
            'notifications' => [
                'email' => true,
                'progress_alerts' => true,
            ],
        ];
    }

    /** @return array<string, mixed> */
    public function mergedSettings(): array
    {
        $defaults = self::defaultSettings();
        $stored = is_array($this->settings) ? $this->settings : [];

        $merged = array_replace_recursive($defaults, $stored);

        $merged['thresholds'] = array_merge(
            $defaults['thresholds'],
            is_array($stored['thresholds'] ?? null) ? $stored['thresholds'] : []
        );
        $merged['notifications'] = array_merge(
            $defaults['notifications'],
            is_array($stored['notifications'] ?? null) ? $stored['notifications'] : []
        );

        return $merged;
    }
}
