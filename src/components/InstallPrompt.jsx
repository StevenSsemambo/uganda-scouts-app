import { useEffect, useState } from 'react'

const DISMISS_KEY = 'usa-app-install-dismissed-at'
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000 // don't nag again for a week

function isRunningStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari's own flag for "already added to home screen" —
    // display-mode: standalone isn't reliable there.
    window.navigator.standalone === true
  )
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

// No browser lets a website force its native "Install" dialog to appear
// on its own — that always requires a real click on something, and only
// after the browser itself decides the site is "installable" (a
// beforeinstallprompt event it fires on its own schedule, not ours). iOS
// Safari never fires that event at all; installing there is always a
// manual Share -> Add to Home Screen action with no programmatic trigger
// whatsoever. This gets as close to "automatic" as is actually possible:
// our own banner appears the moment the page loads (that part we DO
// control), and the one tap on it either fires the real system prompt
// (Android/Chrome/Edge) or shows the manual steps (iOS).
export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showIOSInstructions, setShowIOSInstructions] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isRunningStandalone()) return

    let dismissedAt = null
    try {
      dismissedAt = Number(localStorage.getItem(DISMISS_KEY)) || null
    } catch {
      // Private browsing / storage disabled — just don't persist the
      // dismissal, the banner can show again next visit, that's fine.
    }
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_COOLDOWN_MS) return

    function handleBeforeInstallPrompt(e) {
      e.preventDefault()
      setDeferredPrompt(e)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    function handleAppInstalled() {
      setVisible(false)
      setDeferredPrompt(null)
    }
    window.addEventListener('appinstalled', handleAppInstalled)

    // iOS never fires beforeinstallprompt, so show our own instructional
    // version there instead, gated by the same dismissal cooldown.
    if (isIOS()) {
      setShowIOSInstructions(true)
      setVisible(true)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  function dismiss() {
    setVisible(false)
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {
      // Ignore — worst case the banner reappears next visit.
    }
  }

  async function install() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    try {
      await deferredPrompt.userChoice
    } catch {
      // User dismissed the native dialog — nothing else to do.
    }
    setDeferredPrompt(null)
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 flex justify-center px-4 pb-4 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-sm bg-forest text-canvas rounded-xl shadow-lg px-4 py-3.5 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-display font-semibold text-sm">Install The USA App</p>
          <p className="text-xs text-canvas/75 mt-0.5">
            {showIOSInstructions
              ? 'Tap the Share icon, then "Add to Home Screen".'
              : 'Add it to your home screen for quick, offline-friendly access.'}
          </p>
        </div>
        {!showIOSInstructions && (
          <button
            onClick={install}
            className="shrink-0 bg-canvas text-forest text-xs font-semibold rounded-lg px-3 py-2"
          >
            Install
          </button>
        )}
        <button onClick={dismiss} className="shrink-0 text-canvas/60 text-xs px-1" aria-label="Dismiss">
          ✕
        </button>
      </div>
    </div>
  )
}
