<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ResourceAccessGrant extends Model
{
    protected $fillable = [
        'grantee_type',
        'grantee_id',
        'enabled',
    ];

    protected $casts = [
        'enabled' => 'boolean',
        'grantee_id' => 'integer',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(ResourceAccessItem::class, 'grant_id');
    }
}
