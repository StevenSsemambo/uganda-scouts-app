import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'

// The default PWA setup only checks for a new deployed version on a full
// page load/navigation, which the browser itself only does on its own
// schedule (can be many hours). That meant a district admin promoted on
// the live site could keep an already-open tab and never actually pick
// up the frontend code that knows what a District Admin is -- the app
// would look "stuck" on whatever version was cached at their last visit,
// even though the database change (their new role) took effect instantly.
// This registers the service worker explicitly, checks for an update
// every 60 seconds while the tab is open, and reloads automatically the
// moment a new version activates, so a role change becomes visible within
// a minute instead of requiring a manual hard refresh.
const updateSW = registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return
    setInterval(() => {
      registration.update().catch(() => {})
    }, 60_000)
  },
  onNeedRefresh() {
    updateSW(true)
  },
})

// Last-resort safety net: React's ErrorBoundary only catches errors
// during rendering — it does NOT catch errors inside event handlers,
// timers, or promises. Every such spot in this app is already wrapped
// in its own try/catch with a friendly message, but this listener
// exists so that if anything is ever missed, it's logged clearly
// instead of failing completely silently with a stuck "Saving…" button
// and no visible feedback at all.
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason)
})
window.addEventListener('error', (event) => {
  console.error('Unhandled error:', event.error || event.message)
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
