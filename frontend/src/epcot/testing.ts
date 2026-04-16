import type { PredictResponse, UploadBamResponse } from './types'

const MOCK_UPLOAD_DELAY_MS = 5000
const MOCK_PREDICT_DELAY_MS = 1200

export const MOCK_RNA_ARTIFACT_ID = 'mock:rna-json'
export const MOCK_PLOT_1D_ARTIFACT_ID = 'mock:stacked-1d'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function fakeUuidLike(prefix: string): string {
  return `${prefix}-${Math.random().toString(16).slice(2, 10)}-${Date.now().toString(16)}`
}

export async function mockUploadBam(): Promise<UploadBamResponse> {
  await sleep(MOCK_UPLOAD_DELAY_MS)
  return {
    upload_id: fakeUuidLike('upload'),
    content_md5: 'mock-md5-testing-mode',
    atac_artifact_id: 'mock:atac-pickle',
    conversion: { mock: true, note: 'Testing mode upload simulation' },
  }
}

export async function mockPredict(opts: {
  chrom: string
  start: number
  end: number
  modalities: string[]
  plot: boolean
}): Promise<PredictResponse> {
  await sleep(MOCK_PREDICT_DELAY_MS)
  return {
    chrom: opts.chrom,
    start: opts.start,
    end: opts.end,
    results: opts.modalities.map((m) => ({ modality: m, ok: true as const, artifact_id: MOCK_RNA_ARTIFACT_ID })),
    pickle_artifact_id: null,
    atac_pickle_hash: 'mock-atac-hash',
    plots: opts.plot ? { stacked_1d: MOCK_PLOT_1D_ARTIFACT_ID } : undefined,
  }
}

export function mockModalities(): string[] {
  return ['rna', 'atac', 'hic', 'epi']
}

export function mockSupportedRange(): { min_start: number; max_end: number } {
  return { min_start: 1, max_end: 250_000_000 }
}

export async function mockArtifactBlob(artifactId: string): Promise<Blob> {
  const normalized = artifactId.toLowerCase()
  const wantsPlot =
    normalized === MOCK_PLOT_1D_ARTIFACT_ID ||
    normalized.includes('stacked_1d') ||
    normalized.endsWith('.png') ||
    normalized.includes('/data/')

  const preferredPath = wantsPlot ? '/imgs/stacked_1d.png' : '/rna.json'
  let r = await fetch(preferredPath)
  if (!r.ok && wantsPlot) {
    // Backward-compatible fallback for older local layouts.
    r = await fetch('/stacked_1d.png')
  }
  if (!r.ok && wantsPlot) {
    // Extra fallback for setups that keep test assets under /data/.
    r = await fetch('/data/stacked_1d.png')
  }
  if (!r.ok) throw new Error(`Mock asset missing for ${artifactId}`)
  return r.blob()
}
