<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Clients des services géographiques externes :
 * - BAN (géocodage, gratuit/illimité)
 * - Valhalla auto-hébergé (isochrones temps/distance)
 * - DVF (valeurs foncières, fichiers geo-dvf Etalab)
 */
class GeoServices
{
    /** Géocode une adresse via la Base Adresse Nationale. @return array{lng:float,lat:float,label:string} */
    public function geocode(string $query): array
    {
        $res = Http::acceptJson()->get(config('mapsmart.ban_url') . '/search', [
            'q' => $query, 'limit' => 1,
        ]);

        $feature = $res->json('features.0');
        if (! $res->ok() || ! $feature) {
            throw new RuntimeException('Adresse introuvable.');
        }

        [$lng, $lat] = $feature['geometry']['coordinates'];

        return ['lng' => $lng, 'lat' => $lat, 'label' => $feature['properties']['label'] ?? $query];
    }

    /**
     * Calcule une isochrone via Valhalla.
     *
     * @param  string  $mode  'time' (minutes) ou 'distance' (km)
     * @return array  Feature GeoJSON (Polygon/MultiPolygon)
     */
    public function isochrone(float $lng, float $lat, string $mode, float $value): array
    {
        $contour = $mode === 'time' ? ['time' => $value] : ['distance' => $value];

        $payload = [
            'locations' => [['lat' => $lat, 'lon' => $lng]],
            'costing' => 'auto',
            'contours' => [$contour],
            'polygons' => true,
            'generalize' => 80,
        ];

        $res = Http::get(config('mapsmart.valhalla_url') . '/isochrone', [
            'json' => json_encode($payload),
        ]);

        $features = $res->json('features');
        if (! $res->ok() || empty($features)) {
            throw new RuntimeException('Le calcul routier est momentanément indisponible.');
        }

        return end($features);
    }

    /**
     * Ventes DVF autour d'un point (rayon en mètres).
     *
     * Source : fichiers geo-dvf officiels d'Etalab (CSV par commune et par année,
     * déjà géolocalisés). La commune du point est résolue via geo.api.gouv.fr ;
     * Paris/Lyon/Marseille sont découpés par arrondissement municipal.
     * Limite connue : seule la commune contenant le point est interrogée.
     *
     * @return array<int, array>  Features GeoJSON (Point), une par mutation
     */
    public function dvf(float $lng, float $lat, int $distance = 500): array
    {
        $commune = $this->communeCode($lng, $lat);
        if (! $commune) {
            return [];
        }

        $features = [];
        foreach (config('mapsmart.dvf.years') as $year) {
            foreach ($this->dvfMutations($commune, (int) $year) as $m) {
                if ($this->distanceMeters($lng, $lat, $m['lng'], $m['lat']) > $distance) {
                    continue;
                }
                $features[] = [
                    'type' => 'Feature',
                    'geometry' => ['type' => 'Point', 'coordinates' => [$m['lng'], $m['lat']]],
                    'properties' => array_diff_key($m, ['lng' => 0, 'lat' => 0]),
                ];
            }
        }

        usort($features, fn ($a, $b) => strcmp($b['properties']['date_mutation'], $a['properties']['date_mutation']));

        return $features;
    }

    /** Code INSEE de la commune (ou de l'arrondissement municipal) contenant le point. */
    private function communeCode(float $lng, float $lat): ?string
    {
        foreach (['arrondissement-municipal', 'commune-actuelle'] as $type) {
            $res = Http::acceptJson()->timeout(10)->get(config('mapsmart.geo_api_url') . '/communes', [
                'lat' => $lat, 'lon' => $lng, 'type' => $type, 'fields' => 'code', 'format' => 'json',
            ]);
            if ($code = $res->json('0.code')) {
                return $code;
            }
        }

        return null;
    }

    /**
     * Mutations DVF d'une commune pour une année, regroupées par id_mutation
     * (un CSV contient une ligne par lot/parcelle). Mis en cache 24 h.
     *
     * @return array<int, array>
     */
    private function dvfMutations(string $commune, int $year): array
    {
        return Cache::remember("dvf:{$year}:{$commune}", now()->addDay(), function () use ($commune, $year) {
            $dep = str_starts_with($commune, '97') ? substr($commune, 0, 3) : substr($commune, 0, 2);
            $res = Http::timeout(30)->get(config('mapsmart.dvf.files_url') . "/{$year}/communes/{$dep}/{$commune}.csv");
            if (! $res->ok()) {
                return [];
            }

            $lines = preg_split('/\r?\n/', trim($res->body()));
            $header = str_getcsv(array_shift($lines), ',', '"', '');
            $mutations = [];

            foreach ($lines as $line) {
                $row = array_combine($header, str_getcsv($line, ',', '"', ''));
                if (! $row || $row['latitude'] === '' || $row['longitude'] === '') {
                    continue;
                }

                $id = $row['id_mutation'];
                $m = $mutations[$id] ?? [
                    'id_mutation' => $id,
                    'date_mutation' => $row['date_mutation'],
                    'nature_mutation' => $row['nature_mutation'],
                    'valeur_fonciere' => $row['valeur_fonciere'] === '' ? null : (float) $row['valeur_fonciere'],
                    'adresse' => trim("{$row['adresse_numero']} {$row['adresse_nom_voie']} {$row['code_postal']} {$row['nom_commune']}"),
                    'type_local' => null,
                    'surface_reelle_bati' => 0,
                    'surface_terrain' => 0,
                    'nombre_pieces_principales' => null,
                    'lng' => (float) $row['longitude'],
                    'lat' => (float) $row['latitude'],
                ];

                $m['type_local'] ??= $row['type_local'] ?: null;
                $m['nombre_pieces_principales'] ??= $row['nombre_pieces_principales'] === '' ? null : (int) $row['nombre_pieces_principales'];
                $m['surface_reelle_bati'] += (float) $row['surface_reelle_bati'];
                $m['surface_terrain'] += (float) $row['surface_terrain'];
                $mutations[$id] = $m;
            }

            return array_values($mutations);
        });
    }

    /** Distance haversine en mètres. */
    private function distanceMeters(float $lng1, float $lat1, float $lng2, float $lat2): float
    {
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;

        return 6371000 * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }
}
