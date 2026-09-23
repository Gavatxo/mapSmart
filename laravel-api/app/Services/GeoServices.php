<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Clients des services géographiques externes :
 * - BAN (géocodage, gratuit/illimité)
 * - Valhalla auto-hébergé (isochrones temps/distance)
 * - DVF (valeurs foncières, open data)
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

    /** Ventes DVF autour d'un point (rayon en mètres). Passe-plat vers l'API open data. */
    public function dvf(float $lng, float $lat, int $distance = 500): array
    {
        $res = Http::acceptJson()->get(config('mapsmart.dvf_url'), [
            'lat' => $lat, 'lon' => $lng, 'dist' => $distance,
        ]);

        return $res->ok() ? ($res->json('features') ?? []) : [];
    }
}
