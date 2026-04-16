const LS_KEY = 'epcot_session_token'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isUuid(s: string): boolean {
  return UUID_RE.test(s.trim())
}

/** Persisted anonymous session for EPCOT upload / predict / artifacts (see FRONTEND_instructions.md). */
export function getOrCreateSessionToken(): string {
  try {
    const existing = localStorage.getItem(LS_KEY)?.trim()
    if (existing && isUuid(existing)) return existing
  } catch {
    /* private mode etc. */
  }
  const token = crypto.randomUUID()
  try {
    localStorage.setItem(LS_KEY, token)
  } catch {
    /* still return token for in-memory-only session this tab */
  }
  return token
}

export function setSessionToken(token: string): void {
  try {
    localStorage.setItem(LS_KEY, token)
  } catch {
    /* ignore */
  }
}

export function clearSessionToken(): void {
  try {
    localStorage.removeItem(LS_KEY)
  } catch {
    /* ignore */
  }
}

export function epcotAuthHeaders(): HeadersInit {
  return { 'X-Session-Token': getOrCreateSessionToken() }
}
