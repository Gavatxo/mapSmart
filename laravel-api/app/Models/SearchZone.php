<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SearchZone extends Model
{
    use BelongsToTenant;

    protected $fillable = ['tenant_id', 'map_id', 'label', 'mode', 'value', 'origin', 'geojson'];

    protected $casts = ['origin' => 'array', 'geojson' => 'array'];

    public function map(): BelongsTo
    {
        return $this->belongsTo(Map::class);
    }
}
