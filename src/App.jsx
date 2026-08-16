import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { RequireMember, RequireStaff, RequireAdmin } from './components/ProtectedRoute'
import SplashScreen from './components/SplashScreen'
import ErrorBoundary from './components/ErrorBoundary'
import InstallPrompt from './components/InstallPrompt'

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
import AdminDistrictAdmins from './pages/admin/AdminDistrictAdmins'
import AdminBankDetails from './pages/admin/AdminBankDetails'
import SendMessage from './pages/admin/SendMessage'
import AdminAccount from './pages/admin/AdminAccount'

// Minimum time the splash stays up, so the brand actually registers
// instead of flashing past on a fast connection.
const SPLASH_MIN_MS = 1100

// Wraps a page element in its own error boundary — so a crash on one
// page shows a recoverable "Try Again" screen without taking the rest
// of the app's navigation state down with it.
function page(element) {
  return <ErrorBoundary>{element}</ErrorBoundary>
}

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
      <InstallPrompt />
      <Routes>
        <Route path="/" element={page(<Landing />)} />

        {/* Auth */}
        <Route path="/member/login" element={page(<MemberLogin />)} />
        <Route path="/admin/login" element={page(<AdminLogin />)} />

        {/* Member area */}
        <Route path="/member" element={page(<RequireMember><MemberDashboard /></RequireMember>)} />
        <Route path="/member/profile" element={page(<RequireMember><MemberProfile /></RequireMember>)} />
        <Route path="/member/payments" element={page(<RequireMember><MemberPayments /></RequireMember>)} />
        <Route path="/member/submit" element={page(<RequireMember><SubmitInfo /></RequireMember>)} />

        {/* Shared staff area — full Admin and District Admin (RLS scopes the data) */}
        <Route path="/admin" element={page(<RequireStaff><AdminDashboard /></RequireStaff>)} />
        <Route path="/admin/members" element={page(<RequireStaff><AdminMembers /></RequireStaff>)} />
        <Route path="/admin/payments" element={page(<RequireStaff><AdminPayments /></RequireStaff>)} />
        <Route path="/admin/send-message" element={page(<RequireStaff><SendMessage /></RequireStaff>)} />
        <Route path="/admin/account" element={page(<RequireStaff><AdminAccount /></RequireStaff>)} />

        {/* Full Admin only */}
        <Route path="/admin/modules/:moduleKey" element={page(<RequireAdmin><AdminModulePage /></RequireAdmin>)} />
        <Route path="/admin/district-admins" element={page(<RequireAdmin><AdminDistrictAdmins /></RequireAdmin>)} />
        <Route path="/admin/bank-details" element={page(<RequireAdmin><AdminBankDetails /></RequireAdmin>)} />

        <Route path="*" element={page(<Landing />)} />
      </Routes>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </ErrorBoundary>
  )
}
