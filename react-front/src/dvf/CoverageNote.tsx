import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import { s } from '../ui/styles'

type Coverage = {
  dvf: { departement: string; annees: string[]; mutations: number }[]
  cadastre: { communes: number; parcelles: number; departements: string[] }
  last_import: string | null
}

/** Rappel de la couverture des données publiques chargées en base. */
export default function CoverageNote() {
  const { data } = useQuery({
    queryKey: ['coverage'],
    staleTime: 10 * 60_000,
    queryFn: async () => (await api.get<Coverage>('/public-data/coverage')).data,
  })
  if (!data) return null

  const dvf = data.dvf.map((d) => `${d.departement} (${d.annees[0]}–${d.annees[d.annees.length - 1]})`).join(', ')
  const nf = new Intl.NumberFormat('fr-FR')

  return (
    <p style={{ ...s.muted, fontSize: 11, padding: '12px 16px' }}>
      Données en base — DVF : {dvf || 'aucune'} · Cadastre : {data.cadastre.departements.join(', ') || 'aucun'}
      {data.cadastre.parcelles > 0 && ` (${nf.format(data.cadastre.parcelles)} parcelles)`}.
      {data.last_import && ` MAJ ${new Date(data.last_import).toLocaleDateString('fr-FR')}.`}
    </p>
  )
}
