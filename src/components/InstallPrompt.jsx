import { useEffect, useState } from 'react'
import { useInstallPrompt } from '../context/InstallPromptContext'

const DISMISS_KEY = 'usa-app-install-dismissed-at'
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000 // don't nag again for a week

// The auto-shown bottom banner. Shares its captured install event with
// the explicit "Install App" button on the Landing page via
// InstallPromptContext — see that file for why beforeinstallprompt is
// captured once, centrally, instead of here.
export default function InstallPrompt() {
  const { canInstall, installed, isIOS, install } = useInstallPrompt()
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    try {
      const dismissedAt = Number(localStorage.getItem(DISMISS_KEY)) || null
      if (dismissedAt && Date.now() - dismissedAt < DISMISS_COOLDOWN_MS) {
        setDismissed(true)
      }
    } catch {
      // Private browsing / storage disabled — just don't persist the
      // dismissal, the banner can show again next visit, that's fine.
    }
  }, [])

  function dismiss() {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {
      // Ignore — worst case the banner reappears next visit.
    }
  }

  if (installed || dismissed || !(canInstall || isIOS)) return null

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 flex justify-center px-4 pb-4 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-sm bg-forest text-canvas rounded-xl shadow-lg px-4 py-3.5 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-display font-semibold text-sm">Install The USA App</p>
          <p className="text-xs text-canvas/75 mt-0.5">
            {isIOS
              ? 'Tap the Share icon, then "Add to Home Screen".'
              : 'Add it to your home screen for quick, offline-friendly access.'}
          </p>
        </div>
        {canInstall && (
          <button
            onClick={() => install().then(dismiss)}
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
