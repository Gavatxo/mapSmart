import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { apiError } from '../auth/apiError'
import AuthLayout, { FormError, PasswordInput } from '../auth/AuthLayout'

/** Connexion (/login) et création de compte (/register). */
export default function Login() {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const isRegister = useLocation().pathname === '/register'

  const [name, setName] = useState('')
  const [agency, setAgency] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (isRegister) await register(name, email, password, agency || undefined)
      else await login(email, password)
      navigate('/app')
    } catch (err) {
      setError(apiError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout>
      <h1>{isRegister ? 'Créer votre compte' : 'Bon retour parmi nous'}</h1>
      <p className="au-sub">
        {isRegister
          ? 'Un espace pour votre agence, vos cartes et vos terrains. Prêt en une minute.'
          : 'Connectez-vous pour retrouver vos cartes, vos zones et vos analyses.'}
      </p>

      <nav className="au-tabs" aria-label="Connexion ou inscription">
        <Link to="/login" className={isRegister ? '' : 'active'} onClick={() => setError('')}>Se connecter</Link>
        <Link to="/register" className={isRegister ? 'active' : ''} onClick={() => setError('')}>Créer un compte</Link>
      </nav>

      <form className="au-form" onSubmit={submit} noValidate={false}>
        {isRegister && (
          <>
            <div className="au-field">
              <label htmlFor="name">Votre nom</label>
              <input id="name" className="au-input" value={name} onChange={(e) => setName(e.target.value)}
                autoComplete="name" placeholder="Camille Martin" required />
            </div>
            <div className="au-field">
              <label htmlFor="agency">Agence <span className="au-hint">(optionnel)</span></label>
              <input id="agency" className="au-input" value={agency} onChange={(e) => setAgency(e.target.value)}
                autoComplete="organization" placeholder="Agence du Centre" />
            </div>
          </>
        )}

        <div className="au-field">
          <label htmlFor="email">Email professionnel</label>
          <input id="email" className="au-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            autoComplete="email" placeholder="vous@agence.fr" required />
        </div>

        <div className="au-field">
          <div className="au-field-head">
            <label htmlFor="password">Mot de passe</label>
            {!isRegister && <Link to="/forgot-password">Mot de passe oublié ?</Link>}
          </div>
          <PasswordInput id="password" value={password} onChange={setPassword}
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            placeholder={isRegister ? '8 caractères minimum' : '••••••••'} minLength={isRegister ? 8 : undefined}
            show={showPassword} onToggle={() => setShowPassword((v) => !v)} />
        </div>

        <FormError message={error} />

        <button className="btn btn-primary" disabled={busy}>
          {busy ? <span className="au-spinner" aria-label="Chargement" /> : isRegister ? 'Créer mon compte' : 'Se connecter'}
        </button>
      </form>

      <p className="au-alt">
        {isRegister
          ? <>Déjà un compte ? <Link to="/login">Se connecter</Link></>
          : <>Pas encore de compte ? <Link to="/register">Créer un compte</Link></>}
      </p>
    </AuthLayout>
  )
}
