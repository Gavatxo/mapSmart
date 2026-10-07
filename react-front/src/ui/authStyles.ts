import type { CSSProperties } from 'react'

/** Styles partagés des écrans d'authentification (connexion, mot de passe). */
export const authStyles: Record<string, CSSProperties> = {
  wrap: { display: 'grid', placeItems: 'center', height: '100vh', background: '#f4f7fb' },
  card: { display: 'flex', flexDirection: 'column', gap: 10, width: 320, padding: 28, background: '#fff', borderRadius: 16, boxShadow: '0 12px 36px rgba(17,36,62,.14)' },
  title: { margin: 0, color: '#11243e' },
  sub: { margin: '0 0 8px', color: '#637083', fontSize: 14 },
  input: { height: 42, padding: '0 12px', border: '1px solid #dce3ec', borderRadius: 10 },
  button: { height: 44, border: 0, borderRadius: 10, background: '#1769e0', color: '#fff', fontWeight: 700, cursor: 'pointer' },
  link: { background: 'none', border: 0, color: '#1769e0', cursor: 'pointer', fontSize: 13 },
  error: { color: '#dc4c58', fontSize: 13 },
}
