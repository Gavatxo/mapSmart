<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('terrains', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('map_id')->constrained()->cascadeOnDelete();
            $table->foreignId('kml_import_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('layer')->nullable();
            $table->string('geom_type'); // Point | Polygon | LineString
            $table->json('geojson');     // géométrie GeoJSON exacte (coords Google conservées)
            $table->timestamps();
            $table->index(['tenant_id', 'map_id']);
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE terrains ADD COLUMN geom geometry(Geometry, 4326);');
            DB::statement('CREATE INDEX terrains_geom_gist ON terrains USING GIST (geom);');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('terrains');
    }
};
