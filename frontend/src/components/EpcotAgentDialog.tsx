import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import ModelTrainingOutlinedIcon from '@mui/icons-material/ModelTrainingOutlined'
import type { PredictResponse, PredictResultRow } from '../epcot/types'
import { EPCOT_TESTING_MODE } from '../epcot/config'
import { getOrCreateSessionToken } from '../epcot/session'
import {
  EpcotHttpError,
  epcotArtifactBlob,
  epcotHealth,
  epcotModalities,
  epcotPredict,
  epcotSupportedRange,
  epcotUploadBam,
  getEpcotApiBase,
  triggerBrowserDownload,
} from '../epcot/client'
import {
  mockArtifactBlob,
  mockModalities,
  mockPredict,
  mockSupportedRange,
  mockUploadBam,
} from '../epcot/testing'

const MAX_WINDOW_BP = 600_000

const CHROM_OPTIONS = [
  ...Array.from({ length: 22 }, (_, i) => String(i + 1)),
  'X',
  'Y',
] as const

/** Four researcher-facing steps; step 3 = results. */
type WizardStep = 0 | 1 | 2 | 3

type Props = {
  open: boolean
  onClose: () => void
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n))
}

function parseBp(raw: string): number | null {
  const t = raw.trim().replace(/[,_\s]/g, '')
  if (!t) return null
  const n = Number(t)
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) return null
  return n
}

function friendlyServiceError(e: unknown): string {
  if (e instanceof EpcotHttpError) {
    if (e.status === 413) return 'That file is larger than the service accepts. Try a smaller alignment file.'
    if (e.status === 401) return 'Your session could not be verified. Close this window, open EPCOT Agent again, and retry.'
    if (e.status === 404 || e.status === 410)
      return 'The service could not find your data. Try attaching your file again, or start a new analysis.'
    if (e.status >= 500) return 'The analysis service hit an error. Please try again in a few minutes.'
    return 'Something went wrong. Please try again or contact your site administrator.'
  }
  if (e instanceof TypeError && e.message.toLowerCase().includes('fetch')) {
    return 'Could not reach the analysis service. Check your network or try again later.'
  }
  return 'Something went wrong. Please try again.'
}

function plotLabel(key: string): string {
  if (key === 'stacked_1d') return 'Stacked 1D preview'
  if (key === 'stacked_2d') return 'Stacked 2D preview'
  return key.replace(/_/g, ' ')
}

