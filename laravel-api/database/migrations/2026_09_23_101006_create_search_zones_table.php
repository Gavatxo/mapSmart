<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('search_zones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('map_id')->constrained()->cascadeOnDelete();
            $table->string('label')->nullable();
            $table->string('mode'); // time | distance | polygon
            $table->float('value')->nullable(); // minutes (time) ou km (distance)
            $table->json('origin')->nullable(); // [lng, lat] du point de départ
            $table->json('geojson')->nullable(); // polygone de la zone (isochrone calculée), en cache
            $table->timestamps();
            $table->index(['tenant_id', 'map_id']);
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE search_zones ADD COLUMN geom geometry(Geometry, 4326);');
            DB::statement('CREATE INDEX search_zones_geom_gist ON search_zones USING GIST (geom);');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('search_zones');
    }
};
