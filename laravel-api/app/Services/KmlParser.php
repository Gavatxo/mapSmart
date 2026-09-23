<?php

namespace App\Services;

use DOMDocument;
use DOMElement;
use DOMXPath;
use RuntimeException;

/**
 * Parse un KML (export Google My Maps) en géométries GeoJSON.
 *
 * Portage serveur de la logique du prototype front. Les coordonnées Google
 * exactes sont conservées. Chaque Folder KML devient un "layer" ; chaque
 * Placemark devient un terrain (Point, Polygon ou LineString).
 *
 * Utilise DOMXPath avec le namespace KML par défaut enregistré une fois,
 * ce qui gère correctement les KML namespacés (Google My Maps) et non.
 *
 * @return array<int, array{type:string, layer:string, name:string, description:string, geojson:array}>
 */
class KmlParser
{
    private const NS = 'http://www.opengis.net/kml/2.2';

    public function parse(string $kml): array
    {
        $doc = new DOMDocument();
        $previous = libxml_use_internal_errors(true);
        $ok = $doc->loadXML($kml);
        libxml_use_internal_errors($previous);

        if (! $ok) {
            throw new RuntimeException('Fichier KML illisible.');
        }

        $xpath = new DOMXPath($doc);
        $xpath->registerNamespace('k', self::NS);

        $features = [];

        foreach ($xpath->query('//k:Folder') as $folder) {
            $layer = trim($this->text($xpath, 'k:name', $folder) ?? 'Autres') ?: 'Autres';

            foreach ($xpath->query('k:Placemark', $folder) as $pm) {
                if ($feature = $this->placemark($xpath, $pm, $layer)) {
                    $features[] = $feature;
                }
            }
        }

        return $features;
    }

    private function placemark(DOMXPath $xpath, DOMElement $pm, string $layer): ?array
    {
        $name = trim($this->text($xpath, 'k:name', $pm) ?? 'Sans nom') ?: 'Sans nom';
        $description = $this->cleanHtml($this->text($xpath, 'k:description', $pm) ?? '');

        if ($raw = $this->text($xpath, './/k:Point/k:coordinates', $pm)) {
            if ($pts = $this->coordinates($raw)) {
                return $this->feature('Point', $layer, $name, $description, ['type' => 'Point', 'coordinates' => $pts[0]]);
            }
        }

        if ($raw = $this->text($xpath, './/k:Polygon//k:outerBoundaryIs//k:coordinates', $pm)) {
            if ($pts = $this->coordinates($raw)) {
                return $this->feature('Polygon', $layer, $name, $description, ['type' => 'Polygon', 'coordinates' => [$pts]]);
            }
        }

        if ($raw = $this->text($xpath, './/k:LineString/k:coordinates', $pm)) {
            if ($pts = $this->coordinates($raw)) {
                return $this->feature('LineString', $layer, $name, $description, ['type' => 'LineString', 'coordinates' => $pts]);
            }
        }

        return null;
    }

    private function feature(string $type, string $layer, string $name, string $description, array $geometry): array
    {
        return compact('type', 'layer', 'name', 'description') + ['geojson' => $geometry];
    }

    /** "lng,lat,alt lng,lat,alt ..." → [[lng,lat], ...] */
    private function coordinates(string $text): array
    {
        $out = [];
        foreach (preg_split('/\s+/', trim($text)) as $chunk) {
            if ($chunk === '') {
                continue;
            }
            [$lng, $lat] = array_pad(array_map('floatval', explode(',', $chunk)), 2, null);
            if (is_finite($lng) && is_finite($lat)) {
                $out[] = [$lng, $lat];
            }
        }

        return $out;
    }

    private function cleanHtml(string $s): string
    {
        $s = preg_replace('/<br\s*\/?\s*>/i', ' · ', $s);
        $s = preg_replace('/<[^>]+>/', '', $s);

        return trim(preg_replace('/\s+/', ' ', $s));
    }

    private function text(DOMXPath $xpath, string $expr, DOMElement $context): ?string
    {
        $node = $xpath->query($expr, $context)->item(0);

        return $node?->textContent;
    }
}
