import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { RequireMember, RequireStaff, RequireAdmin } from './components/ProtectedRoute'
import SplashScreen from './components/SplashScreen'

import Landing from './pages/Landing'
import MemberLogin from './pages/auth/MemberLogin'
import AdminLogin from './pages/auth/AdminLogin'

import MemberDashboard from './pages/member/MemberDashboard'
import MemberProfile from './pages/member/MemberProfile'
import MemberPayments from './pages/member/MemberPayments'
import SubmitInfo from './pages/member/SubmitInfo'

import AdminDashboard from './pages/admin/AdminDashboard'
import AdminMembers from './pages/admin/AdminMembers'
import AdminPayments from './pages/admin/AdminPayments'
import AdminModulePage from './pages/admin/AdminModulePage'
import AdminCategoryAdmins from './pages/admin/AdminCategoryAdmins'

// Minimum time the splash stays up, so the brand actually registers
// instead of flashing past on a fast connection.
const SPLASH_MIN_MS = 1100

function AppShell() {
  const { loading } = useAuth()
  const [minTimeElapsed, setMinTimeElapsed] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setMinTimeElapsed(true), SPLASH_MIN_MS)
    return () => clearTimeout(t)
  }, [])

  if (loading || !minTimeElapsed) {
    return <SplashScreen />
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />

        {/* Auth */}
        <Route path="/member/login" element={<MemberLogin />} />
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Member area */}
        <Route path="/member" element={<RequireMember><MemberDashboard /></RequireMember>} />
        <Route path="/member/profile" element={<RequireMember><MemberProfile /></RequireMember>} />
        <Route path="/member/payments" element={<RequireMember><MemberPayments /></RequireMember>} />
        <Route path="/member/submit" element={<RequireMember><SubmitInfo /></RequireMember>} />

        {/* Shared staff area — full Admin and Category Admin (RLS scopes the data) */}
        <Route path="/admin" element={<RequireStaff><AdminDashboard /></RequireStaff>} />
        <Route path="/admin/members" element={<RequireStaff><AdminMembers /></RequireStaff>} />
        <Route path="/admin/payments" element={<RequireStaff><AdminPayments /></RequireStaff>} />

        {/* Full Admin only */}
        <Route path="/admin/modules/:moduleKey" element={<RequireAdmin><AdminModulePage /></RequireAdmin>} />
        <Route path="/admin/category-admins" element={<RequireAdmin><AdminCategoryAdmins /></RequireAdmin>} />

        <Route path="*" element={<Landing />} />
      </Routes>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  )
}
