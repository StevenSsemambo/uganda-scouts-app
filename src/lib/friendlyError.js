// Translates common Supabase/auth error text into messages a member can
// actually act on, instead of raw technical text. Extend this map as new
// confusing error patterns turn up in real use.
export function friendlyAuthError(error) {
  if (!error) return ''
  const msg = (error.message || '').toLowerCase()
  const status = error.status || error.code

  if (msg.includes('rate limit') || status === 429) {
    return "We've hit a temporary limit on how many login emails can go out right now. " +
      "This resets gradually — please try again in about an hour. " +
      "If you need to register today, contact your district leader or the Association admin for help."
  }

  if (msg.includes('invalid login credentials')) {
    return "That email and password didn't match. If you haven't set a password yet, use \"Get a login link\" instead."
  }

  if (msg.includes('email not confirmed')) {
    return 'Please confirm your email first — check your inbox for the confirmation link.'
  }

  if (msg.includes('user not found') || msg.includes('invalid email')) {
    return "We couldn't find an account with that email. Double-check it, or sign up as a new member."
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

  return error.message || fallback
}
