import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { apiError } from '../auth/apiError'
import AuthLayout, { FormError, PasswordInput } from '../auth/AuthLayout'

/** Demande de lien (sans token dans l'URL) ou saisie du nouveau mot de passe (lien reçu par email). */
export default function PasswordReset() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const [email, setEmail] = useState(params.get('email') ?? '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const { data } = token
        ? await api.post('/auth/reset-password', { token, email, password })
        : await api.post('/auth/forgot-password', { email })
      setMessage(data.message)
    } catch (err) {
      setError(apiError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout>
      <h1>{token ? 'Nouveau mot de passe' : 'Mot de passe oublié'}</h1>
      <p className="au-sub">
        {token
          ? 'Choisissez un nouveau mot de passe. Vos autres sessions seront déconnectées.'
          : 'Indiquez votre email : nous vous envoyons un lien pour choisir un nouveau mot de passe.'}
      </p>

      {message ? (
        <div className="au-form">
          <div className="au-success" role="status">{message}</div>
          <Link to="/login" className="btn btn-primary">Aller à la connexion</Link>
        </div>
      ) : (
        <form className="au-form" onSubmit={submit}>
          <div className="au-field">
            <label htmlFor="email">Email</label>
            <input id="email" className="au-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              autoComplete="email" placeholder="vous@agence.fr" required />
          </div>
          {token && (
            <div className="au-field">
              <label htmlFor="password">Nouveau mot de passe</label>
              <PasswordInput id="password" value={password} onChange={setPassword} autoComplete="new-password"
                placeholder="8 caractères minimum" minLength={8} show={showPassword} onToggle={() => setShowPassword((v) => !v)} />
            </div>
          )}
          <FormError message={error} />
          <button className="btn btn-primary" disabled={busy}>
            {busy ? <span className="au-spinner" aria-label="Chargement" /> : token ? 'Enregistrer le mot de passe' : 'Recevoir le lien'}
          </button>
        </form>
      )}

      <p className="au-alt"><Link to="/login">← Retour à la connexion</Link></p>
    </AuthLayout>
  )
}
