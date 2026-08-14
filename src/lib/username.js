// Supabase Auth is fundamentally email-based under the hood — there's
// no native username login. The standard workaround: generate a
// deterministic, synthetic internal email from the username, and use
// Supabase's normal email+password machinery behind the scenes. The
// member never sees or types this address — only their username.
const INTERNAL_DOMAIN = 'usa-app.internal'

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/

export function isValidUsername(username) {
  return USERNAME_PATTERN.test(username)
}

export function usernameToEmail(username) {
  return `${username.trim().toLowerCase()}@${INTERNAL_DOMAIN}`
}
