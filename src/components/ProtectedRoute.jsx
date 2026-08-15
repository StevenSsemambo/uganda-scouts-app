import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function RequireMember({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <CenteredLoader />
  if (!user) return <Navigate to="/member/login" replace />
  return children
}

// Any staff member — full Admin or a district-scoped District Admin.
// Used for the shared areas (Overview, Members, Verify Payments) where
// row-level security already scopes what a District Admin can see.
export function RequireStaff({ children }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <CenteredLoader />
  if (!user) return <Navigate to="/admin/login" replace />
  if (profile && profile.role !== 'admin' && profile.role !== 'district_admin') {
    return <Navigate to="/" replace />
  }
  return children
}

// Full Admin only — used for the reference-data modules and for managing
// District Admin accounts, which are association-wide, not district-scoped.
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
