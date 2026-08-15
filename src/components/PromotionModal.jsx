import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../lib/useNotifications'
import { Button, Card } from './ui'

// Rather than trying to make an already-open session flip live when
// someone is promoted (realtime + polling both help, but neither is
// bulletproof -- websockets get blocked by some networks, and an old
// cached page can be stubborn) this is a deliberate, unmissable prompt:
// stop, tell them plainly what changed, and hand them off to a genuine
// fresh sign-in. A real sign-in always gets the current role, because it
// fetches the profile from scratch rather than relying on anything
// already sitting in memory or cache.
export default function PromotionModal() {
  const { isDistrictAdmin, signOut } = useAuth()
  const { notifications, markRead } = useNotifications()
  const [switching, setSwitching] = useState(false)
  const navigate = useNavigate()

  // Only ever the most recent unread promotion notice, and never once
  // they're already signed in as District Admin (covers the case where
  // realtime/polling already caught up on its own, or they promoted
  // themselves via a fresh login already).
  const promotion = !isDistrictAdmin
    ? notifications.find(n => n.type === 'promotion' && !n.read)
    : null

  if (!promotion) return null

  async function continueAsDistrictAdmin() {
    setSwitching(true)
    try {
      await markRead(promotion.id)
      await signOut()
      navigate('/admin/login', { replace: true })
    } catch (err) {
      console.error('Failed to switch to District Admin:', err)
      setSwitching(false)
    }
  }

  function dismiss() {
    markRead(promotion.id)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 px-4">
      <Card className="max-w-sm w-full">
        <h2 className="font-display font-bold text-xl mb-2">You've Been Promoted! 🎉</h2>
        <p className="text-sm text-ink/70 mb-5">{promotion.body}</p>
        <p className="text-xs text-ink/50 mb-5">
          Sign in again with the same username and password to switch into your District Admin dashboard.
        </p>
        <Button className="w-full mb-2" onClick={continueAsDistrictAdmin} disabled={switching}>
          {switching ? 'Switching…' : 'Continue as District Admin'}
        </Button>
        <Button variant="ghost" className="w-full" onClick={dismiss} disabled={switching}>
          Not Now
        </Button>
      </Card>
    </div>
  )
}
