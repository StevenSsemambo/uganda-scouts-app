import { createContext, useContext, useEffect, useState } from 'react'

const InstallPromptContext = createContext(null)

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

// Captures the browser's beforeinstallprompt event ONCE, at the top of the
// app, and shares it through context — so both the auto-shown banner and
// an explicit "Install App" button elsewhere (e.g. the Landing page) can
// trigger the exact same captured prompt, instead of each trying to
// listen independently and racing each other for it.
export function InstallPromptProvider({ children }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [installed, setInstalled] = useState(isRunningStandalone())

  useEffect(() => {
    if (installed) return

    function handleBeforeInstallPrompt(e) {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    function handleAppInstalled() {
      setInstalled(true)
      setDeferredPrompt(null)
    }
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [installed])

  async function install() {
    if (!deferredPrompt) return false
    deferredPrompt.prompt()
    try {
      await deferredPrompt.userChoice
    } catch {
      // User dismissed the native dialog — nothing else to do.
    }
    setDeferredPrompt(null)
    return true
  }

  const value = {
    // true once the browser has told us it's installable (Android/Chrome/
    // Edge/desktop Chromium) — false on iOS Safari, which never fires
    // this event at all, and false once already installed.
    canInstall: Boolean(deferredPrompt) && !installed,
    installed,
    isIOS: isIOS() && !installed,
    install,
  }

  return <InstallPromptContext.Provider value={value}>{children}</InstallPromptContext.Provider>
}

export function useInstallPrompt() {
  const ctx = useContext(InstallPromptContext)
  if (!ctx) {
    // Defensive fallback rather than throwing — a page rendered outside
    // the provider (shouldn't happen, but not worth crashing over) just
    // sees "nothing installable" instead of taking the whole page down.
    return { canInstall: false, installed: false, isIOS: false, install: async () => false }
  }
  return ctx
}
