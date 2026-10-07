<?php

namespace App\Jobs;

use App\Services\PublicData\DvfImporter;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

/** Ingestion DVF d'un département pour une année (file « ingestion », Horizon). */
class ImportDvfJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public int $timeout = 600;

    public function __construct(public string $departement, public int $year)
    {
        $this->onQueue('ingestion');
    }

    public function handle(DvfImporter $importer): void
    {
        $rows = $importer->import($this->departement, $this->year);
        Log::info("[ingestion] DVF {$this->departement}/{$this->year} : {$rows} mutations");
    }
}
