<?php

namespace App\Http\Controllers;

use App\Models\KmlImport;
use App\Models\Map;
use App\Models\Terrain;
use App\Services\KmlParser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ImportController extends Controller
{
    public function __construct(private KmlParser $parser) {}

    /** Importe un KML dans une carte : parse serveur → terrains + géométrie PostGIS. */
    public function store(Request $request, Map $map)
    {
        $request->validate([
            'file' => ['required', 'file', 'mimetypes:application/vnd.google-earth.kml+xml,application/xml,text/xml,text/plain', 'max:20480'],
        ]);

        $content = $request->file('file')->get();
        $features = $this->parser->parse($content);

        abort_if(empty($features), 422, 'Aucun élément exploitable dans ce fichier KML.');

        return DB::transaction(function () use ($map, $request, $content, $features) {
            $import = KmlImport::create([
                'map_id' => $map->id,
                'filename' => $request->file('file')->getClientOriginalName(),
                'feature_count' => count($features),
                'raw_kml' => $content,
            ]);

            foreach ($features as $f) {
                Terrain::create([
                    'map_id' => $map->id,
                    'kml_import_id' => $import->id,
                    'name' => $f['name'],
                    'description' => $f['description'],
                    'layer' => $f['layer'],
                    'geom_type' => $f['type'],
                    'geojson' => $f['geojson'],
                ]);
            }

            // Renseigne la colonne géométrique PostGIS à partir du GeoJSON stocké.
            if (DB::getDriverName() === 'pgsql') {
                DB::statement(
                    'UPDATE terrains SET geom = ST_SetSRID(ST_GeomFromGeoJSON(geojson::text), 4326) WHERE kml_import_id = ?',
                    [$import->id]
                );
            }

            return response()->json([
                'import' => $import,
                'feature_count' => count($features),
            ], 201);
        });
    }
}
