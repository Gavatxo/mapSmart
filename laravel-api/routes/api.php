<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\GeoController;
use App\Http\Controllers\ImportController;
use App\Http\Controllers\MapController;
use App\Http\Controllers\TerrainController;
use App\Http\Controllers\ZoneController;
use Illuminate\Support\Facades\Route;

// --- Public ---
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);

// --- Authentifié (token Sanctum, données scopées au tenant) ---
Route::middleware('auth:sanctum')->group(function () {
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
    Route::delete('/zones/{zone}', [ZoneController::class, 'destroy']);

    // Services géo
    Route::get('/geocode', [GeoController::class, 'geocode']);
    Route::get('/dvf', [GeoController::class, 'dvf']);
});
