// Translates common Supabase/auth error text into messages a member can
// actually act on, instead of raw technical text. Extend this map as new
// confusing error patterns turn up in real use.
export function friendlyAuthError(error) {
  if (!error) return ''
  const msg = (error.message || '').toLowerCase()

  if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('duplicate')) {
    return 'That username is already taken. Please choose a different one.'
  }

  if (msg.includes('invalid login credentials')) {
    return "That username and password didn't match. Double-check them, or ask an admin to set a new password if you've forgotten it."
  }

  if (msg.includes('network') || msg.includes('fetch')) {
    return 'Having trouble reaching the server — check your internet connection and try again.'
  }

  // Fall back to the original message rather than hiding genuinely
  // useful information for cases we haven't specifically handled.
  return error.message || 'Something went wrong. Please try again.'
}

// General-purpose version for data mutations (saves, deletes, sends)
// outside the auth flows above — covers permission/network/db errors
// that any admin or member action could hit.
export function friendlyError(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return ''
  const msg = (error.message || '').toLowerCase()

  if (msg.includes('network') || msg.includes('fetch failed') || msg.includes('failed to fetch')) {
    return 'Having trouble reaching the server — check your internet connection and try again.'
  }
  if (msg.includes('permission denied') || msg.includes('row-level security') || msg.includes('rls')) {
    return "You don't have permission to do that."
  }
  if (msg.includes('duplicate key') || msg.includes('already exists')) {
    return 'That already exists — no changes were made.'
  }
  if (msg.includes('jwt') || msg.includes('expired') || msg.includes('invalid token')) {
    return 'Your session has expired — please sign in again.'
  }
  if (msg.includes('username_format')) {
    return 'Usernames can only use lowercase letters, numbers, and underscores (3-20 characters).'
  }

  return error.message || fallback
}
