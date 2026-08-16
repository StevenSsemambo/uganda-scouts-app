import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useInstallPrompt } from '../context/InstallPromptContext'

export default function Landing() {
  const { user, profile, loading } = useAuth()
  const { canInstall, installed, isIOS, install } = useInstallPrompt()
  const [showIOSHint, setShowIOSHint] = useState(false)
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

      {!installed && (canInstall || isIOS) && (
        <div className="mt-6">
          <button
            onClick={() => (canInstall ? install() : setShowIOSHint(s => !s))}
            className="text-sm text-forest font-medium hover:underline inline-flex items-center gap-1.5"
          >
            <span aria-hidden="true">⬇</span> Install App on This Device
          </button>
          {showIOSHint && (
            <p className="text-xs text-ink/50 mt-2 max-w-xs mx-auto">
              Tap the Share icon in your browser, then "Add to Home Screen".
            </p>
          )}
        </div>
      )}

      <p className="text-sm text-ink/60 font-medium mt-8">By SayMyTech Developers</p>
    </div>
  )
}
