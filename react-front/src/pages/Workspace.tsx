import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { FeatureCollection, Geometry } from 'geojson'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import MapView from '../map/MapView'

type MapItem = { id: number; name: string }
type Zone = { id: number; geojson: Geometry | null }
type FC = FeatureCollection

const EMPTY: FC = { type: 'FeatureCollection', features: [] }

export default function Workspace() {
  const { user, logout } = useAuth()
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [mapId, setMapId] = useState<number | null>(null)
  const [origin, setOrigin] = useState<[number, number] | null>(null)
  const [mode, setMode] = useState<'time' | 'distance'>('time')
  const [value, setValue] = useState(30)
  const [address, setAddress] = useState('')
  const [dvfRadius, setDvfRadius] = useState(500)
  const [dvf, setDvf] = useState<FC>(EMPTY)
  const [status, setStatus] = useState('')

  const maps = useQuery({
    queryKey: ['maps'],
    queryFn: async () => (await api.get<MapItem[]>('/maps')).data,
  })

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
    queryFn: async () => (await api.get(`/maps/${mapId}/results`)).data,
  })

  const createMap = useMutation({
    mutationFn: async (name: string) => (await api.post('/maps', { name })).data,
    onSuccess: (m) => {
      qc.invalidateQueries({ queryKey: ['maps'] })
      selectMap(m.id)
    },
  })

  const importKml = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return (await api.post(`/maps/${mapId}/imports`, form)).data
    },
    onSuccess: (r) => {
      setStatus(`${r.feature_count} éléments importés.`)
      qc.invalidateQueries({ queryKey: ['terrains', mapId] })
      qc.invalidateQueries({ queryKey: ['results', mapId] })
    },
    onError: () => setStatus('Import KML échoué.'),
  })

  const createZone = useMutation({
    mutationFn: async () => {
      if (!origin) throw new Error('origin')
      return (await api.post(`/maps/${mapId}/zones`, { mode, value, origin })).data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['zones', mapId] })
      qc.invalidateQueries({ queryKey: ['results', mapId] })
      setStatus('Zone calculée.')
    },
    onError: () => setStatus('Calcul de zone indisponible (Valhalla requis).'),
  })

  const clearZones = useMutation({
    mutationFn: async () => api.delete(`/maps/${mapId}/zones`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['zones', mapId] })
      qc.invalidateQueries({ queryKey: ['results', mapId] })
      setStatus('Zones supprimées.')
    },
    onError: () => setStatus('Suppression des zones échouée.'),
  })

  const loadDvf = useMutation({
    mutationFn: async () => {
      if (!origin) throw new Error('origin')
      const [lng, lat] = origin
      return (await api.get<FC>('/dvf', { params: { lng, lat, dist: dvfRadius } })).data
    },
    onMutate: () => setStatus('Chargement des ventes DVF…'),
    onSuccess: (data) => {
      setDvf(data)
      setStatus(`${data.features.length} ventes DVF dans un rayon de ${dvfRadius} m.`)
    },
    onError: () => setStatus('Données DVF indisponibles.'),
  })

  async function geocode() {
    if (!address.trim()) return
    setStatus('Recherche de l’adresse…')
    try {
      const { data } = await api.get('/geocode', { params: { q: address } })
      setOrigin([data.lng, data.lat])
      setStatus(`Départ : ${data.label}`)
    } catch {
      setStatus('Adresse introuvable.')
    }
  }

  const terrainData = useMemo(() => terrains.data ?? EMPTY, [terrains.data])
  const zoneData = useMemo<FC>(() => ({
    type: 'FeatureCollection',
    features: (zones.data ?? [])
      .filter((z) => z.geojson)
      .map((z) => ({ type: 'Feature', geometry: z.geojson!, properties: { id: z.id } })),
  }), [zones.data])

  function selectMap(id: number | null) {
    setMapId(id)
    setDvf(EMPTY)
  }

  return (
    <div style={s.app}>
      <header style={s.header}>
        <strong>MapSmart</strong>
        <span style={s.spacer} />
        <span style={s.muted}>{user?.name}</span>
        <button style={s.ghost} onClick={logout}>Déconnexion</button>
      </header>

      <aside style={s.aside}>
        <Section title="Cartes">
          <select style={s.field} value={mapId ?? ''} onChange={(e) => selectMap(Number(e.target.value) || null)}>
            <option value="">— choisir une carte —</option>
            {maps.data?.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <button style={s.secondary} onClick={() => {
            const name = prompt('Nom de la carte ?')
            if (name) createMap.mutate(name)
          }}>+ Nouvelle carte</button>
        </Section>

        {mapId && (
          <>
            <Section title="Terrains">
              <input ref={fileRef} type="file" accept=".kml,application/vnd.google-earth.kml+xml" style={{ display: 'none' }}
                onChange={(e) => e.target.files?.[0] && importKml.mutate(e.target.files[0])} />
              <button style={s.secondary} onClick={() => fileRef.current?.click()}>Importer un KML</button>
              <p style={s.muted}>{terrainData.features.length} terrains sur la carte</p>
            </Section>

            <Section title="Zone de recherche">
              <div style={s.row}>
                <input style={{ ...s.field, flex: 1 }} placeholder="Adresse de départ" value={address}
                  onChange={(e) => setAddress(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && geocode()} />
                <button style={s.icon} onClick={geocode}>→</button>
              </div>
              <p style={s.muted}>ou cliquez sur la carte pour placer le départ</p>
              <div style={s.row}>
                <select style={{ ...s.field, flex: 1 }} value={mode} onChange={(e) => setMode(e.target.value as any)}>
                  <option value="time">Temps (min)</option>
                  <option value="distance">Distance (km)</option>
                </select>
                <input style={{ ...s.field, width: 70 }} type="number" min={1} max={180} value={value}
                  onChange={(e) => setValue(Number(e.target.value))} />
              </div>
              <button style={s.primary} disabled={!origin || createZone.isPending} onClick={() => createZone.mutate()}>
                Calculer la zone
              </button>
              <button style={s.ghost} disabled={!zoneData.features.length || clearZones.isPending}
                onClick={() => clearZones.mutate()}>
                Réinitialiser les zones ({zoneData.features.length})
              </button>
            </Section>

            <Section title="Ventes réelles (DVF)">
              <div style={s.row}>
                <select style={{ ...s.field, flex: 1 }} value={dvfRadius} onChange={(e) => setDvfRadius(Number(e.target.value))}>
                  {[250, 500, 1000, 2000, 5000].map((r) => <option key={r} value={r}>Rayon {r} m</option>)}
                </select>
                <button style={s.secondary} disabled={!origin || loadDvf.isPending} onClick={() => loadDvf.mutate()}>
                  Afficher
                </button>
              </div>
              <p style={s.muted}>Autour du point de départ · ventes 2024–2025 de la commune</p>
              {dvf.features.length > 0 && (
                <button style={s.ghost} onClick={() => setDvf(EMPTY)}>Masquer les ventes</button>
              )}
            </Section>

            <Section title="Résultats">
              <strong>{results.data?.count ?? terrainData.features.length}</strong> terrains compatibles
            </Section>
          </>
        )}

        {status && <div style={s.status}>{status}</div>}
      </aside>

      <main style={s.main}>
        {mapId
          ? <MapView terrains={terrainData} zones={zoneData} dvf={dvf} onMapClick={({ lng, lat }) => {
              setOrigin([lng, lat]); setStatus('Point de départ placé.')
            }} />
          : <div style={s.empty}>Sélectionnez ou créez une carte pour commencer.</div>}
      </main>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={s.section}>
      <h3 style={s.sectionTitle}>{title}</h3>
      {children}
    </section>
  )
}

const s: Record<string, React.CSSProperties> = {
  app: { display: 'grid', gridTemplateColumns: '340px 1fr', gridTemplateRows: '56px 1fr', height: '100vh' },
  header: { gridColumn: '1/-1', display: 'flex', alignItems: 'center', gap: 12, padding: '0 18px', background: '#11243e', color: '#fff' },
  spacer: { flex: 1 },
  muted: { color: '#637083', fontSize: 13 },
  aside: { overflow: 'auto', background: '#fff', borderRight: '1px solid #dce3ec' },
  section: { padding: 16, borderBottom: '1px solid #eef2f7', display: 'flex', flexDirection: 'column', gap: 8 },
  sectionTitle: { margin: 0, fontSize: 14 },
  field: { height: 40, padding: '0 10px', border: '1px solid #dce3ec', borderRadius: 9 },
  row: { display: 'flex', gap: 8 },
  primary: { height: 42, border: 0, borderRadius: 10, background: '#1769e0', color: '#fff', fontWeight: 700, cursor: 'pointer' },
  secondary: { height: 40, border: '1px solid #dce3ec', borderRadius: 9, background: '#fff', cursor: 'pointer' },
  ghost: { border: 0, background: 'none', color: '#637083', cursor: 'pointer', fontSize: 13 },
  icon: { width: 42, border: 0, borderRadius: 9, background: '#11243e', color: '#fff', cursor: 'pointer' },
  main: { position: 'relative', background: '#dfe7ef' },
  empty: { display: 'grid', placeItems: 'center', height: '100%', color: '#637083' },
  status: { margin: 16, padding: 10, borderRadius: 8, background: '#eef5ff', color: '#0e4fae', fontSize: 13 },
}
