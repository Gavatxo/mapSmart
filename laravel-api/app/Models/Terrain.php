<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Terrain extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id', 'map_id', 'kml_import_id',
        'name', 'description', 'layer', 'geom_type', 'geojson',
    ];

    protected $casts = ['geojson' => 'array'];

    public function map(): BelongsTo
    {
        return $this->belongsTo(Map::class);
    }
}
