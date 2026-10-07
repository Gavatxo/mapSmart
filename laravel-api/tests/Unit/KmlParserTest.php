<?php

namespace Tests\Unit;

use App\Services\KmlParser;
use PHPUnit\Framework\TestCase;
use RuntimeException;

class KmlParserTest extends TestCase
{
    public function test_parses_placemarks_with_their_folder_as_layer(): void
    {
        $kml = <<<'KML'
        <?xml version="1.0" encoding="UTF-8"?>
        <kml xmlns="http://www.opengis.net/kml/2.2"><Document>
          <Folder><name>Terrains à bâtir</name>
            <Placemark><name>Lot A</name><Point><coordinates>2.1,47.9,0</coordinates></Point></Placemark>
          </Folder>
          <Placemark><name>Isolé</name><LineString><coordinates>2.1,47.9 2.2,48.0</coordinates></LineString></Placemark>
        </Document></kml>
        KML;

        $features = (new KmlParser)->parse($kml);

        $this->assertCount(2, $features);
        $this->assertSame(['Terrains à bâtir', 'Point', [2.1, 47.9]], [$features[0]['layer'], $features[0]['type'], $features[0]['geojson']['coordinates']]);
        $this->assertSame(['Autres', 'LineString'], [$features[1]['layer'], $features[1]['type']]);
    }

    public function test_rejects_dtd_declarations(): void
    {
        $this->expectException(RuntimeException::class);

        (new KmlParser)->parse('<?xml version="1.0"?><!DOCTYPE kml [<!ENTITY a "aaaa">]><kml xmlns="http://www.opengis.net/kml/2.2">&a;</kml>');
    }
}
