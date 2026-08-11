import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function RequireMember({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <CenteredLoader />
  if (!user) return <Navigate to="/member/login" replace />
  return children
}

export function RequireAdmin({ children }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <CenteredLoader />
  if (!user) return <Navigate to="/admin/login" replace />
  if (profile && profile.role !== 'admin') return <Navigate to="/" replace />
  return children
}

function CenteredLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas text-ink/60">
      Loading…
    </div>
  )
}
