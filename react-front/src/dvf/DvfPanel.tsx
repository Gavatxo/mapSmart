import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import { DVF_CATEGORIES, EMPTY, EUR, type DvfCategory, type DvfCollection, type FC, type LngLat } from '../types'
import Section from '../ui/Section'
import { s } from '../ui/styles'

type Scope = 'zones' | 'around'

type Props = {
  mapId: number
  /** Change quand les zones changent : relance la requête « dans les zones ». */
  zonesKey: string
  hasZones: boolean
  origin: LngLat | null
  onFeatures: (fc: FC) => void
}

const PERIODS = [12, 24, 36, 60]

/**
 * Ventes réelles DVF : dans l'intersection des zones (analyse de secteur) ou autour du départ.
 * Filtres catégorie / période, synthèse des prix médians.
 */
export default function DvfPanel({ mapId, zonesKey, hasZones, origin, onFeatures }: Props) {
  const [visible, setVisible] = useState(false)
  const [scope, setScope] = useState<Scope>('zones')
  const [radius, setRadius] = useState(500)
  const [since, setSince] = useState(36)
  const [categories, setCategories] = useState<DvfCategory[]>(['maison', 'appartement', 'terrain'])

  const effectiveScope: Scope = scope === 'zones' && !hasZones ? 'around' : scope
  const ready = visible && categories.length > 0 && (effectiveScope === 'zones' || !!origin)

  const query = useQuery({
    queryKey: ['dvf', mapId, effectiveScope, effectiveScope === 'zones' ? zonesKey : origin, radius, since, categories],
    enabled: ready,
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const params = { since, categories }
      if (effectiveScope === 'zones') return (await api.get<DvfCollection>(`/maps/${mapId}/dvf`, { params })).data
      const [lng, lat] = origin!
      return (await api.get<DvfCollection>('/dvf', { params: { ...params, lng, lat, dist: radius } })).data
    },
  })

  useEffect(() => {
    onFeatures(ready && query.data ? query.data : EMPTY)
  }, [ready, query.data, onFeatures])

  const stats = ready ? query.data?.stats : undefined

  function toggleCategory(c: DvfCategory) {
    setCategories((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]))
  }

  return (
    <Section title="Ventes réelles (DVF)">
      <label style={{ ...s.row, fontSize: 14, cursor: 'pointer' }}>
        <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
        Afficher les ventes sur la carte
      </label>

      {visible && (
        <>
          <div style={s.row}>
            <select style={{ ...s.field, flex: 1 }} value={effectiveScope} onChange={(e) => setScope(e.target.value as Scope)}>
              <option value="zones" disabled={!hasZones}>Dans les zones{hasZones ? '' : ' (aucune zone)'}</option>
              <option value="around">Autour du départ</option>
            </select>
            {effectiveScope === 'around' && (
              <select style={s.field} value={radius} onChange={(e) => setRadius(Number(e.target.value))}>
                {[250, 500, 1000, 2000, 5000].map((r) => <option key={r} value={r}>{r < 1000 ? `${r} m` : `${r / 1000} km`}</option>)}
              </select>
            )}
          </div>
          {effectiveScope === 'around' && !origin && <p style={s.muted}>Placez un point de départ (adresse ou clic sur la carte).</p>}

          <select style={s.field} value={since} onChange={(e) => setSince(Number(e.target.value))}>
            {PERIODS.map((p) => <option key={p} value={p}>{p} derniers mois</option>)}
          </select>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {DVF_CATEGORIES.map((c) => (
              <label key={c.key} style={{ ...s.item, cursor: 'pointer', padding: '4px 8px' }}>
                <input type="checkbox" checked={categories.includes(c.key)} onChange={() => toggleCategory(c.key)} />
                <span style={{ width: 9, height: 9, borderRadius: 9, background: c.color }} />
                {c.label}
              </label>
            ))}
          </div>

          {query.isFetching && <p style={s.muted}>Chargement…</p>}
          {query.isError && <p style={{ ...s.muted, color: '#dc4c58' }}>Données DVF indisponibles.</p>}

          {stats && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <p style={s.muted}>
                <strong style={{ color: '#11243e', fontSize: 15 }}>{stats.count}</strong> vente{stats.count > 1 ? 's' : ''}
                {stats.prix_median != null && <> · prix médian {EUR.format(stats.prix_median)}</>}
                {stats.truncated && ' (limité aux 5 000 plus récentes)'}
              </p>
              <ul style={s.list}>
                {DVF_CATEGORIES.filter((c) => stats.categories[c.key]).map((c) => {
                  const st = stats.categories[c.key]!
                  return (
                    <li key={c.key} style={s.item}>
                      <span style={{ width: 9, height: 9, borderRadius: 9, background: c.color }} />
                      <span style={s.grow}>{c.label} ({st.count})</span>
                      <span style={{ fontSize: 12 }}>
                        {st.prix_m2_median != null && c.unit
                          ? `${EUR.format(st.prix_m2_median)} ${c.unit.replace('€', '')}`
                          : st.prix_median != null ? `méd. ${EUR.format(st.prix_median)}` : ''}
                      </span>
                    </li>
                  )
                })}
              </ul>
              <p style={{ ...s.muted, fontSize: 11 }}>
                Médianes · source {query.data?.source === 'base' ? 'base MapSmart' : 'fichiers DVF (commune du point, hors base)'}
              </p>
            </div>
          )}
        </>
      )}
    </Section>
  )
}
