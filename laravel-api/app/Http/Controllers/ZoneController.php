<?php

namespace App\Http\Controllers;

use App\Models\Map;
use App\Models\SearchZone;
use App\Models\Terrain;
use App\Services\GeoServices;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ZoneController extends Controller
{
    public function __construct(private GeoServices $geo) {}

    /**
     * Crée une zone de recherche.
     * - time/distance : calcule l'isochrone via Valhalla.
     * - polygon : utilise le polygone fourni (dessiné à la main).
     */
    public function store(Request $request, Map $map)
    {
        $data = $request->validate([
            'label' => ['nullable', 'string', 'max:255'],
            'mode' => ['required', 'in:time,distance,polygon'],
            'value' => ['nullable', 'numeric', 'min:1', 'max:180'],
            'origin' => ['nullable', 'array', 'size:2'], // [lng, lat]
            'geojson' => ['nullable', 'array'],
        ]);

        if ($data['mode'] === 'polygon') {
            abort_unless($data['geojson'] ?? null, 422, 'Un polygone est requis en mode polygon.');
            $geometry = $data['geojson'];
        } else {
            abort_unless($data['origin'] ?? null, 422, 'Un point de départ est requis.');
            [$lng, $lat] = $data['origin'];
            $feature = $this->geo->isochrone($lng, $lat, $data['mode'], (float) $data['value']);
            $geometry = $feature['geometry'] ?? $feature;
        }

        $zone = SearchZone::create([
            'map_id' => $map->id,
            'label' => $data['label'] ?? null,
            'mode' => $data['mode'],
            'value' => $data['value'] ?? null,
            'origin' => $data['origin'] ?? null,
            'geojson' => $geometry,
        ]);

        if (DB::getDriverName() === 'pgsql') {
            DB::statement(
                'UPDATE search_zones SET geom = ST_SetSRID(ST_GeomFromGeoJSON(?), 4326) WHERE id = ?',
                [json_encode($geometry), $zone->id]
            );
        }

        return response()->json($zone, 201);
    }

    public function destroy(SearchZone $zone)
    {
        $zone->delete();

        return response()->noContent();
    }

    /**
     * Terrains compatibles : présents dans l'intersection de TOUTES les zones
     * de la carte (comportement A∩B du prototype). Sans zone → tous les terrains.
     */
    public function results(Map $map)
    {
        $zoneCount = SearchZone::where('map_id', $map->id)->whereNotNull('geojson')->count();

        $query = Terrain::where('map_id', $map->id);

        if ($zoneCount > 0 && DB::getDriverName() === 'pgsql') {
            $query->whereRaw(
                '(SELECT count(*) FROM search_zones z WHERE z.map_id = terrains.map_id
                    AND z.geom IS NOT NULL AND ST_Within(terrains.geom, z.geom)) = ?',
                [$zoneCount]
            );
        }

        $terrains = $query->get();

        return response()->json([
            'count' => $terrains->count(),
            'terrains' => $terrains,
        ]);
    }
}
