import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

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