export default function EpcotAgentDialog({ open, onClose }: Props) {
  const apiBase = useMemo(() => getEpcotApiBase(), [])

  const [step, setStep] = useState<WizardStep>(0)
  const [serverOnline, setServerOnline] = useState<boolean | null>(null)
  const [rangeError, setRangeError] = useState<string | null>(null)
  const [rangeBounds, setRangeBounds] = useState<{ min_start: number; max_end: number } | null>(null)
  const [chrom, setChrom] = useState<string>('1')
  const [startStr, setStartStr] = useState('')
  const [endStr, setEndStr] = useState('')
  const [modalitiesList, setModalitiesList] = useState<string[]>([])
  const [modalitiesLoading, setModalitiesLoading] = useState(false)
  const [modalitiesPick, setModalitiesPick] = useState<Record<string, boolean>>({})
  const [bamFile, setBamFile] = useState<File | null>(null)
  const [uploadId, setUploadId] = useState<string | null>(null)
  const [useReferenceAtac, setUseReferenceAtac] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [plot, setPlot] = useState(false)
  const [predicting, setPredicting] = useState(false)
  const [predictResult, setPredictResult] = useState<PredictResponse | null>(null)
  const [rnaPreview, setRnaPreview] = useState<string | null>(null)
  const [rnaPreviewLoading, setRnaPreviewLoading] = useState(false)
  const [plotPreviewUrls, setPlotPreviewUrls] = useState<Record<string, string>>({})
  const [plotPreviewLoading, setPlotPreviewLoading] = useState(false)
  const [userMessage, setUserMessage] = useState<string | null>(null)
  const [techError, setTechError] = useState<string | null>(null)

  const testingMode = EPCOT_TESTING_MODE === 1
  const showTech = testingMode

  const getArtifactBlob = useCallback(
    (artifactId: string) => (testingMode ? mockArtifactBlob(artifactId) : epcotArtifactBlob(artifactId)),
    [testingMode],
  )

  const checkServer = useCallback(async () => {
    if (testingMode) {
      setServerOnline(true)
      return
    }
    setServerOnline(null)
    setTechError(null)
    try {
      const h = await epcotHealth()
      setServerOnline(h.status === 'ok')
    } catch (e) {
      setServerOnline(false)
      if (showTech) setTechError(e instanceof EpcotHttpError ? e.message : String(e))
    }
  }, [showTech, testingMode])

  const loadModalities = useCallback(async () => {
    if (testingMode) {
      const list = mockModalities()
      setModalitiesList(list)
      setModalitiesPick(() => {
        const next: Record<string, boolean> = {}
        for (const m of list) next[m] = true
        return next
      })
      return
    }
    setModalitiesLoading(true)
    setUserMessage(null)
    setTechError(null)
    try {
      const list = await epcotModalities()
      setModalitiesList(list)
      setModalitiesPick(() => {
        const next: Record<string, boolean> = {}
        const first = list[0]
        for (const m of list) next[m] = list.length === 1 ? true : m === first
        return next
      })
    } catch (e) {
      setUserMessage(friendlyServiceError(e))
      if (showTech) setTechError(e instanceof EpcotHttpError ? e.message : String(e))
    } finally {
      setModalitiesLoading(false)
    }
  }, [showTech, testingMode])

  const loadRange = useCallback(async () => {
    if (testingMode) {
      const r = mockSupportedRange()
      setRangeError(null)
      setRangeBounds(r)
      if (!startStr) setStartStr('750000')
      if (!endStr) setEndStr('1000000')
      return
    }
    setRangeError(null)
    setRangeBounds(null)
    try {
      const r = await epcotSupportedRange(chrom)
      setRangeBounds({ min_start: r.min_start, max_end: r.max_end })
      setStartStr(String(r.min_start))
      setEndStr(String(Math.min(r.min_start + MAX_WINDOW_BP, r.max_end)))
    } catch (e) {
      setRangeError(
        showTech
          ? e instanceof EpcotHttpError
            ? e.message
            : String(e)
          : 'This chromosome is not available for analysis. Try another chromosome.',
      )
    }
  }, [chrom, showTech, testingMode, startStr, endStr])

  useEffect(() => {
    if (!open) {
      setStep(0)
      setServerOnline(null)
      setRangeError(null)
      setRangeBounds(null)
      setChrom('1')
      setStartStr('')
      setEndStr('')
      setModalitiesList([])
      setModalitiesPick({})
      setBamFile(null)
      setUploadId(null)
      setUseReferenceAtac(false)
      setUploading(false)
      setPlot(false)
      setPredicting(false)
      setPredictResult(null)
      setRnaPreview(null)
      setRnaPreviewLoading(false)
      setPlotPreviewUrls((prev) => {
        Object.values(prev).forEach((u) => URL.revokeObjectURL(u))
        return {}
      })
      setPlotPreviewLoading(false)
      setUserMessage(null)
      setTechError(null)
      return
    }
    getOrCreateSessionToken()
    void checkServer()
    void loadModalities()
  }, [open, checkServer, loadModalities])

  useEffect(() => {
    if (!open) return
    void loadRange()
  }, [open, chrom, loadRange])

  const selectedModalities = useMemo(
    () => modalitiesList.filter((m) => modalitiesPick[m]),
    [modalitiesList, modalitiesPick],
  )

  const intervalValid = useMemo(() => {
    if (testingMode) return true
    if (!rangeBounds) return false
    const start = parseBp(startStr)
    const end = parseBp(endStr)
    if (start == null || end == null) return false
    const lo = rangeBounds.min_start
    const hi = rangeBounds.max_end
    const cs = clamp(start, lo, hi)
    const ce = clamp(end, lo, hi)
    if (ce <= cs) return false
    if (ce - cs > MAX_WINDOW_BP) return false
    return true
  }, [rangeBounds, startStr, endStr, testingMode])

  const clampedInterval = useMemo(() => {
    if (testingMode) {
      const s = parseBp(startStr) ?? 750_000
      const eRaw = parseBp(endStr) ?? 1_000_000
      const e = eRaw > s ? eRaw : s + 1_000
      return { start: s, end: e }
    }
    if (!rangeBounds) return null
    const start = parseBp(startStr)
    const end = parseBp(endStr)
    if (start == null || end == null) return null
    const lo = rangeBounds.min_start
    const hi = rangeBounds.max_end
    let cs = clamp(start, lo, hi)
    let ce = clamp(end, lo, hi)
    if (ce <= cs) return null
    if (ce - cs > MAX_WINDOW_BP) ce = cs + MAX_WINDOW_BP
    return { start: cs, end: ce }
  }, [rangeBounds, startStr, endStr, testingMode])

  const handleUploadBam = async () => {
    if (!bamFile) return
    getOrCreateSessionToken()
    setUploading(true)
    setUserMessage(null)
    setTechError(null)
    try {
      const res = testingMode ? await mockUploadBam() : await epcotUploadBam(bamFile)
      setUploadId(res.upload_id)
      setUserMessage('Your alignment file is attached and will be used for this run.')
    } catch (e) {
      setUserMessage(friendlyServiceError(e))
      if (showTech) setTechError(e instanceof EpcotHttpError ? e.message : String(e))
      setUploadId(null)
    } finally {
      setUploading(false)
    }
  }

  const handlePredict = async () => {
    if (!clampedInterval || selectedModalities.length === 0) return
    getOrCreateSessionToken()
    if (serverOnline === false) {
      setUserMessage('The analysis service is not available right now. Please try again when the status shows available.')
      return
    }
    setPredicting(true)
    setUserMessage(null)
    setTechError(null)
    try {
      const body = {
        chrom,
        start: clampedInterval.start,
        end: clampedInterval.end,
        modalities: selectedModalities,
        plot,
        ...(uploadId ? { upload_id: uploadId } : {}),
      }
      const res = testingMode
        ? await mockPredict({
            chrom: body.chrom,
            start: body.start,
            end: body.end,
            modalities: body.modalities,
            plot: body.plot ?? false,
          })
        : await epcotPredict(body)
      setPredictResult(res)
      setRnaPreview(null)
      setPlotPreviewUrls((prev) => {
        Object.values(prev).forEach((u) => URL.revokeObjectURL(u))
        return {}
      })
      setStep(3)
    } catch (e) {
      setUserMessage(friendlyServiceError(e))
      if (showTech) setTechError(e instanceof EpcotHttpError ? e.message : String(e))
    } finally {
      setPredicting(false)
    }
  }

  const downloadArtifact = async (artifactId: string, filename: string) => {
    getOrCreateSessionToken()
    setUserMessage(null)
    setTechError(null)
    try {
      const blob = await getArtifactBlob(artifactId)
      triggerBrowserDownload(blob, filename)
    } catch (e) {
      setUserMessage(friendlyServiceError(e))
      if (showTech) setTechError(e instanceof EpcotHttpError ? e.message : String(e))
    }
  }

  useEffect(() => {
    if (!predictResult) return
    let disposed = false

    const loadPreviews = async () => {
      const rnaRow = predictResult.results.find(
        (row): row is Extract<PredictResultRow, { ok: true }> =>
          row.ok === true && /rna/i.test(row.modality),
      )
      if (rnaRow) {
        setRnaPreviewLoading(true)
        try {
          const blob = await getArtifactBlob(rnaRow.artifact_id)
          const text = await blob.text()
          const parsed = JSON.parse(text) as unknown
          const pretty = JSON.stringify(parsed, null, 2)
          const clipped = pretty.length > 6000 ? `${pretty.slice(0, 6000)}\n... (preview truncated)` : pretty
          if (!disposed) setRnaPreview(clipped)
        } catch {
          if (!disposed) setRnaPreview('Could not preview RNA JSON in-browser. You can still download the full file.')
        } finally {
          if (!disposed) setRnaPreviewLoading(false)
        }
      } else {
        setRnaPreview(null)
      }

      const plotEntries = Object.entries(predictResult.plots ?? {}).filter(([, id]) => Boolean(id)) as Array<
        [string, string]
      >
      if (plotEntries.length) {
        setPlotPreviewLoading(true)
        const urls: Record<string, string> = {}
        await Promise.all(
          plotEntries.map(async ([k, id]) => {
            try {
              const blob = await getArtifactBlob(id)
              urls[k] = URL.createObjectURL(blob)
            } catch {
              // keep missing plot preview silent; download button remains
            }
          }),
        )
        if (!disposed) {
          setPlotPreviewUrls((prev) => {
            Object.values(prev).forEach((u) => URL.revokeObjectURL(u))
            return urls
          })
        } else {
          Object.values(urls).forEach((u) => URL.revokeObjectURL(u))
        }
        if (!disposed) setPlotPreviewLoading(false)
      } else {
        setPlotPreviewUrls((prev) => {
          Object.values(prev).forEach((u) => URL.revokeObjectURL(u))
          return {}
        })
      }
    }

    void loadPreviews()
    return () => {
      disposed = true
    }
  }, [predictResult, getArtifactBlob])

  const stepHeading = (s: WizardStep) => {
    switch (s) {
      case 0:
        return 'Region & assays'
      case 1:
        return 'Your alignment (optional)'
      case 2:
        return 'Review & run'
      case 3:
        return 'Results'
      default:
        return ''
    }
  }

  const canContinueFromStep0 =
    testingMode || (intervalValid && selectedModalities.length > 0 && !modalitiesLoading && modalitiesList.length > 0)

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, pr: 6 }}>
        <ModelTrainingOutlinedIcon color="primary" sx={{ fontSize: 30, mt: 0.25 }} />
        <Box>
          <Typography component="span" variant="h6" fontWeight={700}>
            EPCOT Agent
          </Typography>
          <Typography variant="body2" color="text.secondary" display="block" sx={{ mt: 0.5, maxWidth: 520 }}>
            Plan a chromatin-focused analysis on your region of interest. The service uses your choices to generate
            downloadable outputs you can take back to your notebook or pipeline.
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          {showTech ? (
            <Chip
              size="small"
              color="warning"
              label="Testing mode on: API bypassed, mock upload/predict/assets enabled"
            />
          ) : null}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                bgcolor:
                  serverOnline === null ? 'action.disabled' : serverOnline ? 'success.main' : 'error.main',
                flexShrink: 0,
              }}
            />
            <Typography variant="body2" color="text.secondary">
              {serverOnline === null && 'Checking analysis service…'}
              {serverOnline === true && 'Analysis service is available.'}
              {serverOnline === false && 'Analysis service is not responding. You can still prepare your inputs; run when it is back.'}
            </Typography>
          </Box>

          <Typography variant="caption" color="text.secondary" fontWeight={600} letterSpacing={0.04}>
            {step < 3 ? `Step ${step + 1} of 3 · ${stepHeading(step)}` : stepHeading(3)}
          </Typography>

          {userMessage ? <Alert severity="warning">{userMessage}</Alert> : null}
          {showTech && techError ? (
            <Alert severity="info" sx={{ '& .MuiAlert-message': { fontFamily: 'monospace', fontSize: 12 } }}>
              {techError}
            </Alert>
          ) : null}

          {step === 0 ? (
            <Stack spacing={2.5}>
              <Typography variant="body2" color="text.secondary">
                Select the chromosome and genomic interval you want scored, then choose one or more model outputs
                (modalities). The selectable interval is limited to {MAX_WINDOW_BP.toLocaleString()} base pairs per run.
              </Typography>
              <FormControl fullWidth size="small">
                <InputLabel id="epcot-chrom-label">Chromosome</InputLabel>
                <Select
                  labelId="epcot-chrom-label"
                  label="Chromosome"
                  value={chrom}
                  onChange={(e) => setChrom(String(e.target.value))}
                >
                  {CHROM_OPTIONS.map((c) => (
                    <MenuItem key={c} value={c}>
                      {c}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {rangeError ? <Alert severity="error">{rangeError}</Alert> : null}
              {rangeBounds ? (
                <Typography variant="body2" color="text.secondary">
                  Usable coordinates on chromosome {chrom}: {rangeBounds.min_start.toLocaleString()} –{' '}
                  {rangeBounds.max_end.toLocaleString()} bp.
                </Typography>
              ) : !rangeError ? (
                <LinearProgress />
              ) : null}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Start position (bp)"
                  value={startStr}
                  onChange={(e) => setStartStr(e.target.value)}
                  fullWidth
                  size="small"
                />
                <TextField
                  label="End position (bp)"
                  value={endStr}
                  onChange={(e) => setEndStr(e.target.value)}
                  fullWidth
                  size="small"
                />
              </Stack>
              {!intervalValid && rangeBounds ? (
                <Typography variant="caption" color="error">
                  Adjust coordinates so the end is after the start, both lie in the allowed range, and the span is at
                  most {MAX_WINDOW_BP.toLocaleString()} bp.
                </Typography>
              ) : null}
              {clampedInterval && intervalValid ? (
                <Typography variant="caption" color="text.secondary">
                  Selected interval: chr{chrom}:{clampedInterval.start.toLocaleString()}–
                  {clampedInterval.end.toLocaleString()} (
                  {(clampedInterval.end - clampedInterval.start).toLocaleString()} bp)
                </Typography>
              ) : null}

              <Divider />
              <Typography variant="subtitle2" fontWeight={600}>
                Model outputs
              </Typography>
              {modalitiesLoading ? <LinearProgress /> : null}
              <FormGroup>
                {modalitiesList.map((m) => (
                  <FormControlLabel
                    key={m}
                    control={
                      <Checkbox
                        checked={!!modalitiesPick[m]}
                        onChange={(e) => setModalitiesPick((p) => ({ ...p, [m]: e.target.checked }))}
                      />
                    }
                    label={m}
                  />
                ))}
              </FormGroup>
              {modalitiesList.length === 0 && !modalitiesLoading ? (
                <Alert severity="warning">No outputs are available from the service right now.</Alert>
              ) : null}
            </Stack>
          ) : null}

          {step === 1 ? (
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                If you have an alignment file from your experiment (<strong>.bam</strong>), you can attach it so the
                model can use <em>your</em> chromatin accessibility signal. Processing large files can take several
                minutes. If you skip this step, the workflow uses a built-in reference profile instead.
              </Typography>
              <Button variant="outlined" component="label" disabled={uploading}>
                Choose file…
                <input
                  type="file"
                  accept=".bam"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    setBamFile(f ?? null)
                    setUploadId(null)
                    if (f) setUseReferenceAtac(false)
                  }}
                />
              </Button>
              {bamFile ? (
                <Typography variant="body2">
                  Selected: {bamFile.name} ({(bamFile.size / (1024 * 1024)).toFixed(1)} MiB)
                </Typography>
              ) : null}
              <Button variant="contained" onClick={() => void handleUploadBam()} disabled={!bamFile || uploading}>
                {uploading ? 'Processing file…' : 'Attach and process'}
              </Button>
              {uploading ? <LinearProgress /> : null}
              <FormControlLabel
                control={
                  <Checkbox
                    checked={useReferenceAtac}
                    onChange={(e) => setUseReferenceAtac(e.target.checked)}
                    disabled={Boolean(uploadId)}
                  />
                }
                label="Skip file upload and use the built-in reference profile for this run"
              />
              {!uploadId && !uploading ? (
                <Typography variant="caption" color="text.secondary">
                  Choose one path to continue: upload your BAM, or check the option to use the built-in reference.
                </Typography>
              ) : null}
              {showTech && uploadId ? (
                <Typography variant="caption" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  upload_id: {uploadId}
                </Typography>
              ) : null}
            </Stack>
          ) : null}

          {step === 2 ? (
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                You are about to run the model on the interval below with the selected outputs
                {uploadId ? ', using your attached alignment.' : ', using the built-in reference profile.'}
              </Typography>
              <Box sx={{ bgcolor: 'action.hover', borderRadius: 1, p: 2 }}>
                <Typography variant="body2">
                  <strong>Chromosome</strong> {chrom}
                  <br />
                  <strong>Interval</strong>{' '}
                  {clampedInterval
                    ? `${clampedInterval.start.toLocaleString()} – ${clampedInterval.end.toLocaleString()} bp`
                    : '—'}
                  <br />
                  <strong>Outputs</strong> {selectedModalities.join(', ') || '—'}
                </Typography>
              </Box>
              <Stack spacing={0.8}>
                <Typography variant="subtitle2">Generate plot figures?</Typography>
                <Select
                  size="small"
                  value={plot ? 'yes' : 'no'}
                  onChange={(e) => setPlot(e.target.value === 'yes')}
                  sx={{ maxWidth: 260 }}
                >
                  <MenuItem value="yes">Yes, include figures</MenuItem>
                  <MenuItem value="no">No, tables only</MenuItem>
                </Select>
              </Stack>
              <Button
                variant="contained"
                color="primary"
                size="large"
                disabled={!clampedInterval || selectedModalities.length === 0 || predicting}
                onClick={() => void handlePredict()}
              >
                {predicting ? 'Running analysis…' : 'Run analysis'}
              </Button>
              {predicting ? <LinearProgress /> : null}
            </Stack>
          ) : null}

          {step === 3 && predictResult ? (
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                Below are the outputs from your run. Save each item you need for downstream work.
              </Typography>
              <Divider />
              {predictResult.results.map((row: PredictResultRow) => (
                <Stack key={row.modality} direction="row" alignItems="center" spacing={2} flexWrap="wrap" useFlexGap>
                  <Typography sx={{ minWidth: 100 }} fontWeight={600}>
                    {row.modality}
                  </Typography>
                  {row.ok ? (
                    <>
                      <Typography variant="body2" color="success.main">
                        Completed
                      </Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => void downloadArtifact(row.artifact_id, `epcot_${row.modality}_results.json`)}
                      >
                        Save results table
                      </Button>
                    </>
                  ) : (
                    <Typography variant="body2" color="error">
                      Not available for this selection{showTech && row.error ? `: ${row.error}` : '.'}
                    </Typography>
                  )}
                </Stack>
              ))}
              <Divider />
              {predictResult.pickle_artifact_id ? (
                <Button
                  variant="outlined"
                  onClick={() =>
                    void downloadArtifact(predictResult.pickle_artifact_id!, 'epcot_combined_output.pkl')
                  }
                >
                  Save combined model output
                </Button>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  No combined model file was returned for this run.
                </Typography>
              )}
              {predictResult.plots && Object.keys(predictResult.plots).length > 0 ? (
                <Stack spacing={1}>
                  <Typography fontWeight={600}>Figures</Typography>
                  {plotPreviewLoading ? <LinearProgress /> : null}
                  {Object.keys(plotPreviewUrls).length > 0 ? (
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} useFlexGap sx={{ flexWrap: 'wrap' }}>
                      {Object.entries(plotPreviewUrls).map(([k, src]) => (
                        <Box
                          key={`${k}-preview`}
                          sx={{
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1.5,
                            overflow: 'hidden',
                            bgcolor: 'background.paper',
                            width: { xs: '100%', md: 280 },
                          }}
                        >
                          <Box
                            component="img"
                            src={src}
                            alt={plotLabel(k)}
                            sx={{ width: '100%', height: 'auto', display: 'block' }}
                          />
                          <Typography variant="caption" sx={{ display: 'block', p: 1 }}>
                            {plotLabel(k)}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  ) : null}
                  {Object.entries(predictResult.plots).map(([k, id]) =>
                    id ? (
                      <Button
                        key={k}
                        size="small"
                        variant="outlined"
                        onClick={() => void downloadArtifact(id, `epcot_${k}.png`)}
                      >
                        Save {plotLabel(k)}
                      </Button>
                    ) : null,
                  )}
                </Stack>
              ) : null}

              {(rnaPreviewLoading || rnaPreview) && (
                <Stack spacing={1}>
                  <Typography fontWeight={600}>RNA JSON preview</Typography>
                  {rnaPreviewLoading ? <LinearProgress /> : null}
                  {rnaPreview ? (
                    <Box
                      component="pre"
                      sx={{
                        m: 0,
                        p: 1.5,
                        borderRadius: 1.5,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'grey.50',
                        fontSize: 11,
                        maxHeight: 240,
                        overflow: 'auto',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      {rnaPreview}
                    </Box>
                  ) : null}
                </Stack>
              )}
            </Stack>
          ) : null}

          {showTech ? (
            <Box
              sx={{
                mt: 1,
                p: 1.5,
                borderRadius: 1,
                bgcolor: 'grey.100',
                fontFamily: 'ui-monospace, monospace',
                fontSize: 11,
                wordBreak: 'break-all',
              }}
            >
              <strong>Debug</strong> · API {apiBase}
              {uploadId ? ` · upload attached` : ''}
            </Box>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, flexWrap: 'wrap', gap: 1 }}>
        <Button onClick={onClose}>Close</Button>
        {step === 3 ? (
          <Button
            variant="contained"
            onClick={() => {
              setPredictResult(null)
              setStep(0)
              setUserMessage(null)
              setTechError(null)
              void checkServer()
              void loadModalities()
            }}
          >
            New analysis
          </Button>
        ) : null}
        {step > 0 && step < 3 ? (
          <Button onClick={() => setStep((s) => (s > 0 ? ((s - 1) as WizardStep) : s))}>Back</Button>
        ) : null}
        {step === 0 ? (
          <Button variant="contained" onClick={() => setStep(1)} disabled={!canContinueFromStep0}>
            Continue
          </Button>
        ) : null}
        {step === 1 ? (
          <Button variant="contained" onClick={() => setStep(2)} disabled={!uploadId && !useReferenceAtac}>
            Continue
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  )
}
