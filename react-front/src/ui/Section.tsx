import type { ReactNode } from 'react'
import { s } from './styles'

export default function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={s.section}>
      <h3 style={s.sectionTitle}>{title}</h3>
      {children}
    </section>
  )
}
