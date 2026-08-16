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

// Rather than rejecting whatever someone types with an error message,
// silently clean it up as they go — strips spaces/punctuation, forces
// lowercase, caps the length. Turns a whole class of "why won't this
// work" moments into nothing happening at all, which is a much smaller
// ask of someone who isn't confident with apps.
export function sanitizeUsername(input) {
  return input.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20)
}

// Auto-fills the username field from whatever name someone types, so
// they never have to invent one from scratch — "Nakato Sarah" becomes
// "nakatosarah", still editable if they want something else.
export function suggestUsernameFromName(name) {
  return sanitizeUsername(name.replace(/\s+/g, ''))
}

export function usernameToEmail(username) {
  return `${username.trim().toLowerCase()}@${INTERNAL_DOMAIN}`
}
