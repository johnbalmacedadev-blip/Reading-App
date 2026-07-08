<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SchoolBoard extends Model
{
    protected $fillable = [
        'name',
        'code',
        'region',
        'status',
        'portal_password_encrypted',
    ];

    public function schools(): HasMany
    {
        return $this->hasMany(School::class, 'school_board', 'code');
    }
}
