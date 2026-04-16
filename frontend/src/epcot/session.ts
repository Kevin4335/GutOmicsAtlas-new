const LS_KEY = 'epcot_session_token'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isUuid(s: string): boolean {
  return UUID_RE.test(s.trim())
}

function createUuidFallback(): string {
  // RFC4122-ish v4 UUID fallback for environments without crypto.randomUUID().
  const cryptoObj =
    typeof globalThis !== 'undefined' && 'crypto' in globalThis
      ? (globalThis.crypto as Crypto | undefined)
      : undefined

  if (cryptoObj?.getRandomValues) {
    const bytes = new Uint8Array(16)
    cryptoObj.getRandomValues(bytes)
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }

  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).slice(1)
  return `${s4()}${s4()}-${s4()}-4${s4().slice(1)}-${((8 + Math.random() * 4) | 0).toString(16)}${s4().slice(1)}-${s4()}${s4()}${s4()}`
}

function createSessionToken(): string {
  const cryptoObj =
    typeof globalThis !== 'undefined' && 'crypto' in globalThis
      ? (globalThis.crypto as Crypto | undefined)
      : undefined
  if (cryptoObj?.randomUUID) return cryptoObj.randomUUID()
  return createUuidFallback()
}

/** Persisted anonymous session for EPCOT upload / predict / artifacts (see FRONTEND_instructions.md). */
export function getOrCreateSessionToken(): string {
  try {
    const existing = localStorage.getItem(LS_KEY)?.trim()
    if (existing && isUuid(existing)) return existing
  } catch {
    /* private mode etc. */
  }
  const token = createSessionToken()
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
