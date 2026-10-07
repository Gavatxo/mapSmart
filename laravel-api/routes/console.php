<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Données publiques : DVF publié semestriellement, cadastre trimestriellement.
// Les jobs partent dans la file « ingestion » (Horizon). Nécessite `php artisan schedule:work` (ou cron).
Schedule::command('mapsmart:import-dvf')->monthlyOn(5, '03:00');
Schedule::command('mapsmart:import-cadastre')->quarterly()->at('04:00');

// Snapshot des métriques Horizon (graphiques du tableau de bord).
Schedule::command('horizon:snapshot')->everyFiveMinutes();
