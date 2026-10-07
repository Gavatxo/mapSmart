<?php

namespace Tests\Feature;

use App\Models\Map;
use App\Models\SearchZone;
use App\Models\Tenant;
use App\Models\Terrain;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Un tenant ne doit jamais voir ni modifier les données d'un autre (ARCHITECTURE.md §6).
 */
class TenantIsolationTest extends TestCase
{
    use RefreshDatabase;

    private User $alice;

    private User $bob;

    private Map $bobMap;

    private SearchZone $bobZone;

    protected function setUp(): void
    {
        parent::setUp();

        $this->alice = $this->makeUser('Agence Alice');
        $this->bob = $this->makeUser('Agence Bob');

        $this->bobMap = Map::create(['tenant_id' => $this->bob->tenant_id, 'owner_id' => $this->bob->id, 'name' => 'Carte Bob']);
        Terrain::create([
            'tenant_id' => $this->bob->tenant_id, 'map_id' => $this->bobMap->id, 'name' => 'Terrain Bob',
            'geom_type' => 'Point', 'geojson' => ['type' => 'Point', 'coordinates' => [2.1, 47.9]],
        ]);
        $this->bobZone = SearchZone::create([
            'tenant_id' => $this->bob->tenant_id, 'map_id' => $this->bobMap->id, 'mode' => 'polygon',
            'geojson' => ['type' => 'Polygon', 'coordinates' => [[[2, 47], [3, 47], [3, 48], [2, 47]]]],
        ]);

        Sanctum::actingAs($this->alice);
    }

    public function test_map_list_only_contains_own_tenant_maps(): void
    {
        Map::create(['owner_id' => $this->alice->id, 'name' => 'Carte Alice']);

        $this->getJson('/api/maps')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.name', 'Carte Alice');
    }

    public function test_new_records_get_the_current_tenant(): void
    {
        $this->postJson('/api/maps', ['name' => 'Nouvelle'])->assertCreated();

        $this->assertDatabaseHas('maps', ['name' => 'Nouvelle', 'tenant_id' => $this->alice->tenant_id]);
    }

    public function test_cannot_read_another_tenant_map_or_its_content(): void
    {
        $id = $this->bobMap->id;

        $this->getJson("/api/maps/{$id}")->assertNotFound();
        $this->getJson("/api/maps/{$id}/terrains")->assertNotFound();
        $this->getJson("/api/maps/{$id}/zones")->assertNotFound();
        $this->getJson("/api/maps/{$id}/results")->assertNotFound();
    }

    public function test_cannot_modify_another_tenant_data(): void
    {
        $id = $this->bobMap->id;

        $this->patchJson("/api/maps/{$id}", ['name' => 'piraté'])->assertNotFound();
        $this->deleteJson("/api/maps/{$id}")->assertNotFound();
        $this->deleteJson("/api/maps/{$id}/zones")->assertNotFound();
        $this->deleteJson("/api/zones/{$this->bobZone->id}")->assertNotFound();
        $this->postJson("/api/maps/{$id}/zones", ['mode' => 'polygon', 'geojson' => ['type' => 'Polygon']])->assertNotFound();

        $this->assertDatabaseHas('maps', ['id' => $id, 'name' => 'Carte Bob']);
        $this->assertDatabaseHas('search_zones', ['id' => $this->bobZone->id]);
    }

    private function makeUser(string $agency): User
    {
        $tenant = Tenant::create(['name' => $agency]);

        return User::factory()->create(['tenant_id' => $tenant->id]);
    }
}
