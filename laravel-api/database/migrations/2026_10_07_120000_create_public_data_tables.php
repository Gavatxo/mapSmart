<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Données publiques (DVF, cadastre) : globales, NON scopées par tenant.
 * Ingérées une fois (jobs mapsmart:import-*), interrogées par tous les comptes.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Une ligne par mutation DVF (les lignes du CSV par lot/parcelle sont agrégées).
        Schema::create('dvf_mutations', function (Blueprint $table) {
            $table->string('id_mutation')->primary();
            $table->date('date_mutation');
            $table->string('nature_mutation');
            $table->decimal('valeur_fonciere', 14, 2)->nullable();
            $table->string('type_local')->nullable();      // Maison, Appartement, Dépendance, Local…
            $table->string('categorie', 16);               // maison|appartement|local|dependance|terrain|autre (filtrage)
            $table->float('surface_reelle_bati')->default(0);
            $table->float('surface_terrain')->default(0);
            $table->unsignedSmallInteger('nombre_pieces_principales')->nullable();
            $table->string('nature_culture')->nullable();  // terrains à bâtir, sols, terres…
            $table->string('adresse')->nullable();
            $table->string('id_parcelle')->nullable();
            $table->string('code_commune', 5);
            $table->string('code_departement', 3);
            $table->unsignedSmallInteger('annee');
            $table->index(['code_departement', 'annee']);
            $table->index(['categorie', 'date_mutation']);
        });

        // Parcelles cadastrales (Etalab, PCI vecteur).
        Schema::create('cadastre_parcelles', function (Blueprint $table) {
            $table->string('id', 14)->primary();           // IDU : commune + préfixe + section + numéro
            $table->string('commune', 5)->index();
            $table->string('section', 2);
            $table->string('numero', 4);
            $table->unsignedInteger('contenance')->nullable(); // surface cadastrale (m²)
        });

        // Suivi des imports : idempotence + affichage de la couverture.
        Schema::create('public_dataset_imports', function (Blueprint $table) {
            $table->id();
            $table->string('dataset');   // dvf | cadastre
            $table->string('scope');     // département (dvf) ou commune (cadastre)
            $table->string('version');   // année DVF ou millésime cadastre
            $table->unsignedInteger('rows')->default(0);
            $table->timestamp('imported_at');
            $table->unique(['dataset', 'scope', 'version']);
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE dvf_mutations ADD COLUMN geom geometry(Point, 4326)');
            DB::statement('CREATE INDEX dvf_mutations_geom_gist ON dvf_mutations USING GIST (geom)');
            DB::statement('ALTER TABLE cadastre_parcelles ADD COLUMN geom geometry(MultiPolygon, 4326)');
            DB::statement('CREATE INDEX cadastre_parcelles_geom_gist ON cadastre_parcelles USING GIST (geom)');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('public_dataset_imports');
        Schema::dropIfExists('cadastre_parcelles');
        Schema::dropIfExists('dvf_mutations');
    }
};
