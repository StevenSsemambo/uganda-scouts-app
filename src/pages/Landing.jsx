import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui'
import { useAuth } from '../context/AuthContext'

export default function Landing() {
  const { user, profile, loading } = useAuth()
  const navigate = useNavigate()

  // If someone lands here already signed in, send them straight to
  // their area instead of showing the generic landing page.
  useEffect(() => {
    if (loading || !user) return
    if (profile?.role === 'admin' || profile?.role === 'district_admin') {
      navigate('/admin', { replace: true })
    } else {
      navigate('/member', { replace: true })
    }
  }, [user, profile, loading, navigate])

  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center px-6 text-center">
      <img
        src="/wordmark-logo.png"
        alt="The Uganda Scouts Association"
        className="w-48 md:w-56 mb-8 drop-shadow-sm"
      />
      <p className="text-ink/60 max-w-md mb-10">
        Membership registration, subscriptions, and fee tracking for districts across Uganda.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link to="/member/login">
          <Button variant="primary" className="px-8 py-3.5 text-base w-full sm:w-auto">
            I'm a Member
          </Button>
        </Link>
        <Link to="/admin/login">
          <Button variant="ghost" className="px-8 py-3.5 text-base w-full sm:w-auto">
            Admin Login
          </Button>
        </Link>
      </div>
      <p className="text-[10px] tracking-[0.25em] text-ink/35 uppercase mt-10">Built by</p>
      <div className="flex items-center gap-2.5 mt-1.5">
        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-forest to-ember text-canvas font-mono text-xs font-bold shadow-sm">
          {'</>'}
        </span>
        <div className="text-left leading-tight">
          <p className="font-display italic font-semibold text-ink text-lg">SayMyTech</p>
          <p className="text-[9px] tracking-[0.2em] text-ink/45 uppercase -mt-1">Developers</p>
        </div>
      </div>
    </div>
  )
}
