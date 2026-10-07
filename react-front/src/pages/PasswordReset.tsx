import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { authStyles as styles } from '../ui/authStyles'

/** Demande de lien (sans token dans l'URL) ou saisie du nouveau mot de passe (lien reçu par email). */
export default function PasswordReset() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const [email, setEmail] = useState(params.get('email') ?? '')
  const [password, setPassword] = useState('')
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
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Une erreur est survenue.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={styles.wrap}>
      <form onSubmit={submit} style={styles.card}>
        <h1 style={styles.title}>MapSmart</h1>
        <p style={styles.sub}>{token ? 'Nouveau mot de passe' : 'Mot de passe oublié'}</p>

        {message ? (
          <p style={{ fontSize: 14 }}>{message}</p>
        ) : (
          <>
            <input style={styles.input} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            {token && (
              <input style={styles.input} type="password" placeholder="Nouveau mot de passe (min. 8)" minLength={8}
                value={password} onChange={(e) => setPassword(e.target.value)} required />
            )}
            {error && <div style={styles.error}>{error}</div>}
            <button style={styles.button} disabled={busy}>{busy ? '…' : token ? 'Enregistrer' : 'Recevoir un lien'}</button>
          </>
        )}

        <Link to="/login" style={{ ...styles.link, textAlign: 'center', textDecoration: 'none' }}>Retour à la connexion</Link>
      </form>
    </div>
  )
}
