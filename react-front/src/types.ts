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

export const EMPTY: FC = { type: 'FeatureCollection', features: [] }

/** Premier sommet d'une géométrie : sert à centrer la carte sur un terrain. */
export function firstCoord(g: Geometry): LngLat | null {
  if (g.type === 'Point') return g.coordinates as LngLat
  if (g.type === 'LineString' || g.type === 'MultiPoint') return g.coordinates[0] as LngLat
  if (g.type === 'Polygon' || g.type === 'MultiLineString') return g.coordinates[0][0] as LngLat
  if (g.type === 'MultiPolygon') return g.coordinates[0][0][0] as LngLat
  return null
}
