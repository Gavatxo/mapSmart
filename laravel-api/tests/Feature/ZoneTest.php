<?php

namespace Tests\Feature;

use App\Models\Map;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ZoneTest extends TestCase
{
    use RefreshDatabase;

    private Map $map;

    private array $polygon = ['type' => 'Polygon', 'coordinates' => [[[2, 47], [3, 47], [3, 48], [2, 47]]]];

    protected function setUp(): void
    {
        parent::setUp();

        $user = User::factory()->create(['tenant_id' => Tenant::create(['name' => 'Agence'])->id]);
        Sanctum::actingAs($user);
        $this->map = Map::create(['owner_id' => $user->id, 'name' => 'Carte']);
    }

    public function test_zones_are_listed_for_reload(): void
    {
        $this->postJson("/api/maps/{$this->map->id}/zones", ['mode' => 'polygon', 'geojson' => $this->polygon])->assertCreated();

        $this->getJson("/api/maps/{$this->map->id}/zones")
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.geojson.type', 'Polygon');
    }

    public function test_clear_removes_all_zones_of_the_map(): void
    {
        $this->postJson("/api/maps/{$this->map->id}/zones", ['mode' => 'polygon', 'geojson' => $this->polygon]);
        $this->postJson("/api/maps/{$this->map->id}/zones", ['mode' => 'polygon', 'geojson' => $this->polygon]);

        $this->deleteJson("/api/maps/{$this->map->id}/zones")->assertNoContent();

        $this->getJson("/api/maps/{$this->map->id}/zones")->assertOk()->assertJsonCount(0);
    }

    public function test_time_zone_requires_a_value(): void
    {
        $this->postJson("/api/maps/{$this->map->id}/zones", ['mode' => 'time', 'origin' => [2.1, 47.9]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('value');
    }
}
