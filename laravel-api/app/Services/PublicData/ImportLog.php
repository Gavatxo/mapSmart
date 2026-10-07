<?php

namespace App\Services\PublicData;

use Illuminate\Support\Facades\DB;

/** Journal des imports de données publiques (couverture affichée dans l'app). */
class ImportLog
{
    public static function record(string $dataset, string $scope, string $version, int $rows): void
    {
        DB::table('public_dataset_imports')->upsert(
            [['dataset' => $dataset, 'scope' => $scope, 'version' => $version, 'rows' => $rows, 'imported_at' => now()]],
            ['dataset', 'scope', 'version'],
            ['rows', 'imported_at'],
        );
    }
}
