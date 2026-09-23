<?php

namespace App\Http\Controllers;

use App\Models\Map;
use App\Models\Terrain;

class TerrainController extends Controller
{
    /** Terrains d'une carte au format GeoJSON FeatureCollection (consommé par MapLibre). */
    public function index(Map $map)
    {
        $features = Terrain::where('map_id', $map->id)->get()->map(fn (Terrain $t) => [
            'type' => 'Feature',
            'geometry' => $t->geojson,
            'properties' => [
                'id' => $t->id,
                'name' => $t->name,
                'description' => $t->description,
                'layer' => $t->layer,
            ],
        ]);

        return response()->json([
            'type' => 'FeatureCollection',
            'features' => $features,
        ]);
    }
}
