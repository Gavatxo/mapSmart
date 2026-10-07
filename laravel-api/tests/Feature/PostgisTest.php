<?php

namespace Tests\Feature;

use App\Models\Map;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Requêtes spatiales réelles (ST_Within…). Ignoré sur SQLite :
 * lancer avec `composer test:postgis` (base mapsmart_test du docker compose).
 *
 * @group postgis
 */
class PostgisTest extends TestCase
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

        $kml = <<<'KML'
        <?xml version="1.0" encoding="UTF-8"?>
        <kml xmlns="http://www.opengis.net/kml/2.2"><Document><Folder><name>Lots</name>
          <Placemark><name>Dedans A et B</name><Point><coordinates>2.15,47.95</coordinates></Point></Placemark>
          <Placemark><name>Dedans A seulement</name><Point><coordinates>2.05,47.95</coordinates></Point></Placemark>
          <Placemark><name>Dehors</name><Point><coordinates>3.5,47.95</coordinates></Point></Placemark>
        </Folder></Document></kml>
        KML;

        $this->post("/api/maps/{$this->map->id}/imports", [
            'file' => UploadedFile::fake()->createWithContent('lots.kml', $kml),
        ], ['Accept' => 'application/json'])->assertCreated();
    }

    public function test_import_fills_postgis_geometry(): void
    {
        $this->assertSame(3, DB::table('terrains')->whereNotNull('geom')->count());
    }

    public function test_results_are_terrains_inside_all_zones(): void
    {
        $this->getJson("/api/maps/{$this->map->id}/results")->assertJsonPath('count', 3);

        $this->zone([[2.0, 47.9], [2.2, 47.9], [2.2, 48.0], [2.0, 48.0], [2.0, 47.9]]);
        $this->getJson("/api/maps/{$this->map->id}/results")->assertJsonPath('count', 2);

        $this->zone([[2.1, 47.9], [2.3, 47.9], [2.3, 48.0], [2.1, 48.0], [2.1, 47.9]]);
        $this->getJson("/api/maps/{$this->map->id}/results")
            ->assertJsonPath('count', 1)
            ->assertJsonPath('terrains.0.name', 'Dedans A et B');
    }

    private function zone(array $ring): void
    {
        $this->postJson("/api/maps/{$this->map->id}/zones", [
            'mode' => 'polygon',
            'geojson' => ['type' => 'Polygon', 'coordinates' => [$ring]],
        ])->assertCreated();
    }
}
