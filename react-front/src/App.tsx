import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import Login from './pages/Login'
import PasswordReset from './pages/PasswordReset'
import Workspace from './pages/Workspace'

export default function App() {
  const { user, loading } = useAuth()

  if (loading) return <div style={{ display: 'grid', placeItems: 'center', height: '100vh' }}>Chargement…</div>

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/forgot-password" element={<PasswordReset />} />
      <Route path="/reset-password" element={<PasswordReset />} />
      <Route path="/" element={user ? <Workspace /> : <Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
