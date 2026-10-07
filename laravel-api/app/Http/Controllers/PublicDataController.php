<?php

namespace App\Http\Controllers;

use App\Models\Map;
use App\Services\GeoServices;
use App\Services\PublicData\CadastreRepository;
use App\Services\PublicData\DvfRepository;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/** Données publiques : ventes DVF, parcelles cadastrales, couverture chargée en base. */
class PublicDataController extends Controller
{
    public function __construct(
        private DvfRepository $dvf,
        private CadastreRepository $cadastre,
        private GeoServices $geo,
    ) {}

    /**
     * Ventes DVF autour d'un point. Base PostGIS si la zone est couverte,
     * sinon lecture à la volée des fichiers geo-dvf de la commune.
     */
    public function dvfAround(Request $request)
    {
        $data = $request->validate([
            'lng' => ['required', 'numeric', 'between:-180,180'],
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'dist' => ['nullable', 'integer', 'min:50', 'max:5000'],
            ...$this->filterRules(),
        ]);
        [$since, $categories] = $this->filters($data);
        $dist = $data['dist'] ?? 500;

        if ($this->dvf->hasCoverageNear($data['lng'], $data['lat'])) {
            $features = $this->dvf->around($data['lng'], $data['lat'], $dist, $since, $categories);
            $source = 'base';
        } else {
            $features = DvfRepository::filterFeatures($this->geo->dvf($data['lng'], $data['lat'], $dist), $since, $categories);
            $source = 'fichiers';
        }

        return $this->collection($features, $source);
    }

    /** Ventes DVF dans l'intersection des zones de la carte (données en base). */
    public function dvfInZones(Request $request, Map $map)
    {
        $data = $request->validate($this->filterRules());
        [$since, $categories] = $this->filters($data);

        $features = $this->dvf->available() ? $this->dvf->inZones($map, $since, $categories) : [];

        return $this->collection($features, 'base');
    }

    public function cadastre(Request $request)
    {
        $data = $request->validate(['bbox' => ['required', 'string', 'regex:/^-?[\d.]+,-?[\d.]+,-?[\d.]+,-?[\d.]+$/']]);
        [$west, $south, $east, $north] = array_map('floatval', explode(',', $data['bbox']));

        abort_if($east <= $west || $north <= $south, 422, 'Emprise invalide.');
        abort_if($east - $west > CadastreRepository::MAX_SPAN || $north - $south > CadastreRepository::MAX_SPAN, 422,
            'Zoomez davantage pour afficher le cadastre.');

        return response()->json(['type' => 'FeatureCollection', 'features' => $this->cadastre->inBbox($west, $south, $east, $north)]);
    }

    public function parcelleAt(Request $request)
    {
        $data = $request->validate(['lng' => ['required', 'numeric'], 'lat' => ['required', 'numeric']]);

        return response()->json(['parcelle' => $this->cadastre->at($data['lng'], $data['lat'])]);
    }

    /** Ce qui est chargé en base : départements/années DVF, communes cadastrées. */
    public function coverage()
    {
        $imports = DB::table('public_dataset_imports')->orderBy('scope')->get();
        $dvf = $imports->where('dataset', 'dvf')->groupBy('scope')->map(fn ($rows, $dep) => [
            'departement' => (string) $dep,
            'annees' => $rows->pluck('version')->sort()->values(),
            'mutations' => $rows->sum('rows'),
        ])->values();
        $cadastre = $imports->where('dataset', 'cadastre');

        return response()->json([
            'dvf' => $dvf,
            'cadastre' => [
                'communes' => $cadastre->count(),
                'parcelles' => $cadastre->sum('rows'),
                'departements' => $cadastre->map(fn ($r) => str_starts_with($r->scope, '97') ? substr($r->scope, 0, 3) : substr($r->scope, 0, 2))->unique()->values(),
            ],
            'last_import' => $imports->max('imported_at'),
        ]);
    }

    private function filterRules(): array
    {
        return [
            'since' => ['nullable', 'integer', 'min:1', 'max:120'],
            'categories' => ['nullable', 'array'],
            'categories.*' => [Rule::in(DvfRepository::CATEGORIES)],
        ];
    }

    /** @return array{int, array} */
    private function filters(array $data): array
    {
        return [$data['since'] ?? 60, $data['categories'] ?? DvfRepository::CATEGORIES];
    }

    private function collection(array $features, string $source)
    {
        return response()->json([
            'type' => 'FeatureCollection',
            'features' => $features,
            'source' => $source,
            'stats' => DvfRepository::stats($features),
        ]);
    }
}
