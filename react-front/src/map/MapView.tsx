import { useEffect, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import type { FeatureCollection, Geometry } from 'geojson'
import 'maplibre-gl/dist/maplibre-gl.css'

// Fond OSM en tuiles raster : aucune clé API requise (à remplacer par MapTiler/IGN en prod).
const OSM_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
}

const EMPTY: FeatureCollection = { type: 'FeatureCollection', features: [] }

type Props = {
  terrains: FeatureCollection
  zones: FeatureCollection
  dvf: FeatureCollection
  onMapClick?: (lngLat: { lng: number; lat: number }) => void
}

export default function MapView({ terrains, zones, dvf, onMapClick }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  // Les sources n'existent qu'après 'load' : les effets de données attendent ce signal,
  // sinon des données déjà en cache (arrivées avant le chargement) ne s'afficheraient jamais.
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!container.current || map.current) return
    const m = new maplibregl.Map({
      container: container.current,
      style: OSM_STYLE,
      center: [2.12, 47.98],
      zoom: 9,
    })
    m.addControl(new maplibregl.NavigationControl(), 'bottom-right')

    m.on('load', () => {
      m.addSource('terrains', { type: 'geojson', data: EMPTY })
      m.addSource('zones', { type: 'geojson', data: EMPTY })
      m.addSource('dvf', { type: 'geojson', data: EMPTY })

      m.addLayer({
        id: 'zones-fill', type: 'fill', source: 'zones',
        paint: { 'fill-color': '#1769e0', 'fill-opacity': 0.15 },
      })
      m.addLayer({
        id: 'zones-line', type: 'line', source: 'zones',
        paint: { 'line-color': '#1769e0', 'line-width': 2 },
      })
      m.addLayer({
        id: 'terrains-poly', type: 'fill', source: 'terrains',
        filter: ['==', ['geometry-type'], 'Polygon'],
        paint: { 'fill-color': '#7755cf', 'fill-opacity': 0.1 },
      })
      m.addLayer({
        id: 'terrains-line', type: 'line', source: 'terrains',
        filter: ['==', ['geometry-type'], 'LineString'],
        paint: { 'line-color': '#293a5f', 'line-width': 2, 'line-dasharray': [2, 1] },
      })
      m.addLayer({
        id: 'terrains-point', type: 'circle', source: 'terrains',
        filter: ['==', ['geometry-type'], 'Point'],
        paint: {
          'circle-radius': 6,
          'circle-color': '#e2ad16',
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 2,
        },
      })

      m.addLayer({
        id: 'dvf-point', type: 'circle', source: 'dvf',
        paint: {
          'circle-radius': 5,
          'circle-color': '#d1495b',
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 1.5,
        },
      })

      m.on('click', 'terrains-point', (e: maplibregl.MapLayerMouseEvent) => {
        const p = e.features?.[0]?.properties
        if (!p) return
        new maplibregl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(`<strong>${esc(p.name)}</strong><br/>${esc(p.description ?? p.layer)}`)
          .addTo(m)
      })
      m.on('click', 'dvf-point', (e: maplibregl.MapLayerMouseEvent) => {
        const p = e.features?.[0]?.properties
        if (!p) return
        const prix = p.valeur_fonciere != null ? EUR.format(p.valeur_fonciere) : 'prix non renseigné'
        const details = [
          p.type_local,
          p.surface_reelle_bati > 0 && `${p.surface_reelle_bati} m² bâtis`,
          p.surface_terrain > 0 && `${p.surface_terrain} m² terrain`,
        ].filter(Boolean).join(' · ')
        new maplibregl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(`<strong>${esc(prix)}</strong> — ${esc(p.nature_mutation)} du ${esc(p.date_mutation)}<br/>${esc(details)}<br/><small>${esc(p.adresse)}</small>`)
          .addTo(m)
      })
      map.current = m
      setReady(true)
    })

    return () => {
      m.remove()
      map.current = null
      setReady(false)
    }
  }, [])

  // Clic carte (placer un départ de zone)
  useEffect(() => {
    const m = map.current
    if (!m || !onMapClick) return
    const handler = (e: maplibregl.MapMouseEvent) => onMapClick({ lng: e.lngLat.lng, lat: e.lngLat.lat })
    m.on('click', handler)
    return () => {
      m.off('click', handler)
    }
  }, [ready, onMapClick])

  // Met à jour les terrains + recadre.
  useEffect(() => {
    const m = map.current
    const src = m?.getSource('terrains') as maplibregl.GeoJSONSource | undefined
    if (!m || !src) return
    src.setData(terrains)

    const b = new maplibregl.LngLatBounds()
    let has = false
    for (const f of terrains.features) {
      forEachCoord(f.geometry, ([lng, lat]) => {
        b.extend([lng, lat])
        has = true
      })
    }
    if (has) m.fitBounds(b, { padding: 40, maxZoom: 15, duration: 0 })
  }, [ready, terrains])

  // Met à jour les zones.
  useEffect(() => {
    const src = map.current?.getSource('zones') as maplibregl.GeoJSONSource | undefined
    src?.setData(zones)
  }, [ready, zones])

  // Met à jour les ventes DVF.
  useEffect(() => {
    const src = map.current?.getSource('dvf') as maplibregl.GeoJSONSource | undefined
    src?.setData(dvf)
  }, [ready, dvf])

  return <div ref={container} style={{ position: 'absolute', inset: 0 }} />
}

const EUR = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

// Les propriétés viennent de fichiers importés : on échappe avant d'injecter dans le HTML du popup.
function esc(v: unknown): string {
  return String(v ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
}

function forEachCoord(geom: Geometry, cb: (c: number[]) => void) {
  if (geom.type === 'Point') cb(geom.coordinates)
  else if (geom.type === 'LineString' || geom.type === 'MultiPoint') geom.coordinates.forEach(cb)
  else if (geom.type === 'Polygon' || geom.type === 'MultiLineString') geom.coordinates.flat().forEach(cb)
  else if (geom.type === 'MultiPolygon') geom.coordinates.flat(2).forEach(cb)
}
