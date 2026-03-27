export type ScRnaSampleType = 'fetal' | 'adult'
export type ScRnaCellType = 'epithelial' | 'enteroendocrine'
export type SnAtacCellType = 'all' | 'epithelial'

// R apps now expose image endpoints; frontend can use returned URL directly as <img src>.
const R_PROXY_BASE = (import.meta.env.VITE_R_PROXY_BASE as string | undefined)?.replace(/\/$/, '') ?? ''

function joinBase(path: string): string {
  return `${R_PROXY_BASE}${path}`
}

export function getScRnaImageUrl(opts: { gene: string; sampleType: ScRnaSampleType; cellType: ScRnaCellType }): string {
  const port = opts.cellType === 'epithelial' ? 9025 : 9024
  const encodedGene = encodeURIComponent(opts.gene)
  const encodedStage = encodeURIComponent(opts.sampleType)
  return joinBase(`/r/${port}/genes/${encodedGene}?sample_type=${encodedStage}`)
}

export function getSnAtacImageUrl(opts: { loci: string; cellType: SnAtacCellType }): string {
  const port = opts.cellType === 'all' ? 9026 : 9027
  const encodedLoci = encodeURIComponent(opts.loci)
  return joinBase(`/r/${port}/genes/${encodedLoci}`)
}
