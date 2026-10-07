<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DvfTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['mapsmart.dvf.years' => ['2024']]);
        Sanctum::actingAs(User::factory()->create(['tenant_id' => Tenant::create(['name' => 'Agence'])->id]));
    }

    public function test_returns_mutations_within_radius_grouped_by_mutation(): void
    {
        $header = 'id_mutation,date_mutation,numero_disposition,nature_mutation,valeur_fonciere,adresse_numero,adresse_suffixe,adresse_nom_voie,adresse_code_voie,code_postal,code_commune,nom_commune,code_departement,ancien_code_commune,ancien_nom_commune,id_parcelle,ancien_id_parcelle,numero_volume,lot1_numero,lot1_surface_carrez,lot2_numero,lot2_surface_carrez,lot3_numero,lot3_surface_carrez,lot4_numero,lot4_surface_carrez,lot5_numero,lot5_surface_carrez,nombre_lots,code_type_local,type_local,surface_reelle_bati,nombre_pieces_principales,code_nature_culture,nature_culture,code_nature_culture_speciale,nature_culture_speciale,surface_terrain,longitude,latitude';
        $row = fn ($id, $prix, $type, $bati, $terrain, $lng, $lat) => "{$id},2024-03-01,000001,Vente,{$prix},3,,RUE DU STADE,0280,45470,45327,Traînou,45,,,45327000AD0764,,,,,,,,,,,,,0,1,{$type},{$bati},4,AG,terrains d'agrément,,,{$terrain},{$lng},{$lat}";
        $csv = implode("\n", [
            $header,
            $row('2024-1', 200000, 'Maison', 90, 500, 2.1050, 47.9745),
            $row('2024-1', 200000, '', 0, 300, 2.1051, 47.9746), // 2e parcelle de la même mutation
            $row('2024-2', 50000, '', 0, 800, 2.2000, 47.9000),   // hors rayon
        ]);

        Http::fake([
            'geo.api.gouv.fr/communes*type=arrondissement-municipal*' => Http::response([]),
            'geo.api.gouv.fr/communes*' => Http::response([['code' => '45327']]),
            'files.data.gouv.fr/geo-dvf/latest/csv/2024/communes/45/45327.csv' => Http::response($csv),
        ]);

        $this->getJson('/api/dvf?lng=2.105&lat=47.9745&dist=500')
            ->assertOk()
            ->assertJsonCount(1, 'features')
            ->assertJsonPath('features.0.properties.valeur_fonciere', 200000)
            ->assertJsonPath('features.0.properties.type_local', 'Maison')
            ->assertJsonPath('features.0.properties.surface_terrain', 800);
    }

    public function test_unknown_location_returns_empty_collection(): void
    {
        Http::fake(['geo.api.gouv.fr/*' => Http::response([])]);

        $this->getJson('/api/dvf?lng=0&lat=0')->assertOk()->assertJsonCount(0, 'features');
    }
}
