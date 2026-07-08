<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DownloadableCategory extends Model
{
    protected $fillable = [
        'title',
        'slug',
        'color',
        'sort_order',
    ];

    public function resources(): HasMany
    {
        return $this->hasMany(DownloadableResource::class)->orderBy('sort_order');
    }
}
