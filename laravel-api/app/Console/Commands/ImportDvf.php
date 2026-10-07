<?php

namespace App\Console\Commands;

use App\Jobs\ImportDvfJob;
use Illuminate\Console\Command;

class ImportDvf extends Command
{
    protected $signature = 'mapsmart:import-dvf
        {departements?* : Codes département (défaut : MAPSMART_DEPARTEMENTS)}
        {--years= : Années séparées par des virgules (défaut : DVF_INGEST_YEARS)}
        {--sync : Exécuter immédiatement au lieu de passer par la file}';

    protected $description = 'Charge les ventes DVF (geo-dvf Etalab) en base PostGIS';

    public function handle(): int
    {
        $deps = $this->argument('departements') ?: config('mapsmart.ingestion.departements');
        $years = $this->option('years') ? explode(',', $this->option('years')) : config('mapsmart.ingestion.dvf_years');

        foreach ($deps as $dep) {
            foreach ($years as $year) {
                $job = new ImportDvfJob(trim($dep), (int) $year);
                if ($this->option('sync')) {
                    $this->components->task("DVF {$dep}/{$year}", fn () => dispatch_sync($job));
                } else {
                    dispatch($job);
                }
            }
        }

        if (! $this->option('sync')) {
            $this->components->info(count($deps) * count($years) . ' import(s) DVF mis en file (php artisan horizon pour les exécuter).');
        }

        return self::SUCCESS;
    }
}
