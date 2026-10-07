import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { LngLat, Zone } from '../types'
import Section from '../ui/Section'
import { s } from '../ui/styles'

type Mode = Zone['mode']

type Props = {
  mapId: number
  zones: Zone[]
  origin: LngLat | null
  onOrigin: (origin: LngLat, label: string) => void
  draft: LngLat[] | null
  onDraft: (draft: LngLat[] | null) => void
  onStatus: (status: string) => void
}

const MODE_LABEL: Record<Mode, string> = { time: 'min', distance: 'km', polygon: 'polygone' }

/**
 * Zones de recherche : isochrone temps/distance depuis un départ (adresse ou clic),
 * ou polygone dessiné point par point sur la carte. Liste, renommage, suppression.
 */
export default function ZonesPanel({ mapId, zones, origin, onOrigin, draft, onDraft, onStatus }: Props) {
  const qc = useQueryClient()
  const [mode, setMode] = useState<Mode>('time')
  const [value, setValue] = useState(30)
  const [label, setLabel] = useState('')
  const [address, setAddress] = useState('')
  const [renaming, setRenaming] = useState<{ id: number; label: string } | null>(null)

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['zones', mapId] })
    qc.invalidateQueries({ queryKey: ['results', mapId] })
  }

  const create = useMutation({
    mutationFn: async () => {
      const body = mode === 'polygon'
        ? { mode, label: label || null, geojson: { type: 'Polygon', coordinates: [[...draft!, draft![0]]] } }
        : { mode, label: label || null, value, origin }
      return (await api.post(`/maps/${mapId}/zones`, body)).data
    },
    onMutate: () => onStatus(mode === 'polygon' ? 'Enregistrement de la zone…' : 'Calcul de la zone…'),
    onSuccess: () => {
      refresh()
      setLabel('')
      onDraft(null)
      onStatus('Zone ajoutée.')
    },
    onError: (e: any) => onStatus(e.response?.data?.message ?? 'Calcul de zone indisponible.'),
  })

  const rename = useMutation({
    mutationFn: async (z: { id: number; label: string }) => api.patch(`/zones/${z.id}`, { label: z.label || null }),
    onSuccess: () => { setRenaming(null); refresh() },
  })

  const remove = useMutation({
    mutationFn: async (id: number) => api.delete(`/zones/${id}`),
    onSuccess: refresh,
  })

  const clear = useMutation({
    mutationFn: async () => api.delete(`/maps/${mapId}/zones`),
    onSuccess: () => { refresh(); onStatus('Zones supprimées.') },
  })

  async function geocode() {
    if (!address.trim()) return
    onStatus('Recherche de l’adresse…')
    try {
      const { data } = await api.get('/geocode', { params: { q: address } })
      onOrigin([data.lng, data.lat], data.label)
    } catch {
      onStatus('Adresse introuvable.')
    }
  }

  function changeMode(m: Mode) {
    setMode(m)
    onDraft(m === 'polygon' ? [] : null)
  }

  return (
    <Section title="Zones de recherche">
      <select style={s.field} value={mode} onChange={(e) => changeMode(e.target.value as Mode)}>
        <option value="time">Temps de trajet (voiture)</option>
        <option value="distance">Distance routière</option>
        <option value="polygon">Polygone dessiné</option>
      </select>

      {mode === 'polygon' ? (
        <p style={s.muted}>
          Cliquez sur la carte pour placer les sommets ({draft?.length ?? 0} point{(draft?.length ?? 0) > 1 ? 's' : ''}).
          {draft && draft.length > 0 && <button style={s.ghost} onClick={() => onDraft(draft.slice(0, -1))}>Annuler le dernier</button>}
        </p>
      ) : (
        <>
          <div style={s.row}>
            <input style={{ ...s.field, flex: 1 }} placeholder="Adresse de départ" value={address}
              onChange={(e) => setAddress(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && geocode()} />
            <button style={s.icon} onClick={geocode} aria-label="Rechercher l'adresse">→</button>
          </div>
          <p style={s.muted}>{origin ? 'Départ placé — cliquez ailleurs sur la carte pour le déplacer.' : 'ou cliquez sur la carte pour placer le départ'}</p>
          <div style={s.row}>
            <input style={{ ...s.field, width: 80 }} type="number" min={1} max={180} value={value}
              onChange={(e) => setValue(Number(e.target.value))} />
            <span style={s.muted}>{mode === 'time' ? 'minutes' : 'km'}</span>
          </div>
        </>
      )}

      <input style={s.field} placeholder="Nom de la zone (optionnel)" value={label} onChange={(e) => setLabel(e.target.value)} />
      <button style={s.primary}
        disabled={create.isPending || (mode === 'polygon' ? (draft?.length ?? 0) < 3 : !origin)}
        onClick={() => create.mutate()}>
        {mode === 'polygon' ? 'Enregistrer le polygone' : 'Calculer la zone'}
      </button>

      {zones.length > 0 && (
        <>
          <ul style={s.list}>
            {zones.map((z, i) => (
              <li key={z.id} style={s.item}>
                {renaming?.id === z.id ? (
                  <form style={{ ...s.row, flex: 1 }} onSubmit={(e) => { e.preventDefault(); rename.mutate(renaming) }}>
                    <input autoFocus style={{ ...s.field, height: 30, flex: 1 }} value={renaming.label}
                      onChange={(e) => setRenaming({ id: z.id, label: e.target.value })}
                      onKeyDown={(e) => e.key === 'Escape' && setRenaming(null)} />
                    <button style={s.ghost}>OK</button>
                  </form>
                ) : (
                  <>
                    <span style={s.grow} title="Double-cliquer pour renommer"
                      onDoubleClick={() => setRenaming({ id: z.id, label: z.label ?? '' })}>
                      {z.label || `Zone ${String.fromCharCode(65 + i)}`}
                    </span>
                    <span style={s.muted}>{z.mode === 'polygon' ? MODE_LABEL.polygon : `${z.value} ${MODE_LABEL[z.mode]}`}</span>
                    <button style={s.ghost} onClick={() => setRenaming({ id: z.id, label: z.label ?? '' })} aria-label="Renommer">✎</button>
                    <button style={s.danger} onClick={() => remove.mutate(z.id)} aria-label="Supprimer">×</button>
                  </>
                )}
              </li>
            ))}
          </ul>
          {zones.length > 1 && (
            <button style={s.ghost} disabled={clear.isPending} onClick={() => clear.mutate()}>Supprimer toutes les zones</button>
          )}
        </>
      )}
    </Section>
  )
}
