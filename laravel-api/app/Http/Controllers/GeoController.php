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
}
