<?php

namespace Tests\Feature;

use App\Models\Map;
use App\Models\SearchZone;
use App\Models\Tenant;
use App\Models\User;
use App\Services\PublicData\DvfImporter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Phase 2 : ingestion DVF / cadastre en base et requêtes spatiales.
 * Ignoré sur SQLite : `composer test:postgis`.
 *
 * @group postgis
 */
class PublicDataPostgisTest extends TestCase
{
    use RefreshDatabase;

    private Map $map;

    protected function setUp(): void
    {
        parent::setUp();

        if (DB::getDriverName() !== 'pgsql') {
            $this->markTestSkipped('Nécessite PostgreSQL + PostGIS (composer test:postgis).');
        }

        $user = User::factory()->create(['tenant_id' => Tenant::create(['name' => 'Agence'])->id]);
        Sanctum::actingAs($user);
        $this->map = Map::create(['owner_id' => $user->id, 'name' => 'Carte']);

        $year = now()->year;
        Http::fake([
            "files.data.gouv.fr/geo-dvf/latest/csv/{$year}/departements/45.csv.gz" => fn () => Http::response(gzencode($this->csv($year))),
            'cadastre.data.gouv.fr/*' => fn () => Http::response(gzencode(json_encode($this->parcelles()))),
        ]);

        $this->artisan('mapsmart:import-dvf', ['departements' => ['45'], '--years' => (string) $year, '--sync' => true])->assertSuccessful();
        $this->artisan('mapsmart:import-cadastre', ['--communes' => '45327', '--sync' => true])->assertSuccessful();
    }

    public function test_dvf_import_aggregates_and_is_idempotent(): void
    {
        $this->assertSame(3, DB::table('dvf_mutations')->count());
        $this->assertSame('maison', DB::table('dvf_mutations')->where('id_mutation', 'M1')->value('categorie'));

        $this->artisan('mapsmart:import-dvf', ['departements' => ['45'], '--years' => (string) now()->year, '--sync' => true]);
        $this->assertSame(3, DB::table('dvf_mutations')->count());
    }

    public function test_empty_download_keeps_existing_data(): void
    {
        Http::fake(['files.data.gouv.fr/*' => Http::response(gzencode(''))]);

        try {
            app(DvfImporter::class)->import('45', now()->year);
            $this->fail('Un fichier vide doit faire échouer l\'import.');
        } catch (\RuntimeException $e) {
            $this->assertStringContainsString('fichier vide', $e->getMessage());
        }

        $this->assertSame(3, DB::table('dvf_mutations')->count());
    }

    public function test_dvf_around_uses_database_with_filters_and_stats(): void
    {
        $this->getJson('/api/dvf?lng=2.105&lat=47.9745&dist=1000')
            ->assertOk()
            ->assertJsonPath('source', 'base')
            ->assertJsonCount(2, 'features') // M3 (échange) exclu
            ->assertJsonPath('stats.categories.maison.prix_m2_median', 2000);

        $this->getJson('/api/dvf?lng=2.105&lat=47.9745&dist=1000&categories[]=terrain')
            ->assertJsonCount(1, 'features')
            ->assertJsonPath('features.0.properties.prix_m2', 50);
    }

    public function test_dvf_in_zones_returns_sales_inside_all_zones(): void
    {
        $this->getJson("/api/maps/{$this->map->id}/dvf")->assertJsonCount(0, 'features');

        $this->postJson("/api/maps/{$this->map->id}/zones", [
            'mode' => 'polygon',
            'geojson' => ['type' => 'Polygon', 'coordinates' => [[[2.10, 47.97], [2.1052, 47.97], [2.1052, 47.98], [2.10, 47.98], [2.10, 47.97]]]],
        ])->assertCreated();

        $this->getJson("/api/maps/{$this->map->id}/dvf")
            ->assertOk()
            ->assertJsonCount(1, 'features')
            ->assertJsonPath('features.0.properties.id_mutation', 'M1');
    }

    public function test_dvf_in_zones_does_not_leak_other_tenant_zones(): void
    {
        $other = Tenant::create(['name' => 'Autre']);
        $otherMap = Map::withoutGlobalScopes()->create(['tenant_id' => $other->id, 'owner_id' => User::factory()->create(['tenant_id' => $other->id])->id, 'name' => 'X']);

        $this->getJson("/api/maps/{$otherMap->id}/dvf")->assertNotFound();
    }

    public function test_cadastre_bbox_and_point_lookup(): void
    {
        $this->getJson('/api/cadastre?bbox=2.10,47.97,2.11,47.98')
            ->assertOk()
            ->assertJsonCount(1, 'features')
            ->assertJsonPath('features.0.properties.id', '45327000AD0764');

        $this->getJson('/api/cadastre?bbox=1,47,3,49')->assertUnprocessable();

        $this->getJson('/api/cadastre/parcelle?lng=2.1049&lat=47.9745')->assertJsonPath('parcelle.contenance', 359);
    }

    public function test_coverage_lists_loaded_data(): void
    {
        $this->getJson('/api/public-data/coverage')
            ->assertOk()
            ->assertJsonPath('dvf.0.departement', '45')
            ->assertJsonPath('dvf.0.mutations', 3)
            ->assertJsonPath('cadastre.communes', 1);
    }

    private function csv(int $year): string
    {
        $header = 'id_mutation,date_mutation,numero_disposition,nature_mutation,valeur_fonciere,adresse_numero,adresse_suffixe,adresse_nom_voie,adresse_code_voie,code_postal,code_commune,nom_commune,code_departement,ancien_code_commune,ancien_nom_commune,id_parcelle,ancien_id_parcelle,numero_volume,lot1_numero,lot1_surface_carrez,lot2_numero,lot2_surface_carrez,lot3_numero,lot3_surface_carrez,lot4_numero,lot4_surface_carrez,lot5_numero,lot5_surface_carrez,nombre_lots,code_type_local,type_local,surface_reelle_bati,nombre_pieces_principales,code_nature_culture,nature_culture,code_nature_culture_speciale,nature_culture_speciale,surface_terrain,longitude,latitude';
        $date = now()->subMonths(2)->toDateString();
        $row = fn ($id, $nature, $prix, $type, $bati, $terrain, $lng, $lat) => "{$id},{$date},000001,{$nature},{$prix},3,,RUE DU STADE,0280,45470,45327,Traînou,45,,,45327000AD0764,,,,,,,,,,,,,0,1,{$type},{$bati},4,AG,terrains d'agrément,,,{$terrain},{$lng},{$lat}";

        return implode("\n", [
            $header,
            $row('M1', 'Vente', 200000, 'Maison', 100, 500, 2.1050, 47.9745),
            $row('M1', 'Vente', 200000, 'Dépendance', 0, 0, 2.1050, 47.9745),
            $row('M2', 'Vente', 40000, '', 0, 800, 2.1070, 47.9750),
            $row('M3', 'Echange', 1, '', 0, 100, 2.1060, 47.9748),
        ]) . "\n";
    }

    private function parcelles(): array
    {
        return ['type' => 'FeatureCollection', 'features' => [[
            'type' => 'Feature',
            'id' => '45327000AD0764',
            'geometry' => ['type' => 'Polygon', 'coordinates' => [[[2.1045, 47.9740], [2.1055, 47.9740], [2.1055, 47.9750], [2.1045, 47.9750], [2.1045, 47.9740]]]],
            'properties' => ['id' => '45327000AD0764', 'commune' => '45327', 'section' => 'AD', 'numero' => '764', 'contenance' => 359],
        ]]];
    }
}
