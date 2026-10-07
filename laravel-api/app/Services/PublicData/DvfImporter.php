<?php

namespace App\Services\PublicData;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/** Charge en base les mutations DVF d'un département pour une année (idempotent). */
class DvfImporter
{
    private const BATCH = 500;

    /** @return int nombre de mutations chargées */
    public function import(string $departement, int $year): int
    {
        $url = config('mapsmart.dvf.files_url') . "/{$year}/departements/{$departement}.csv.gz";
        $tmp = tempnam(sys_get_temp_dir(), 'dvf');

        try {
            $res = Http::timeout(300)->sink($tmp)->get($url);
            if ($res->status() === 404) {
                return 0; // millésime pas (encore) publié pour ce département
            }
            if (! $res->ok()) {
                throw new RuntimeException("DVF {$departement}/{$year} : HTTP {$res->status()}");
            }

            $mutations = DvfCsv::aggregate($this->gzLines($tmp));
        } finally {
            @unlink($tmp);
        }

        // Fichier vide ou tronqué : on n'efface surtout pas les données déjà en base.
        if (! $mutations) {
            throw new RuntimeException("DVF {$departement}/{$year} : fichier vide, import annulé.");
        }

        DB::transaction(function () use ($departement, $year, $mutations) {
            DB::table('dvf_mutations')->where('code_departement', $departement)->where('annee', $year)->delete();

            foreach (array_chunk($mutations, self::BATCH) as $chunk) {
                $this->insert($chunk, $year);
            }

            ImportLog::record('dvf', $departement, (string) $year, count($mutations));
        });

        return count($mutations);
    }

    private function insert(array $chunk, int $year): void
    {
        $cols = ['id_mutation', 'date_mutation', 'nature_mutation', 'valeur_fonciere', 'type_local', 'categorie',
            'surface_reelle_bati', 'surface_terrain', 'nombre_pieces_principales', 'nature_culture', 'adresse',
            'id_parcelle', 'code_commune', 'code_departement', 'annee'];
        $placeholders = '(' . implode(',', array_fill(0, count($cols), '?')) . ', ST_SetSRID(ST_MakePoint(?, ?), 4326))';

        $bindings = [];
        foreach ($chunk as $m) {
            foreach ($cols as $c) {
                $bindings[] = $c === 'annee' ? $year : $m[$c];
            }
            array_push($bindings, $m['lng'], $m['lat']);
        }

        // Une mutation à cheval sur deux départements apparaît dans les deux fichiers : on garde la première.
        DB::insert(
            'INSERT INTO dvf_mutations (' . implode(',', $cols) . ', geom) VALUES '
            . implode(',', array_fill(0, count($chunk), $placeholders))
            . ' ON CONFLICT (id_mutation) DO NOTHING',
            $bindings
        );
    }

    /** @return \Generator<string> */
    private function gzLines(string $path): \Generator
    {
        $gz = gzopen($path, 'rb');
        if (! $gz) {
            throw new RuntimeException('Archive DVF illisible.');
        }
        try {
            while (($line = gzgets($gz)) !== false) {
                yield $line;
            }
        } finally {
            gzclose($gz);
        }
    }
}
