<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Map extends Model
{
    use BelongsToTenant;

    protected $fillable = ['tenant_id', 'owner_id', 'name', 'view_state'];

    protected $casts = ['view_state' => 'array'];

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function terrains(): HasMany
    {
        return $this->hasMany(Terrain::class);
    }

    public function zones(): HasMany
    {
        return $this->hasMany(SearchZone::class);
    }
}
