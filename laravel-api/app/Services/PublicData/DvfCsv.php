<?php

namespace App\Services\PublicData;

/**
 * Lecture des CSV geo-dvf (Etalab) : une ligne par lot/parcelle, agrégées ici
 * en une entrée par mutation. Partagé entre l'ingestion en base et le
 * mode « à la volée » (communes non encore chargées).
 */
class DvfCsv
{
    /** Natures retenues : ventes et adjudications (échanges / expropriations exclus). */
    public const NATURES = ['Vente', "Vente en l'état futur d'achèvement", 'Vente terrain à bâtir', 'Adjudication'];

    /**
     * @param  iterable<string>  $lines  lignes brutes, en-tête comprise
     * @return array<string, array>  mutations indexées par id_mutation
     */
    public static function aggregate(iterable $lines): array
    {
        $header = null;
        $mutations = [];
        $types = [];

        foreach ($lines as $line) {
            $line = rtrim($line, "\r\n");
            if ($line === '') {
                continue;
            }
            $cols = str_getcsv($line, ',', '"', '');
            if ($header === null) {
                $header = $cols;

                continue;
            }
            $row = count($cols) === count($header) ? array_combine($header, $cols) : null;
            if (! $row || $row['latitude'] === '' || $row['longitude'] === '') {
                continue;
            }

            $id = $row['id_mutation'];
            $m = $mutations[$id] ?? [
                'id_mutation' => $id,
                'date_mutation' => $row['date_mutation'],
                'nature_mutation' => $row['nature_mutation'],
                'valeur_fonciere' => $row['valeur_fonciere'] === '' ? null : (float) $row['valeur_fonciere'],
                'type_local' => null,
                'categorie' => 'autre',
                'surface_reelle_bati' => 0.0,
                'surface_terrain' => 0.0,
                'nombre_pieces_principales' => null,
                'nature_culture' => null,
                'adresse' => trim(preg_replace('/\s+/', ' ', "{$row['adresse_numero']} {$row['adresse_nom_voie']} {$row['code_postal']} {$row['nom_commune']}")),
                'id_parcelle' => $row['id_parcelle'] ?: null,
                'code_commune' => $row['code_commune'],
                'code_departement' => $row['code_departement'],
                'lng' => (float) $row['longitude'],
                'lat' => (float) $row['latitude'],
            ];

            if ($row['type_local'] !== '') {
                $types[$id][$row['type_local']] = true;
            }
            $m['type_local'] ??= $row['type_local'] ?: null;
            $m['nature_culture'] ??= $row['nature_culture'] ?: null;
            $m['nombre_pieces_principales'] ??= $row['nombre_pieces_principales'] === '' ? null : (int) $row['nombre_pieces_principales'];
            $m['surface_reelle_bati'] += (float) $row['surface_reelle_bati'];
            $m['surface_terrain'] += (float) $row['surface_terrain'];
            $mutations[$id] = $m;
        }

        foreach ($mutations as $id => &$m) {
            $m['categorie'] = self::categorie(array_keys($types[$id] ?? []), $m['surface_terrain']);
            if (isset($types[$id]['Maison'])) {
                $m['type_local'] = 'Maison';
            } elseif (isset($types[$id]['Appartement'])) {
                $m['type_local'] = 'Appartement';
            }
        }

        return $mutations;
    }

    /** Catégorie de filtrage : le bien principal l'emporte ; sans bâti mais avec surface → terrain. */
    public static function categorie(array $types, float $surfaceTerrain): string
    {
        return match (true) {
            in_array('Maison', $types, true) => 'maison',
            in_array('Appartement', $types, true) => 'appartement',
            in_array('Local industriel. commercial ou assimilé', $types, true) => 'local',
            in_array('Dépendance', $types, true) => 'dependance',
            $surfaceTerrain > 0 => 'terrain',
            default => 'autre',
        };
    }

    /** Propriétés GeoJSON exposées par l'API (même forme en base ou à la volée). */
    public static function properties(array $m): array
    {
        $prixM2 = null;
        if ($m['valeur_fonciere']) {
            if (in_array($m['categorie'], ['maison', 'appartement'], true) && $m['surface_reelle_bati'] > 0) {
                $prixM2 = round($m['valeur_fonciere'] / $m['surface_reelle_bati']);
            } elseif ($m['categorie'] === 'terrain' && $m['surface_terrain'] > 0) {
                $prixM2 = round($m['valeur_fonciere'] / $m['surface_terrain'], 1);
            }
        }

        return [
            'id_mutation' => $m['id_mutation'],
            'date_mutation' => $m['date_mutation'],
            'nature_mutation' => $m['nature_mutation'],
            'valeur_fonciere' => $m['valeur_fonciere'] === null ? null : (float) $m['valeur_fonciere'],
            'categorie' => $m['categorie'],
            'type_local' => $m['type_local'],
            'nature_culture' => $m['nature_culture'],
            'surface_reelle_bati' => (float) $m['surface_reelle_bati'],
            'surface_terrain' => (float) $m['surface_terrain'],
            'nombre_pieces_principales' => $m['nombre_pieces_principales'] === null ? null : (int) $m['nombre_pieces_principales'],
            'prix_m2' => $prixM2,
            'adresse' => $m['adresse'],
            'id_parcelle' => $m['id_parcelle'],
        ];
    }
}
