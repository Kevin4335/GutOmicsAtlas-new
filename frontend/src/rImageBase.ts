const DEFAULT_R_IMAGE_BASE = 'http://128.84.40.118'

/**
 * Base URL for R PNG microservices (scheme + host, no trailing slash).
 * Treats empty/whitespace env as unset so production builds never emit `:port/...`.
 */
export function rImageBaseHost(): string {
  const raw = (import.meta.env.VITE_R_BASE_HOST as string | undefined)?.trim()
  const stripped = raw?.replace(/\/$/, '') ?? ''
  return stripped.length > 0 ? stripped : DEFAULT_R_IMAGE_BASE
}
