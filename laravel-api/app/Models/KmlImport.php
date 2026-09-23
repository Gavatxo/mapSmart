<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;

class KmlImport extends Model
{
    use BelongsToTenant;

    protected $fillable = ['tenant_id', 'map_id', 'filename', 'feature_count', 'raw_kml'];
}
