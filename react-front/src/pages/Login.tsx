import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { authStyles as styles } from '../ui/authStyles'

export default function Login() {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [agency, setAgency] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'login') await login(email, password)
      else await register(name, email, password, agency)
      navigate('/')
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
        <p style={styles.sub}>{mode === 'login' ? 'Connexion' : 'Créer un compte'}</p>

        {mode === 'register' && (
          <>
            <input style={styles.input} placeholder="Votre nom" value={name} onChange={(e) => setName(e.target.value)} required />
            <input style={styles.input} placeholder="Nom de l'agence (optionnel)" value={agency} onChange={(e) => setAgency(e.target.value)} />
          </>
        )}
        <input style={styles.input} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input style={styles.input} type="password" placeholder="Mot de passe (min. 8)" value={password} onChange={(e) => setPassword(e.target.value)} required />

        {error && <div style={styles.error}>{error}</div>}

        <button style={styles.button} disabled={busy}>
          {busy ? '…' : mode === 'login' ? 'Se connecter' : "S'inscrire"}
        </button>

        {mode === 'login' && (
          <Link to="/forgot-password" style={{ ...styles.link, textAlign: 'center', textDecoration: 'none' }}>Mot de passe oublié ?</Link>
        )}
        <button type="button" style={styles.link} onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'Pas de compte ? Créer un compte' : 'Déjà un compte ? Se connecter'}
        </button>
      </form>
    </div>
  )
}
