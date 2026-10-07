import { useMemo } from 'react'
import type { FC } from '../types'
import Section from '../ui/Section'
import { s } from '../ui/styles'

type Props = {
  terrains: FC
  hidden: Set<string>
  onChange: (hidden: Set<string>) => void
}

/** Filtre d'affichage des terrains par calque KML (Folder). */
export default function LayersPanel({ terrains, hidden, onChange }: Props) {
  const layers = useMemo(() => {
    const counts = new Map<string, number>()
    for (const f of terrains.features) {
      const layer = (f.properties?.layer as string | null) ?? 'Autres'
      counts.set(layer, (counts.get(layer) ?? 0) + 1)
    }
    return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [terrains])

  if (layers.length < 2) return null

  function toggle(layer: string) {
    const next = new Set(hidden)
    if (next.has(layer)) next.delete(layer)
    else next.add(layer)
    onChange(next)
  }

  return (
    <Section title="Calques">
      <ul style={s.list}>
        {layers.map(([layer, count]) => (
          <li key={layer}>
            <label style={{ ...s.item, cursor: 'pointer' }}>
              <input type="checkbox" checked={!hidden.has(layer)} onChange={() => toggle(layer)} />
              <span style={s.grow}>{layer}</span>
              <span style={s.muted}>{count}</span>
            </label>
          </li>
        ))}
      </ul>
    </Section>
  )
}
