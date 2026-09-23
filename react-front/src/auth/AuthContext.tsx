import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from '../api/client'

type User = { id: number; name: string; email: string; role: string; tenant_id: number }

type AuthState = {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string, agency?: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      setLoading(false)
      return
    }
    api
      .get('/me')
      .then((res) => setUser(res.data))
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false))
  }, [])

  async function persist(res: { data: { token: string; user: User } }) {
    localStorage.setItem('token', res.data.token)
    setUser(res.data.user)
  }

  const login = async (email: string, password: string) =>
    persist(await api.post('/auth/login', { email, password }))

  const register = async (name: string, email: string, password: string, agency?: string) =>
    persist(await api.post('/auth/register', { name, email, password, agency }))

  const logout = () => {
    api.post('/auth/logout').catch(() => {})
    localStorage.removeItem('token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
