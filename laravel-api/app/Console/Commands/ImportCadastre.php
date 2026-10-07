<?php

namespace App\Console\Commands;

use App\Jobs\ImportCadastreCommuneJob;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class ImportCadastre extends Command
{
    protected $signature = 'mapsmart:import-cadastre
        {departements?* : Codes département (défaut : MAPSMART_DEPARTEMENTS)}
        {--communes= : Codes INSEE séparés par des virgules (au lieu des départements)}
        {--sync : Exécuter immédiatement au lieu de passer par la file}';

    protected $description = 'Charge les parcelles cadastrales (Etalab) en base PostGIS, commune par commune';

    public function handle(): int
    {
        $communes = $this->option('communes')
            ? array_map('trim', explode(',', $this->option('communes')))
            : $this->communesOf($this->argument('departements') ?: config('mapsmart.ingestion.departements'));

        if (! $communes) {
            $this->components->error('Aucune commune trouvée.');

            return self::FAILURE;
        }

        if ($this->option('sync')) {
            $bar = $this->output->createProgressBar(count($communes));
            foreach ($communes as $code) {
                dispatch_sync(new ImportCadastreCommuneJob($code));
                $bar->advance();
            }
            $bar->finish();
            $this->newLine();
        } else {
            foreach ($communes as $code) {
                dispatch(new ImportCadastreCommuneJob($code));
            }
            $this->components->info(count($communes) . ' commune(s) mises en file (php artisan horizon pour les exécuter).');
        }

        return self::SUCCESS;
    }

    /** Communes (et arrondissements municipaux pour Paris/Lyon/Marseille) des départements. */
    private function communesOf(array $departements): array
    {
        $codes = [];
        foreach ($departements as $dep) {
            $res = Http::acceptJson()->timeout(30)->get(config('mapsmart.geo_api_url') . "/departements/{$dep}/communes", [
                'type' => 'commune-actuelle,arrondissement-municipal', 'fields' => 'code', 'format' => 'json',
            ]);
            foreach ($res->json() ?? [] as $c) {
                $codes[] = $c['code'];
            }
        }

        return array_values(array_unique($codes));
    }
}
