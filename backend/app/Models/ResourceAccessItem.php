<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ResourceAccessItem extends Model
{
    protected $fillable = [
        'grant_id',
        'kind',
        'resource_key',
    ];

    public function grant(): BelongsTo
    {
        return $this->belongsTo(ResourceAccessGrant::class, 'grant_id');
    }
}
