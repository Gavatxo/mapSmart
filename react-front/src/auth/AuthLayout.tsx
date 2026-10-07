import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../components/Logo'
import HeroMap from '../landing/HeroMap'
import '../landing/landing.css'

/** Écran d'authentification : panneau de marque à gauche, formulaire à droite. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="au">
      <aside className="au-aside">
        <Link to="/" aria-label="MapSmart, accueil"><Logo size={34} light /></Link>
        <div className="au-aside-body">
          <h2>Votre secteur, <em>en un coup d'œil.</em></h2>
          <HeroMap compact />
          <ul className="au-points">
            <li><span className="sw" style={{ background: 'var(--gold)' }} />Vos terrains importés depuis Google My Maps</li>
            <li><span className="sw" style={{ background: '#5b9bff' }} />Des zones en temps de trajet réel</li>
            <li><span className="sw" style={{ background: 'var(--red)' }} />Les ventes DVF et le cadastre du secteur</li>
          </ul>
        </div>
        <p className="au-aside-foot">Données publiques officielles : DVF, cadastre, Base Adresse Nationale, OpenStreetMap.</p>
      </aside>

      <main className="au-main">
        <div className="au-main-top">
          <Link to="/" className="au-logo-mobile" aria-label="MapSmart, accueil"><Logo size={30} /></Link>
          <Link to="/" className="au-back">← Retour à l'accueil</Link>
        </div>
        <div className="au-card">{children}</div>
      </main>
    </div>
  )
}

/** Champ mot de passe avec bouton afficher / masquer. */
export function PasswordInput(props: {
  id: string
  value: string
  onChange: (v: string) => void
  autoComplete: string
  placeholder?: string
  minLength?: number
  show: boolean
  onToggle: () => void
}) {
  return (
    <div className="au-input-wrap">
      <input id={props.id} className="au-input" type={props.show ? 'text' : 'password'} value={props.value}
        onChange={(e) => props.onChange(e.target.value)} autoComplete={props.autoComplete}
        placeholder={props.placeholder} minLength={props.minLength} required />
      <button type="button" className="au-eye" onClick={props.onToggle} aria-label={props.show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {props.show
            ? <><path d="M3 3l18 18" /><path d="M10.6 5.1A10.6 10.6 0 0 1 12 5c6 0 9.5 7 9.5 7a17 17 0 0 1-2.8 3.6M6.6 6.6C3.9 8.4 2.5 12 2.5 12S6 19 12 19a9.4 9.4 0 0 0 5.4-1.6" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>
            : <><path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" /><circle cx="12" cy="12" r="3" /></>}
        </svg>
      </button>
    </div>
  )
}

export function FormError({ message }: { message: string }) {
  if (!message) return null
  return (
    <div className="au-error" role="alert">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" style={{ flex: 'none', marginTop: 1 }}>
        <circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16.5v.01" />
      </svg>
      <span>{message}</span>
    </div>
  )
}
