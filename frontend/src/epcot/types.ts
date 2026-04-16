export type UploadBamResponse = {
  upload_id: string
  content_md5: string
  atac_artifact_id: string
  conversion: unknown
}

export type PredictResultRow =
  | { modality: string; ok: true; artifact_id: string }
  | { modality: string; ok: false; error: string }

export type PredictResponse = {
  chrom: string
  start: number
  end: number
  results: PredictResultRow[]
  pickle_artifact_id: string | null
  atac_pickle_hash: string
  plots?: { stacked_1d?: string; stacked_2d?: string }
}

export type SupportedRangeResponse = {
  min_start: number
  max_end: number
}

export type ModalitiesResponse = {
  modalities: string[]
}
