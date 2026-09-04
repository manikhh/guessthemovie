const USERNAME_RE = /^[a-z0-9_]{3,32}$/
const USERNAME_LOOKUP_RE = /^[a-z0-9_]{2,32}$/
const MIN_PASSWORD_LEN = 8

export function normalizeUsername(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const username = raw.trim().toLowerCase()
  return USERNAME_RE.test(username) ? username : null
}

export function normalizeUsernameLookup(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const username = raw.trim().toLowerCase()
  return USERNAME_LOOKUP_RE.test(username) ? username : null
}

export function validatePassword(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const password = raw
  return password.length >= MIN_PASSWORD_LEN ? password : null
}

export function passwordsMatch(password: string, repeat: unknown): boolean {
  return typeof repeat === 'string' && password === repeat
}
