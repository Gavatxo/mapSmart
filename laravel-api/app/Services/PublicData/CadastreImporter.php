<?php

namespace App\Services\PublicData;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Charge les parcelles cadastrales d'une commune (Etalab, GeoJSON gzippé par commune).
 * Idempotent : les parcelles de la commune sont remplacées.
 */
class CadastreImporter
{
    private const BATCH = 300;

    /** @return int nombre de parcelles chargées */
    public function import(string $commune): int
    {
        $dep = str_starts_with($commune, '97') ? substr($commune, 0, 3) : substr($commune, 0, 2);
        $base = config('mapsmart.ingestion.cadastre_url') . '/' . config('mapsmart.ingestion.cadastre_version');
        $url = "{$base}/geojson/communes/{$dep}/{$commune}/cadastre-{$commune}-parcelles.json.gz";

        $res = Http::timeout(120)->get($url);
        if ($res->status() === 404) {
            return 0; // commune sans PCI vecteur (ou code sans fichier, ex. 75056)
        }
        if (! $res->ok()) {
            throw new RuntimeException("Cadastre {$commune} : HTTP {$res->status()}");
        }

        $json = $this->decode($res->body());
        $features = json_decode($json, true, flags: JSON_THROW_ON_ERROR)['features'] ?? [];

        DB::transaction(function () use ($commune, $features) {
            DB::table('cadastre_parcelles')->where('commune', $commune)->delete();

            foreach (array_chunk($features, self::BATCH) as $chunk) {
                $values = [];
                $bindings = [];
                foreach ($chunk as $f) {
                    $p = $f['properties'] ?? [];
                    if (empty($p['id']) || empty($f['geometry'])) {
                        continue;
                    }
                    $values[] = '(?, ?, ?, ?, ?, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(?), 4326)))';
                    array_push($bindings, $p['id'], $p['commune'] ?? $commune, $p['section'] ?? '', $p['numero'] ?? '',
                        $p['contenance'] ?? null, json_encode($f['geometry']));
                }
                if ($values) {
                    DB::insert('INSERT INTO cadastre_parcelles (id, commune, section, numero, contenance, geom) VALUES '
                        . implode(',', $values) . ' ON CONFLICT (id) DO NOTHING', $bindings);
                }
            }

            ImportLog::record('cadastre', $commune, config('mapsmart.ingestion.cadastre_version'), count($features));
        });

        return count($features);
    }

    /** Le serveur peut renvoyer le .gz brut ou déjà décompressé selon les en-têtes. */
    private function decode(string $body): string
    {
        if (str_starts_with($body, "\x1f\x8b")) {
            $out = gzdecode($body);
            if ($out === false) {
                throw new RuntimeException('Archive cadastre illisible.');
            }

            return $out;
        }

        return $body;
    }
}
