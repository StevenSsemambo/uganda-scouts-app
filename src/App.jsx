import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { RequireMember, RequireAdmin } from './components/ProtectedRoute'

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

export default function App() {
  return (
    <AuthProvider>
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

          {/* Admin area */}
          <Route path="/admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
          <Route path="/admin/members" element={<RequireAdmin><AdminMembers /></RequireAdmin>} />
          <Route path="/admin/payments" element={<RequireAdmin><AdminPayments /></RequireAdmin>} />
          <Route path="/admin/modules/:moduleKey" element={<RequireAdmin><AdminModulePage /></RequireAdmin>} />

          <Route path="*" element={<Landing />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
