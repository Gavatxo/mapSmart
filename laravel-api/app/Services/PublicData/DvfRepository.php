<?php

namespace App\Services\PublicData;

use App\Models\Map;
use Illuminate\Support\Facades\DB;

/**
 * Requêtes sur les ventes DVF chargées en base (PostGIS).
 *
 * Filtres communs : $since (mois glissants), $categories (maison, appartement,
 * terrain, local, dependance, autre). Seules les ventes/adjudications sont retenues.
 */
class DvfRepository
{
    public const CATEGORIES = ['maison', 'appartement', 'terrain', 'local', 'dependance', 'autre'];

    private const LIMIT = 5000;

    public function available(): bool
    {
        return DB::getDriverName() === 'pgsql';
    }

    /** Vrai si la base contient des ventes à proximité (sinon : mode « à la volée » par fichiers). */
    public function hasCoverageNear(float $lng, float $lat): bool
    {
        return $this->available() && DB::selectOne(
            'SELECT 1 AS ok FROM dvf_mutations WHERE geom && ST_MakeEnvelope(?, ?, ?, ?, 4326) LIMIT 1',
            self::envelope($lng, $lat, 3000)
        ) !== null;
    }

    /** @return array<int, array> features GeoJSON */
    public function around(float $lng, float $lat, int $meters, int $since, array $categories): array
    {
        [$where, $bindings] = $this->filters($since, $categories);

        // `&&` sur l'emprise utilise l'index GIST ; ST_DWithin (géographie) affine au mètre près.
        return $this->select(
            "{$where} AND d.geom && ST_MakeEnvelope(?, ?, ?, ?, 4326)
             AND ST_DWithin(d.geom::geography, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography, ?)",
            [...$bindings, ...self::envelope($lng, $lat, $meters), $lng, $lat, $meters]
        );
    }

    /** Ventes situées dans TOUTES les zones de la carte (même logique A∩B que les terrains). */
    public function inZones(Map $map, int $since, array $categories): array
    {
        $zoneCount = DB::table('search_zones')->where('map_id', $map->id)->whereNotNull('geom')->count();
        if ($zoneCount === 0) {
            return [];
        }

        [$where, $bindings] = $this->filters($since, $categories);

        return $this->select(
            "{$where}
             AND d.geom && (SELECT ST_SetSRID(ST_Extent(z.geom)::geometry, 4326) FROM search_zones z WHERE z.map_id = ? AND z.geom IS NOT NULL)
             AND (SELECT count(*) FROM search_zones z WHERE z.map_id = ? AND z.geom IS NOT NULL AND ST_Intersects(d.geom, z.geom)) = ?",
            [...$bindings, $map->id, $map->id, $zoneCount]
        );
    }

    /** Synthèse d'un lot de ventes : volumes, prix médians, prix médians au m² par catégorie. */
    public static function stats(array $features): array
    {
        $byCat = [];
        $prices = [];
        foreach ($features as $f) {
            $p = $f['properties'];
            $byCat[$p['categorie']]['count'] = ($byCat[$p['categorie']]['count'] ?? 0) + 1;
            if ($p['valeur_fonciere']) {
                $byCat[$p['categorie']]['prix'][] = $p['valeur_fonciere'];
                $prices[] = $p['valeur_fonciere'];
            }
            if ($p['prix_m2']) {
                $byCat[$p['categorie']]['m2'][] = $p['prix_m2'];
            }
        }

        $categories = [];
        foreach ($byCat as $cat => $v) {
            $categories[$cat] = [
                'count' => $v['count'],
                'prix_median' => self::median($v['prix'] ?? []),
                'prix_m2_median' => self::median($v['m2'] ?? []),
            ];
        }
        uasort($categories, fn ($a, $b) => $b['count'] <=> $a['count']);

        return [
            'count' => count($features),
            'prix_median' => self::median($prices),
            'categories' => $categories,
            'truncated' => count($features) >= self::LIMIT,
        ];
    }

    /** Applique les mêmes filtres à des features issues des fichiers (mode à la volée). */
    public static function filterFeatures(array $features, int $since, array $categories): array
    {
        $from = now()->subMonths($since)->toDateString();

        return array_values(array_filter($features, fn ($f) => in_array($f['properties']['nature_mutation'], DvfCsv::NATURES, true)
            && $f['properties']['date_mutation'] >= $from
            && in_array($f['properties']['categorie'], $categories, true)));
    }

    private function filters(int $since, array $categories): array
    {
        $natures = implode(',', array_fill(0, count(DvfCsv::NATURES), '?'));
        $cats = implode(',', array_fill(0, count($categories), '?'));

        return [
            "d.nature_mutation IN ({$natures}) AND d.date_mutation >= ? AND d.categorie IN ({$cats})",
            [...DvfCsv::NATURES, now()->subMonths($since)->toDateString(), ...$categories],
        ];
    }

    private function select(string $where, array $bindings): array
    {
        $rows = DB::select(
            "SELECT d.*, ST_X(d.geom) AS lng, ST_Y(d.geom) AS lat FROM dvf_mutations d
             WHERE {$where} ORDER BY d.date_mutation DESC LIMIT " . self::LIMIT,
            $bindings
        );

        return array_map(fn ($r) => [
            'type' => 'Feature',
            'geometry' => ['type' => 'Point', 'coordinates' => [(float) $r->lng, (float) $r->lat]],
            'properties' => DvfCsv::properties((array) $r + ['valeur_fonciere' => null]),
        ], $rows);
    }

    /** Emprise (ouest, sud, est, nord) englobant un cercle de $meters autour du point. */
    private static function envelope(float $lng, float $lat, int $meters): array
    {
        $dLat = $meters / 111320;
        $dLng = $meters / (111320 * max(cos(deg2rad($lat)), 0.01));

        return [$lng - $dLng, $lat - $dLat, $lng + $dLng, $lat + $dLat];
    }

    private static function median(array $values): ?float
    {
        if (! $values) {
            return null;
        }
        sort($values);
        $n = count($values);
        $mid = intdiv($n, 2);

        return round($n % 2 ? $values[$mid] : ($values[$mid - 1] + $values[$mid]) / 2, 1);
    }
}
