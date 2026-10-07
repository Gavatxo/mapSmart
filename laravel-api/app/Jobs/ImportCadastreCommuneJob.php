<?php

namespace App\Jobs;

use App\Services\PublicData\CadastreImporter;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/** Ingestion des parcelles cadastrales d'une commune (file « ingestion », Horizon). */
class ImportCadastreCommuneJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public int $timeout = 300;

    public function __construct(public string $commune)
    {
        $this->onQueue('ingestion');
    }

    public function handle(CadastreImporter $importer): void
    {
        $importer->import($this->commune);
    }
}
