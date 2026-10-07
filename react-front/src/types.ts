import type { FeatureCollection, Geometry } from 'geojson'

export type FC = FeatureCollection
export type LngLat = [number, number]
export type ViewState = { center: LngLat; zoom: number }

export type MapItem = { id: number; name: string; view_state: ViewState | null }

export type Zone = {
  id: number
  label: string | null
  mode: 'time' | 'distance' | 'polygon'
  value: number | null
  geojson: Geometry | null
}

export type ResultTerrain = { id: number; name: string; layer: string | null; geojson: Geometry }

export type Bounds = [number, number, number, number] // west, south, east, north

export type DvfCategory = 'maison' | 'appartement' | 'terrain' | 'local' | 'dependance' | 'autre'

export type DvfStats = {
  count: number
  prix_median: number | null
  truncated: boolean
  categories: Partial<Record<DvfCategory, { count: number; prix_median: number | null; prix_m2_median: number | null }>>
}

export type DvfCollection = FeatureCollection & { source: 'base' | 'fichiers'; stats: DvfStats }

export const DVF_CATEGORIES: { key: DvfCategory; label: string; color: string; unit: string }[] = [
  { key: 'maison', label: 'Maisons', color: '#d1495b', unit: '€/m² bâti' },
  { key: 'appartement', label: 'Appartements', color: '#8e44ad', unit: '€/m² bâti' },
  { key: 'terrain', label: 'Terrains', color: '#2a9d8f', unit: '€/m² terrain' },
  { key: 'local', label: 'Locaux', color: '#e76f51', unit: '' },
  { key: 'dependance', label: 'Dépendances', color: '#7f8c8d', unit: '' },
  { key: 'autre', label: 'Autres', color: '#b0b8c4', unit: '' },
]

export const EUR = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

export const EMPTY: FC = { type: 'FeatureCollection', features: [] }

/** Premier sommet d'une géométrie : sert à centrer la carte sur un terrain. */
export function firstCoord(g: Geometry): LngLat | null {
  if (g.type === 'Point') return g.coordinates as LngLat
  if (g.type === 'LineString' || g.type === 'MultiPoint') return g.coordinates[0] as LngLat
  if (g.type === 'Polygon' || g.type === 'MultiLineString') return g.coordinates[0][0] as LngLat
  if (g.type === 'MultiPolygon') return g.coordinates[0][0][0] as LngLat
  return null
}
