<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\GeoController;
use App\Http\Controllers\ImportController;
use App\Http\Controllers\MapController;
use App\Http\Controllers\PublicDataController;
use App\Http\Controllers\TerrainController;
use App\Http\Controllers\ZoneController;
use Illuminate\Support\Facades\Route;

// --- Public (limité contre le bruteforce) ---
Route::middleware('throttle:auth')->group(function () {
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/auth/reset-password', [AuthController::class, 'resetPassword']);
});

// --- Authentifié (token Sanctum, données scopées au tenant) ---
Route::middleware(['auth:sanctum', 'throttle:api'])->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // Cartes
    Route::apiResource('maps', MapController::class);

    // Contenu d'une carte
    Route::get('/maps/{map}/terrains', [TerrainController::class, 'index']);
    Route::post('/maps/{map}/imports', [ImportController::class, 'store']);
    Route::get('/maps/{map}/zones', [ZoneController::class, 'index']);
    Route::post('/maps/{map}/zones', [ZoneController::class, 'store']);
    Route::delete('/maps/{map}/zones', [ZoneController::class, 'clear']);
    Route::get('/maps/{map}/results', [ZoneController::class, 'results']);
    Route::get('/maps/{map}/dvf', [PublicDataController::class, 'dvfInZones']);
    Route::patch('/zones/{zone}', [ZoneController::class, 'update']);
    Route::delete('/zones/{zone}', [ZoneController::class, 'destroy']);

    // Services géo
    Route::get('/geocode', [GeoController::class, 'geocode']);

    // Données publiques (DVF, cadastre)
    Route::get('/dvf', [PublicDataController::class, 'dvfAround']);
    Route::get('/cadastre', [PublicDataController::class, 'cadastre']);
    Route::get('/cadastre/parcelle', [PublicDataController::class, 'parcelleAt']);
    Route::get('/public-data/coverage', [PublicDataController::class, 'coverage']);
});
