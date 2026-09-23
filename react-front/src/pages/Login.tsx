import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

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

        <button type="button" style={styles.link} onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'Pas de compte ? Créer un compte' : 'Déjà un compte ? Se connecter'}
        </button>
      </form>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { display: 'grid', placeItems: 'center', height: '100vh', background: '#f4f7fb' },
  card: { display: 'flex', flexDirection: 'column', gap: 10, width: 320, padding: 28, background: '#fff', borderRadius: 16, boxShadow: '0 12px 36px rgba(17,36,62,.14)' },
  title: { margin: 0, color: '#11243e' },
  sub: { margin: '0 0 8px', color: '#637083', fontSize: 14 },
  input: { height: 42, padding: '0 12px', border: '1px solid #dce3ec', borderRadius: 10 },
  button: { height: 44, border: 0, borderRadius: 10, background: '#1769e0', color: '#fff', fontWeight: 700, cursor: 'pointer' },
  link: { background: 'none', border: 0, color: '#1769e0', cursor: 'pointer', fontSize: 13 },
  error: { color: '#dc4c58', fontSize: 13 },
}
