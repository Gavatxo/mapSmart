<?php

namespace App\Services\PublicData;

use Illuminate\Support\Facades\DB;

/** Requêtes sur les parcelles cadastrales chargées en base. */
class CadastreRepository
{
    /** Emprise max d'une requête par bbox (degrés) : la couche ne s'affiche qu'à fort zoom. */
    public const MAX_SPAN = 0.05;

    private const LIMIT = 6000;

    /** @return array<int, array> features GeoJSON */
    public function inBbox(float $west, float $south, float $east, float $north): array
    {
        if (DB::getDriverName() !== 'pgsql') {
            return [];
        }

        $rows = DB::select(
            'SELECT id, commune, section, numero, contenance, ST_AsGeoJSON(geom, 7) AS geometry
             FROM cadastre_parcelles WHERE geom && ST_MakeEnvelope(?, ?, ?, ?, 4326) LIMIT ' . self::LIMIT,
            [$west, $south, $east, $north]
        );

        return array_map(fn ($r) => [
            'type' => 'Feature',
            'geometry' => json_decode($r->geometry, true),
            'properties' => [
                'id' => $r->id,
                'commune' => $r->commune,
                'section' => $r->section,
                'numero' => $r->numero,
                'contenance' => $r->contenance,
            ],
        ], $rows);
    }

    /** Parcelle contenant un point (fiche terrain / clic carte). */
    public function at(float $lng, float $lat): ?array
    {
        if (DB::getDriverName() !== 'pgsql') {
            return null;
        }

        $r = DB::selectOne(
            'SELECT id, commune, section, numero, contenance FROM cadastre_parcelles
             WHERE ST_Contains(geom, ST_SetSRID(ST_MakePoint(?, ?), 4326)) LIMIT 1',
            [$lng, $lat]
        );

        return $r ? (array) $r : null;
    }
}
