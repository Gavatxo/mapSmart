import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { MapItem } from '../types'
import Section from '../ui/Section'
import { s } from '../ui/styles'

type Props = {
  maps: MapItem[]
  current: MapItem | null
  onSelect: (id: number | null) => void
}

/** Liste, création, renommage et suppression des cartes du compte. */
export default function MapsPanel({ maps, current, onSelect }: Props) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState<'create' | 'rename' | null>(null)
  const [name, setName] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const save = useMutation({
    mutationFn: async () => editing === 'rename' && current
      ? (await api.patch<MapItem>(`/maps/${current.id}`, { name })).data
      : (await api.post<MapItem>('/maps', { name })).data,
    onSuccess: (m) => {
      qc.invalidateQueries({ queryKey: ['maps'] })
      setEditing(null)
      onSelect(m.id)
    },
  })

  const remove = useMutation({
    mutationFn: async (id: number) => api.delete(`/maps/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maps'] })
      setConfirmDelete(false)
      onSelect(null)
    },
  })

  function startEdit(mode: 'create' | 'rename') {
    setEditing(mode)
    setName(mode === 'rename' ? current?.name ?? '' : '')
    setConfirmDelete(false)
  }

  return (
    <Section title="Cartes">
      {editing ? (
        <form style={s.row} onSubmit={(e) => { e.preventDefault(); if (name.trim()) save.mutate() }}>
          <input autoFocus style={{ ...s.field, flex: 1 }} placeholder="Nom de la carte" value={name}
            onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && setEditing(null)} />
          <button style={s.secondary} disabled={!name.trim() || save.isPending}>OK</button>
          <button type="button" style={s.ghost} onClick={() => setEditing(null)}>Annuler</button>
        </form>
      ) : (
        <>
          <select style={s.field} value={current?.id ?? ''} onChange={(e) => onSelect(Number(e.target.value) || null)}>
            <option value="">— choisir une carte —</option>
            {maps.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <div style={s.row}>
            <button style={{ ...s.secondary, flex: 1 }} onClick={() => startEdit('create')}>+ Nouvelle carte</button>
            {current && <button style={s.ghost} onClick={() => startEdit('rename')}>Renommer</button>}
            {current && (confirmDelete
              ? <button style={s.danger} disabled={remove.isPending} onClick={() => remove.mutate(current.id)}>Confirmer ?</button>
              : <button style={s.danger} onClick={() => setConfirmDelete(true)}>Supprimer</button>)}
          </div>
        </>
      )}
    </Section>
  )
}
