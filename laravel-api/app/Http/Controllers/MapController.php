<?php

namespace App\Http\Controllers;

use App\Models\Map;
use Illuminate\Http\Request;

class MapController extends Controller
{
    public function index()
    {
        return Map::latest()->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'view_state' => ['nullable', 'array'],
        ]);

        $data['owner_id'] = $request->user()->id;

        return response()->json(Map::create($data), 201);
    }

    public function show(Map $map)
    {
        return $map->load(['zones']);
    }

    public function update(Request $request, Map $map)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'view_state' => ['nullable', 'array'],
        ]);

        $map->update($data);

        return $map;
    }

    public function destroy(Map $map)
    {
        $map->delete();

        return response()->noContent();
    }
}
