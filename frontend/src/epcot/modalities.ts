// Hardcoded EPCOT modalities for both production + testing UIs.
// Keep in sync with backend /modalities output when contracts change.
export const EPCOT_MODALITIES = [
  'epi',
  'rna',
  'bru',
  'microc',
  'hic',
  'intacthic',
  'rna_strand',
  'external_tf',
  'tt',
  'groseq',
  'grocap',
  'proseq',
  'netcage',
  'starr',
] as const

export type EpcotModality = (typeof EPCOT_MODALITIES)[number]
