<?php

namespace App\Http\Controllers;

use App\Services\GeoServices;
use Illuminate\Http\Request;

class GeoController extends Controller
{
    public function __construct(private GeoServices $geo) {}

    /** Géocodage d'adresse (proxy BAN). */
    public function geocode(Request $request)
    {
        $data = $request->validate(['q' => ['required', 'string', 'min:3']]);

        return response()->json($this->geo->geocode($data['q']));
    }

    /** Ventes DVF (open data) autour d'un point. */
    public function dvf(Request $request)
    {
        $data = $request->validate([
            'lng' => ['required', 'numeric'],
            'lat' => ['required', 'numeric'],
            'dist' => ['nullable', 'integer', 'min:50', 'max:5000'],
        ]);

        return response()->json([
            'type' => 'FeatureCollection',
            'features' => $this->geo->dvf($data['lng'], $data['lat'], $data['dist'] ?? 500),
        ]);
    }
}
