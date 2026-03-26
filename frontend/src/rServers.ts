export type ScRnaSampleType = 'fetal' | 'adult'
export type ScRnaCellType = 'epithelial' | 'enteroendocrine'
export type SnAtacCellType = 'all' | 'epithelial'

// Browser-safe default: same-origin proxy (server.py) to avoid CORS + HTTPS mixed-content.
// Override if you really want to call the ports directly.
const R_PROXY_BASE = (import.meta.env.VITE_R_PROXY_BASE as string | undefined)?.replace(/\/$/, '') ?? ''
const GENERATED_BASE = (import.meta.env.VITE_GENERATED_BASE as string | undefined)?.replace(/\/$/, '') ?? ''

function toHexUtf8(str: string) {
  let out = ''
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i)
    if (code < 0x80) out += code.toString(16).padStart(2, '0')
    else if (code < 0x800) out += (0xc0 | (code >> 6)).toString(16).padStart(2, '0') + (0x80 | (code & 0x3f)).toString(16).padStart(2, '0')
    else out += (0xe0 | (code >> 12)).toString(16).padStart(2, '0') + (0x80 | ((code >> 6) & 0x3f)).toString(16).padStart(2, '0') + (0x80 | (code & 0x3f)).toString(16).padStart(2, '0')
  }
  return out
}

function tokenHex(bytes = 16): string {
  const arr = new Uint8Array(bytes)
  crypto.getRandomValues(arr)
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('')
}

function dockerPngPath(fileBase: string): { fileName: string; absPath: string } {
  const fileName = `${fileBase}.png`
  // R servers run on the web host; write into the shared docker_data directory.
  const absPath = `/home/ubuntu/website/docker_data/${fileName}`
  return { fileName, absPath }
}

async function callR(port: number, payload: unknown, signal?: AbortSignal): Promise<void> {
  const hex = toHexUtf8(JSON.stringify(payload))
  const url = `${R_PROXY_BASE}/r/${port}/${hex}`
  const res = await fetch(url, { method: 'GET', signal })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(txt ? `R ${port}: ${txt}` : `R ${port}: HTTP ${res.status}`)
  }
}

export async function fetchScRnaImage(opts: { gene: string; sampleType: ScRnaSampleType; cellType: ScRnaCellType; signal?: AbortSignal }): Promise<string> {
  const port = opts.cellType === 'epithelial' ? 9025 : 9024
  const { fileName, absPath } = dockerPngPath(`scrna_${opts.cellType}_${opts.sampleType}_${tokenHex(12)}`)
  await callR(port, { sample_type: opts.sampleType, p1: opts.gene, p2: absPath }, opts.signal)
  // Served by server.py (/generated/* reads from ../docker_data)
  return `${GENERATED_BASE}/generated/${fileName}?t=${Date.now()}`
}

export async function fetchSnAtacImage(opts: { loci: string; cellType: SnAtacCellType; signal?: AbortSignal }): Promise<string> {
  const port = opts.cellType === 'all' ? 9026 : 9027
  const id = opts.cellType === 'all' ? 26 : 27
  const { fileName, absPath } = dockerPngPath(`snatac_${opts.cellType}_${tokenHex(12)}`)
  await callR(port, { f: id, p1: opts.loci, p2: absPath }, opts.signal)
  return `${GENERATED_BASE}/generated/${fileName}?t=${Date.now()}`
}

