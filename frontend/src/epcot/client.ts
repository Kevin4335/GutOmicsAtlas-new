import type { ModalitiesResponse, PredictResponse, SupportedRangeResponse, UploadBamResponse } from './types'
import { EPCOT_DEFAULT_API_BASE } from './config'
import { clearSessionToken, epcotAuthHeaders, getOrCreateSessionToken, setSessionToken } from './session'

export function getEpcotApiBase(): string {
  const u = (import.meta.env.VITE_EPCOT_API_URL as string | undefined)?.trim()
  const base = (u && u.length > 0 ? u : EPCOT_DEFAULT_API_BASE).replace(/\/$/, '')
  return base
}

export class EpcotHttpError extends Error {
  readonly status: number

  constructor(
    status: number,
    message: string,
  ) {
    super(message)
    this.name = 'EpcotHttpError'
    this.status = status
  }
}

async function readErrorBody(res: Response): Promise<string> {
  const ct = res.headers.get('content-type') ?? ''
  if (ct.includes('application/json')) {
    try {
      const j: unknown = await res.json()
      if (typeof j === 'object' && j !== null && 'detail' in j) {
        const d = (j as { detail: unknown }).detail
        if (typeof d === 'string') return d
        if (Array.isArray(d)) return d.map((x) => String(x)).join('; ')
      }
    } catch {
      /* fall through */
    }
  }
  return (await res.text().catch(() => res.statusText)) || res.statusText
}

function joinUrl(base: string, path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}

/** Console preview for EPCOT POST bodies (no large binary dumps). */
function epcotPostBodyForConsole(body: BodyInit | null | undefined): unknown {
  if (body == null) return null
  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as unknown
    } catch {
      return body
    }
  }
  if (body instanceof FormData) {
    const out: Record<string, string> = {}
    for (const [k, v] of body.entries()) {
      out[k] = v instanceof File ? `File(${v.name}, ${v.size} bytes)` : String(v)
    }
    return out
  }
  if (body instanceof URLSearchParams) {
    return Object.fromEntries(body.entries())
  }
  return `[${body.constructor?.name ?? 'BodyInit'}]`
}

function logEpcotPost(url: string, init: RequestInit): void {
  const method = (init.method ?? 'GET').toUpperCase()
  if (method !== 'POST') return
  // eslint-disable-next-line no-console -- intentional EPCOT request tracing
  console.log('[EPCOT] POST', url, epcotPostBodyForConsole(init.body as BodyInit | null | undefined))
}

export async function epcotFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const base = getEpcotApiBase()
  const url = joinUrl(base, path)
  const headers = new Headers(init.headers)
  logEpcotPost(url, init)
  const r = await fetch(url, { ...init, headers })
  return r
}

/**
 * Protected EPCOT request with one automatic 401 recovery:
 * clear stale token, mint a new UUID, then retry once.
 */
async function epcotFetchProtected(path: string, init: RequestInit = {}): Promise<Response> {
  const first = await epcotFetch(path, init)
  if (first.status !== 401) return first

  clearSessionToken()
  const nextToken = getOrCreateSessionToken()
  const nextHeaders = new Headers(init.headers)
  nextHeaders.set('X-Session-Token', nextToken)

  return epcotFetch(path, { ...init, headers: nextHeaders })
}

export async function epcotHealth(): Promise<{ status: string }> {
  const r = await epcotFetch('/health')
  if (!r.ok) throw new EpcotHttpError(r.status, await readErrorBody(r))
  return r.json() as Promise<{ status: string }>
}

export async function epcotModalities(): Promise<string[]> {
  const r = await epcotFetch('/modalities')
  if (!r.ok) throw new EpcotHttpError(r.status, await readErrorBody(r))
  const data = (await r.json()) as ModalitiesResponse
  return data.modalities ?? []
}

export async function epcotSupportedRange(chrom: string): Promise<SupportedRangeResponse> {
  const enc = encodeURIComponent(chrom.trim())
  const r = await epcotFetch(`/supported-range/${enc}`)
  if (!r.ok) throw new EpcotHttpError(r.status, await readErrorBody(r))
  return r.json() as Promise<SupportedRangeResponse>
}

/** Optional: server-minted token + HttpOnly cookie path; replaces stored token on success. */
export async function epcotPostSession(): Promise<string> {
  const r = await epcotFetch('/session', { method: 'POST' })
  if (!r.ok) throw new EpcotHttpError(r.status, await readErrorBody(r))
  const j = (await r.json()) as { session_token?: string }
  const token = j.session_token
  if (!token) throw new EpcotHttpError(500, 'No session_token in POST /session response')
  setSessionToken(token)
  return token
}

export async function epcotUploadBam(file: File): Promise<UploadBamResponse> {
  const form = new FormData()
  form.append('file', file, file.name)
  const r = await epcotFetchProtected('/upload_bam', {
    method: 'POST',
    headers: epcotAuthHeaders(),
    body: form,
  })
  if (!r.ok) throw new EpcotHttpError(r.status, await readErrorBody(r))
  return r.json() as Promise<UploadBamResponse>
}

export type PredictRequestBody = {
  chrom: string
  start: number
  end: number
  modalities: string[]
  upload_id?: string
  plot?: boolean
}

export async function epcotPredict(body: PredictRequestBody): Promise<PredictResponse> {
  const r = await epcotFetchProtected('/predict', {
    method: 'POST',
    headers: {
      ...epcotAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new EpcotHttpError(r.status, await readErrorBody(r))
  return r.json() as Promise<PredictResponse>
}

export async function epcotArtifactBlob(artifactId: string): Promise<Blob> {
  const r = await epcotFetchProtected(`/artifacts/by-id/${encodeURIComponent(artifactId)}`, {
    headers: epcotAuthHeaders(),
  })
  if (!r.ok) throw new EpcotHttpError(r.status, await readErrorBody(r))
  return r.blob()
}

export function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
