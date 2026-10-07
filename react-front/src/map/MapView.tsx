import { useEffect, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import type { Feature, FeatureCollection, Geometry } from 'geojson'
import 'maplibre-gl/dist/maplibre-gl.css'
import { api } from '../api/client'
import { DVF_CATEGORIES, EUR, type Bounds, type LngLat, type ViewState } from '../types'

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
const DEFAULT_VIEW: ViewState = { center: [2.12, 47.98], zoom: 9 }

// Terrain hors des zones (properties.compatible === false) : grisé.
const OUTSIDE: maplibregl.ExpressionSpecification = ['==', ['get', 'compatible'], false]

type Props = {
  terrains: FeatureCollection
  zones: FeatureCollection
  dvf: FeatureCollection
  cadastre: FeatureCollection
  origin: LngLat | null
  draft: LngLat[] | null
  /** Cadrage sauvegardé de la carte ; sans lui, on cadre sur les terrains au premier chargement. */
  initialView: ViewState | null
  /** Incrémenter pour recadrer sur les terrains (ex. après un import). */
  fitKey: number
  /** Centrer la carte sur un point (key pour re-déclencher sur le même point). */
  focus: { center: LngLat; key: number } | null
  onMapClick?: (lngLat: LngLat) => void
  onViewChange?: (view: ViewState, bounds: Bounds) => void
}

// Couleur des ventes DVF par catégorie.
const DVF_COLOR: maplibregl.ExpressionSpecification = [
  'match', ['get', 'categorie'],
  ...DVF_CATEGORIES.flatMap((c) => [c.key, c.color]),
  '#b0b8c4',
] as unknown as maplibregl.ExpressionSpecification

export default function MapView(props: Props) {
  const { terrains, zones, dvf, cadastre, origin, draft, initialView, fitKey, focus } = props
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  // Les sources n'existent qu'après 'load' : les effets de données attendent ce signal,
  // sinon des données déjà en cache (arrivées avant le chargement) ne s'afficheraient jamais.
  const [ready, setReady] = useState(false)
  // Callbacks lus via ref : les handlers MapLibre sont posés une seule fois.
  const callbacks = useRef(props)
  callbacks.current = props
  const lastFit = useRef<number | null>(initialView ? fitKey : null)

  useEffect(() => {
    if (!container.current || map.current) return
    const view = initialView ?? DEFAULT_VIEW
    const m = new maplibregl.Map({ container: container.current, style: OSM_STYLE, center: view.center, zoom: view.zoom })
    m.addControl(new maplibregl.NavigationControl(), 'bottom-right')
    m.doubleClickZoom.disable() // le double-clic sert au dessin de polygone

    m.on('load', () => {
      for (const id of ['terrains', 'zones', 'dvf', 'cadastre', 'origin', 'draft']) m.addSource(id, { type: 'geojson', data: EMPTY })

      m.addLayer({ id: 'cadastre-fill', type: 'fill', source: 'cadastre', paint: { 'fill-color': '#ffffff', 'fill-opacity': 0.01 } })
      m.addLayer({ id: 'cadastre-line', type: 'line', source: 'cadastre', paint: { 'line-color': '#c0392b', 'line-width': 0.7, 'line-opacity': 0.7 } })

      m.addLayer({ id: 'zones-fill', type: 'fill', source: 'zones', paint: { 'fill-color': '#1769e0', 'fill-opacity': 0.12 } })
      m.addLayer({ id: 'zones-line', type: 'line', source: 'zones', paint: { 'line-color': '#1769e0', 'line-width': 2 } })
      m.addLayer({
        id: 'terrains-poly', type: 'fill', source: 'terrains', filter: ['==', ['geometry-type'], 'Polygon'],
        paint: { 'fill-color': ['case', OUTSIDE, '#9aa5b4', '#7755cf'], 'fill-opacity': 0.15 },
      })
      m.addLayer({
        id: 'terrains-line', type: 'line', source: 'terrains', filter: ['==', ['geometry-type'], 'LineString'],
        paint: { 'line-color': ['case', OUTSIDE, '#9aa5b4', '#293a5f'], 'line-width': 2, 'line-dasharray': [2, 1] },
      })
      m.addLayer({
        id: 'dvf-point', type: 'circle', source: 'dvf',
        paint: { 'circle-radius': 5, 'circle-color': DVF_COLOR, 'circle-stroke-color': '#fff', 'circle-stroke-width': 1.5 },
      })
      m.addLayer({
        id: 'terrains-point', type: 'circle', source: 'terrains', filter: ['==', ['geometry-type'], 'Point'],
        paint: {
          'circle-radius': ['case', OUTSIDE, 4, 6],
          'circle-color': ['case', OUTSIDE, '#9aa5b4', '#e2ad16'],
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 2,
        },
      })
      m.addLayer({
        id: 'draft-fill', type: 'fill', source: 'draft', filter: ['==', ['geometry-type'], 'Polygon'],
        paint: { 'fill-color': '#0e9f6e', 'fill-opacity': 0.15 },
      })
      m.addLayer({
        id: 'draft-line', type: 'line', source: 'draft', filter: ['!=', ['geometry-type'], 'Point'],
        paint: { 'line-color': '#0e9f6e', 'line-width': 2, 'line-dasharray': [2, 1] },
      })
      m.addLayer({
        id: 'draft-point', type: 'circle', source: 'draft', filter: ['==', ['geometry-type'], 'Point'],
        paint: { 'circle-radius': 4, 'circle-color': '#fff', 'circle-stroke-color': '#0e9f6e', 'circle-stroke-width': 2 },
      })
      m.addLayer({
        id: 'origin-point', type: 'circle', source: 'origin',
        paint: { 'circle-radius': 7, 'circle-color': '#1769e0', 'circle-stroke-color': '#fff', 'circle-stroke-width': 3 },
      })

      m.on('click', 'terrains-point', (e: maplibregl.MapLayerMouseEvent) => {
        const p = e.features?.[0]?.properties
        if (!p) return
        const html = `<strong>${esc(p.name)}</strong><br/>${esc(p.description || p.layer)}`
        const popup = new maplibregl.Popup().setLngLat(e.lngLat).setHTML(html).addTo(m)
        // Référence cadastrale de la parcelle sous le terrain (si le cadastre est chargé).
        api.get('/cadastre/parcelle', { params: { lng: e.lngLat.lng, lat: e.lngLat.lat } })
          .then(({ data }) => {
            if (data.parcelle && popup.isOpen()) popup.setHTML(`${html}<br/><small>${parcelleLabel(data.parcelle)}</small>`)
          })
          .catch(() => {})
      })
      m.on('click', 'cadastre-fill', (e: maplibregl.MapLayerMouseEvent) => {
        // Les clics sur un terrain / une vente ont priorité sur la parcelle.
        if (m.queryRenderedFeatures(e.point, { layers: ['terrains-point', 'dvf-point'] }).length) return
        if (callbacks.current.draft) return
        const p = e.features?.[0]?.properties
        if (p) new maplibregl.Popup().setLngLat(e.lngLat).setHTML(`<small>${parcelleLabel(p)}</small>`).addTo(m)
      })
      m.on('click', 'dvf-point', (e: maplibregl.MapLayerMouseEvent) => {
        const p = e.features?.[0]?.properties
        if (!p) return
        const prix = p.valeur_fonciere != null ? EUR.format(p.valeur_fonciere) : 'prix non renseigné'
        const details = [
          p.type_local ?? p.nature_culture,
          p.prix_m2 && `${EUR.format(p.prix_m2)}/m²`,
          p.surface_reelle_bati > 0 && `${p.surface_reelle_bati} m² bâtis`,
          p.surface_terrain > 0 && `${p.surface_terrain} m² terrain`,
        ].filter(Boolean).join(' · ')
        new maplibregl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(`<strong>${esc(prix)}</strong> — ${esc(p.nature_mutation)} du ${esc(p.date_mutation)}<br/>${esc(details)}<br/><small>${esc(p.adresse)}</small>`)
          .addTo(m)
      })
      m.on('click', (e) => callbacks.current.onMapClick?.([e.lngLat.lng, e.lngLat.lat]))
      m.on('moveend', () => {
        const c = m.getCenter()
        const b = m.getBounds()
        callbacks.current.onViewChange?.(
          { center: [round(c.lng), round(c.lat)], zoom: Math.round(m.getZoom() * 100) / 100 },
          [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()],
        )
      })

      map.current = m
      setReady(true)
    })

    return () => {
      m.remove()
      map.current = null
      setReady(false)
    }
    // La carte est créée une seule fois par montage (le parent remonte le composant par carte).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Terrains + cadrage automatique (premier chargement sans vue sauvegardée, ou fitKey incrémenté).
  useEffect(() => {
    const m = map.current
    const src = m?.getSource('terrains') as maplibregl.GeoJSONSource | undefined
    if (!m || !src) return
    src.setData(terrains)

    if (lastFit.current === fitKey || !terrains.features.length) return
    const b = new maplibregl.LngLatBounds()
    for (const f of terrains.features) forEachCoord(f.geometry, ([lng, lat]) => b.extend([lng, lat]))
    m.fitBounds(b, { padding: 40, maxZoom: 15, duration: 0 })
    lastFit.current = fitKey
  }, [ready, terrains, fitKey])

  useEffect(() => setSource(map.current, 'zones', zones), [ready, zones])
  useEffect(() => setSource(map.current, 'dvf', dvf), [ready, dvf])
  useEffect(() => setSource(map.current, 'cadastre', cadastre), [ready, cadastre])

  useEffect(() => {
    setSource(map.current, 'origin', {
      type: 'FeatureCollection',
      features: origin ? [{ type: 'Feature', geometry: { type: 'Point', coordinates: origin }, properties: {} }] : [],
    })
  }, [ready, origin])

  useEffect(() => {
    const pts = draft ?? []
    const features: Feature[] = pts.map((c) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: c }, properties: {} }))
    if (pts.length >= 3) features.push({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [[...pts, pts[0]]] }, properties: {} })
    else if (pts.length === 2) features.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: pts }, properties: {} })
    setSource(map.current, 'draft', { type: 'FeatureCollection', features })
    map.current?.getCanvas().style.setProperty('cursor', draft ? 'crosshair' : '')
  }, [ready, draft])

  useEffect(() => {
    if (focus) map.current?.flyTo({ center: focus.center, zoom: Math.max(map.current.getZoom(), 15) })
  }, [ready, focus])

  return <div ref={container} style={{ position: 'absolute', inset: 0 }} />
}

function setSource(m: maplibregl.Map | null, id: string, data: FeatureCollection) {
  (m?.getSource(id) as maplibregl.GeoJSONSource | undefined)?.setData(data)
}

const round = (n: number) => Math.round(n * 1e6) / 1e6

function parcelleLabel(p: { section?: string; numero?: string; contenance?: number | null; commune?: string }) {
  const surface = p.contenance ? ` · ${new Intl.NumberFormat('fr-FR').format(p.contenance)} m²` : ''
  return `Parcelle ${esc(p.section)} ${esc(p.numero)} (${esc(p.commune)})${esc(surface)}`
}

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
