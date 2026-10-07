import { useCallback, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import Logo from '../components/Logo'
import CoverageNote from '../dvf/CoverageNote'
import DvfPanel from '../dvf/DvfPanel'
import LayersPanel from '../layers/LayersPanel'
import MapView from '../map/MapView'
import Section from '../ui/Section'
import { s } from '../ui/styles'
import MapsPanel from '../workspace/MapsPanel'
import ZonesPanel from '../zones/ZonesPanel'
import { EMPTY, firstCoord, type Bounds, type FC, type LngLat, type MapItem, type ResultTerrain, type ViewState, type Zone } from '../types'

export default function Workspace() {
  const { user, logout } = useAuth()
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const saveViewTimer = useRef<number | undefined>(undefined)

  const [mapId, setMapId] = useState<number | null>(null)
  const [origin, setOrigin] = useState<LngLat | null>(null)
  const [draft, setDraft] = useState<LngLat[] | null>(null)
  const [hiddenLayers, setHiddenLayers] = useState<Set<string>>(new Set())
  const [dvf, setDvf] = useState<FC>(EMPTY)
  const [showCadastre, setShowCadastre] = useState(false)
  const [viewport, setViewport] = useState<{ zoom: number; bounds: Bounds } | null>(null)
  const [fitKey, setFitKey] = useState(0)
  const [focus, setFocus] = useState<{ center: LngLat; key: number } | null>(null)
  const [status, setStatus] = useState('')

  const maps = useQuery({
    queryKey: ['maps'],
    queryFn: async () => (await api.get<MapItem[]>('/maps')).data,
  })
  const currentMap = maps.data?.find((m) => m.id === mapId) ?? null

  const terrains = useQuery({
    queryKey: ['terrains', mapId],
    enabled: !!mapId,
    queryFn: async () => (await api.get<FC>(`/maps/${mapId}/terrains`)).data,
  })

  // Zones persistées côté serveur : rechargées à l'ouverture de la carte.
  const zones = useQuery({
    queryKey: ['zones', mapId],
    enabled: !!mapId,
    queryFn: async () => (await api.get<Zone[]>(`/maps/${mapId}/zones`)).data,
  })

  const results = useQuery({
    queryKey: ['results', mapId],
    enabled: !!mapId,
    queryFn: async () => (await api.get<{ count: number; terrains: ResultTerrain[] }>(`/maps/${mapId}/results`)).data,
  })

  const importKml = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return (await api.post(`/maps/${mapId}/imports`, form)).data
    },
    onMutate: () => setStatus('Import en cours…'),
    onSuccess: async (r) => {
      setStatus(`${r.feature_count} éléments importés.`)
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['terrains', mapId] }),
        qc.invalidateQueries({ queryKey: ['results', mapId] }),
      ])
      setFitKey((k) => k + 1)
    },
    onError: (e: any) => setStatus(e.response?.data?.message ?? 'Import KML échoué.'),
  })

  // Cadastre : chargé par emprise visible, uniquement à fort zoom (volume).
  const cadastreBbox = showCadastre && viewport && viewport.zoom >= CADASTRE_MIN_ZOOM
    ? viewport.bounds.map((v) => v.toFixed(4)).join(',')
    : null
  const cadastre = useQuery({
    queryKey: ['cadastre', cadastreBbox],
    enabled: !!cadastreBbox,
    placeholderData: (prev) => prev,
    staleTime: 5 * 60_000,
    queryFn: async () => (await api.get<FC>('/cadastre', { params: { bbox: cadastreBbox } })).data,
  })

  const onDvf = useCallback((fc: FC) => setDvf(fc), [])

  function selectMap(id: number | null) {
    setMapId(id)
    setDraft(null)
    setOrigin(null)
    setHiddenLayers(new Set())
    setStatus('')
  }

  // Sauvegarde du cadrage (débounce) : la carte se rouvre là où on l'a laissée.
  function saveView(view: ViewState, bounds: Bounds) {
    setViewport({ zoom: view.zoom, bounds })
    window.clearTimeout(saveViewTimer.current)
    const id = mapId
    saveViewTimer.current = window.setTimeout(() => {
      api.patch(`/maps/${id}`, { view_state: view })
        .then(() => qc.setQueryData<MapItem[]>(['maps'], (list) => list?.map((m) => (m.id === id ? { ...m, view_state: view } : m))))
        .catch(() => {})
    }, 1000)
  }

  function onMapClick(p: LngLat) {
    if (draft) setDraft([...draft, p])
    else {
      setOrigin(p)
      setStatus('Point de départ placé.')
    }
  }

  const hasZones = (zones.data?.length ?? 0) > 0
  const compatibleIds = useMemo(() => new Set(results.data?.terrains.map((t) => t.id)), [results.data])

  // Terrains affichés : calques masqués retirés ; grisés s'ils sont hors des zones.
  const terrainData = useMemo<FC>(() => ({
    type: 'FeatureCollection',
    features: (terrains.data?.features ?? [])
      .filter((f) => !hiddenLayers.has((f.properties?.layer as string | null) ?? 'Autres'))
      .map((f) => ({ ...f, properties: { ...f.properties, compatible: hasZones ? compatibleIds.has(f.properties?.id) : true } })),
  }), [terrains.data, hiddenLayers, hasZones, compatibleIds])

  const zoneData = useMemo<FC>(() => ({
    type: 'FeatureCollection',
    features: (zones.data ?? [])
      .filter((z) => z.geojson)
      .map((z) => ({ type: 'Feature', geometry: z.geojson!, properties: { id: z.id } })),
  }), [zones.data])

  const visibleResults = (results.data?.terrains ?? []).filter((t) => !hiddenLayers.has(t.layer ?? 'Autres'))

  return (
    <div style={layout.app}>
      <header style={layout.header}>
        <Link to="/" aria-label="MapSmart, accueil"><Logo size={28} light /></Link>
        <span style={{ flex: 1 }} />
        <span style={{ ...s.muted, color: '#c5d0de' }}>{user?.name}</span>
        <button style={{ ...s.ghost, color: '#c5d0de' }} onClick={logout}>Déconnexion</button>
      </header>

      <aside style={layout.aside}>
        <MapsPanel maps={maps.data ?? []} current={currentMap} onSelect={selectMap} />

        {mapId && (
          <>
            <Section title="Terrains">
              <input ref={fileRef} type="file" accept=".kml,application/vnd.google-earth.kml+xml" style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) importKml.mutate(file)
                  e.target.value = ''
                }} />
              <button style={s.secondary} disabled={importKml.isPending} onClick={() => fileRef.current?.click()}>Importer un KML</button>
              <p style={s.muted}>{terrains.data?.features.length ?? 0} terrains sur la carte</p>
            </Section>

            <LayersPanel terrains={terrains.data ?? EMPTY} hidden={hiddenLayers} onChange={setHiddenLayers} />

            <ZonesPanel mapId={mapId} zones={zones.data ?? []} origin={origin}
              onOrigin={(p, label) => { setOrigin(p); setFocus({ center: p, key: Date.now() }); setStatus(`Départ : ${label}`) }}
              draft={draft} onDraft={setDraft} onStatus={setStatus} />

            <Section title={hasZones ? 'Terrains compatibles' : 'Terrains'}>
              <p style={s.muted}><strong style={{ color: '#11243e', fontSize: 15 }}>{visibleResults.length}</strong> {hasZones ? 'dans toutes les zones' : 'au total (aucune zone)'}</p>
              {hasZones && visibleResults.length > 0 && (
                <ul style={{ ...s.list, maxHeight: 220, overflow: 'auto' }}>
                  {visibleResults.map((t) => (
                    <li key={t.id}>
                      <button style={{ ...s.item, width: '100%', border: 0, cursor: 'pointer', textAlign: 'left' }}
                        onClick={() => { const c = firstCoord(t.geojson); if (c) setFocus({ center: c, key: Date.now() }) }}>
                        <span style={s.grow}>{t.name}</span>
                        <span style={s.muted}>{t.layer}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <DvfPanel mapId={mapId} hasZones={hasZones} origin={origin} onFeatures={onDvf}
              zonesKey={(zones.data ?? []).map((z) => z.id).join(',')} />

            <Section title="Cadastre">
              <label style={{ ...s.row, fontSize: 14, cursor: 'pointer' }}>
                <input type="checkbox" checked={showCadastre} onChange={(e) => setShowCadastre(e.target.checked)} />
                Afficher les parcelles
              </label>
              {showCadastre && (viewport?.zoom ?? 0) < CADASTRE_MIN_ZOOM && <p style={s.muted}>Zoomez sur la carte pour voir les parcelles.</p>}
              {cadastre.isError && <p style={{ ...s.muted, color: '#dc4c58' }}>Cadastre indisponible pour cette emprise.</p>}
            </Section>

            <CoverageNote />
          </>
        )}

        {status && <div style={layout.status}>{status}</div>}
      </aside>

      <main style={layout.main}>
        {mapId && currentMap
          ? <MapView key={mapId} terrains={terrainData} zones={zoneData} dvf={dvf}
              cadastre={cadastreBbox ? cadastre.data ?? EMPTY : EMPTY} origin={origin} draft={draft}
              initialView={currentMap.view_state} fitKey={fitKey} focus={focus}
              onMapClick={onMapClick} onViewChange={saveView} />
          : <div style={layout.empty}>Sélectionnez ou créez une carte pour commencer.</div>}
      </main>
    </div>
  )
}

const CADASTRE_MIN_ZOOM = 15

const layout: Record<string, React.CSSProperties> = {
  app: { display: 'grid', gridTemplateColumns: '340px 1fr', gridTemplateRows: '56px 1fr', height: '100vh' },
  header: { gridColumn: '1/-1', display: 'flex', alignItems: 'center', gap: 12, padding: '0 18px', background: '#11243e', color: '#fff' },
  aside: { overflow: 'auto', background: '#fff', borderRight: '1px solid #dce3ec' },
  main: { position: 'relative', background: '#dfe7ef' },
  empty: { display: 'grid', placeItems: 'center', height: '100%', color: '#637083' },
  status: { margin: 16, padding: 10, borderRadius: 8, background: '#eef5ff', color: '#0e4fae', fontSize: 13 },
}
