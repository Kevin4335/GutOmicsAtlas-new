import type { CSSProperties } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import NavBar from '../components/NavBar'
import Footer from '../components/Footer'
import { LightboxZoomImage } from '../components/LightboxZoomImage'
import { LoadingBar } from '../components/LoadingBar'
import { SCRNA_GENES } from '../data/scrnaGenes'

type CellType = 'epithelial' | 'enteroendocrine'
type Stage = 'fetal' | 'adult'
type ScrnaTab = 'overview' | 'result' | 'region' | 'goblet'

type QueryStatus = 'idle' | 'loading' | 'success' | 'queued' | 'error'

const OVERVIEW_BY_CELL_AND_STAGE: Record<
  CellType,
  Record<Stage, { umapSrc: string; dotSrc: string }>
> = {
  epithelial: {
    adult: {
      umapSrc: '/imgs/scRNAumapAdultEpithelial.png',
      dotSrc: '/imgs/scRNAdotplotAdultEpithelial.png',
    },
    fetal: {
      umapSrc: '/imgs/scRNAumapFetalEpithelial.png',
      dotSrc: '/imgs/scRNAdotplotFetalEpithelial.png',
    },
  },
  enteroendocrine: {
    adult: {
      umapSrc: '/imgs/scRNAumapAdultEEC.png',
      dotSrc: '/imgs/scRNAdotplotAdultEEC.png',
    },
    fetal: {
      umapSrc: '/imgs/scRNAumapFetalEEC.png',
      dotSrc: '/imgs/scRNAdotplotFetalEEC.png',
    },
  },
}

const REGION_BY_STAGE: Record<Stage, { smallSrc: string; largeSrc: string; degHref: string }> = {
  adult: {
    smallSrc: '/imgs/scrna_adult_epithelial_regioncomp_SmallintestinalIMAplot.png',
    largeSrc: '/imgs/scrna_adult_epithelial_regioncomp_LargeintestinalIMAplot.png',
    degHref: '/imgs/scrna_adult_epithelial_regioncomp.csv',
  },
  fetal: {
    smallSrc: '/imgs/scrna_fetal_epithelial_regioncomp_SmallintestinalIMAplot.png',
    largeSrc: '/imgs/scrna_fetal_epithelial_regioncomp_LargeintestinalIMAplot.png',
    degHref: '/imgs/scrna_fetal_epithelial_regioncomp.csv',
  },
}

const GOBLET_BY_STAGE: Record<Stage, { maSrc: string; violinSrc: string; degHref: string }> = {
  adult: {
    maSrc: '/imgs/scrna_adult_epithelial_GobletcellsIMAplot.png',
    violinSrc: '/imgs/GobletcellsvsepithelialviolinplotAdult.png',
    degHref: '/imgs/goblet_no_embed.xls',
  },
  fetal: {
    maSrc: '/imgs/scrna_fetal_epithelial_GobletcellsIMAplot.png',
    violinSrc: '/imgs/GobletcellsvsepithelialviolinplotFetal.png',
    degHref: '/imgs/goblet_no_embed.xls',
  },
}

const SCRNA_STYLE_TAG = `
@keyframes gutFadeUp {
  0% { opacity: 0; transform: translateY(18px); }
  100% { opacity: 1; transform: translateY(0); }
}
.pvs-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 28px;
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px clamp(16px, 4vw, 56px) 72px;
  width: 80%;
  align-items: start;
}
.pvs-left { position: static; }
.pvs-right { min-width: 0; }
@media (min-width: 900px) {
  .pvs-layout { grid-template-columns: 240px 1fr; gap: 48px; padding-top: 40px; }
  .pvs-left { position: sticky; top: 80px; }
}
.scrna-dropdown-wrap { position: relative; }
.scrna-gene-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.1);
  z-index: 50;
  max-height: 220px;
  overflow-y: auto;
  display: none;
}
.scrna-gene-dropdown.open { display: block; }
.scrna-dropdown-item {
  padding: 8px 14px;
  font-size: 0.82rem;
  font-family: 'JetBrains Mono', monospace;
  color: var(--text);
  cursor: pointer;
  transition: background 0.1s;
}
.scrna-dropdown-item:hover { background: var(--accent-light); color: var(--accent); }
`

function chartTitle(mod: string, cellType: CellType, stage: Stage, section: string, chart: string) {
  const ct = cellType === 'epithelial' ? 'Epithelial' : 'Enteroendocrine'
  const st = stage === 'fetal' ? 'Fetal' : 'Adult'
  return `${mod} · ${ct} · ${st} · ${section} · ${chart}`
}

const shell: CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  background: 'var(--bg)',
}

const tabsBar: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  borderBottom: '2px solid var(--border)',
  marginBottom: 24,
  width: '100%',
  overflowX: 'hidden',
  alignItems: 'stretch',
}

function tabLink(active: boolean, disabled = false): CSSProperties {
  return {
    minWidth: 0,
    width: '100%',
    padding: '10px 12px',
    fontSize: '0.82rem',
    fontWeight: active ? 600 : 500,
    color: disabled ? 'var(--light)' : active ? 'var(--accent)' : 'var(--muted)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    border: 'none',
    borderBottom: 'none',
    background: 'none',
    fontFamily: "'Montserrat', sans-serif",
    transition: 'color .15s, border-color .15s',
    whiteSpace: 'normal',
    overflowWrap: 'anywhere',
    wordBreak: 'break-word',
    lineHeight: 1.2,
    textAlign: 'center',
    opacity: disabled ? 0.7 : 1,
    boxShadow: active ? 'inset 0 -2px 0 var(--accent)' : 'inset 0 -2px 0 transparent',
  }
}

const pillGroup: CSSProperties = {
  display: 'flex',
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  overflow: 'hidden',
}

function pill(active: boolean): CSSProperties {
  return {
    padding: '7px 16px',
    fontSize: '0.78rem',
    fontWeight: active ? 600 : 500,
    color: active ? 'white' : 'var(--muted)',
    cursor: 'pointer',
    border: 'none',
    borderRight: '1px solid var(--border)',
    background: active ? 'var(--accent)' : 'transparent',
    fontFamily: "'Montserrat', sans-serif",
    transition: 'all 0.15s',
    whiteSpace: 'nowrap',
  }
}

const modeRow: CSSProperties = {
  display: 'flex',
  gap: 12,
  alignItems: 'center',
  marginBottom: 20,
  flexWrap: 'wrap',
}

const card: CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  overflow: 'hidden',
  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
}

const cardHeader: CSSProperties = {
  padding: '16px 18px',
  borderBottom: '1px solid var(--border)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
}

const cardTitle: CSSProperties = {
  fontSize: '0.8rem',
  fontWeight: 600,
  color: 'var(--navy)',
  letterSpacing: '0.1px',
  overflowWrap: 'anywhere',
  wordBreak: 'break-word',
}

const cardBody: CSSProperties = { padding: 16 }

/** Min height for result chart area (idle, loading overlay, and snATAC-style layout). */
const RESULT_CHART_MIN_H = 320

const placeholder: CSSProperties = {
  width: '100%',
  height: RESULT_CHART_MIN_H,
  background: '#f3f4f6',
  borderRadius: 8,
  border: 'none',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
}

const phText: CSSProperties = {
  fontSize: '.74rem',
  color: '#9ca3af',
  fontFamily: "'JetBrains Mono', monospace",
  textAlign: 'center',
  padding: '0 16px',
}

const twoCol: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: 16,
  marginBottom: 24,
}

const staticImg: CSSProperties = {
  width: '100%',
  display: 'block',
  borderRadius: 8,
  border: '1px solid var(--border)',
}

const btnPrimary: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  background: 'var(--accent)',
  color: 'white',
  fontWeight: 600,
  fontSize: '0.875rem',
  padding: '9px 18px',
  borderRadius: 7,
  textDecoration: 'none',
  transition: 'all 0.2s',
  letterSpacing: '0.1px',
  border: 'none',
  cursor: 'pointer',
  fontFamily: "'Montserrat', sans-serif",
}

const fieldLabel: CSSProperties = {
  fontSize: '.68rem',
  fontWeight: 600,
  color: 'var(--light)',
  letterSpacing: '.6px',
  textTransform: 'uppercase',
}

const input: CSSProperties = {
  border: '1px solid var(--border2)',
  borderRadius: 6,
  padding: '9px 12px',
  fontSize: '.82rem',
  fontFamily: "'Montserrat', sans-serif",
  color: 'var(--text)',
  background: 'var(--bg)',
  outline: 'none',
  width: '100%',
  transition: 'border-color .15s',
}

const subtle: CSSProperties = { color: 'var(--muted)', fontSize: '0.82rem', lineHeight: 1.65 }

const SCRNA_PATH: Record<CellType, string> = {
  enteroendocrine: '/api/scrna-eec',
  epithelial: '/api/scrna-epithelial',
}

function getScRnaImageUrl(opts: { gene: string; sampleType: Stage; cellType: CellType }): string {
  const path = SCRNA_PATH[opts.cellType]
  const encodedGene = encodeURIComponent(opts.gene)
  const encodedStage = encodeURIComponent(opts.sampleType)
  return `${path}/genes/${encodedGene}?sample_type=${encodedStage}`
}

function isValidEmail(email: string): boolean {
  return /^[a-zA-Z0-9_.+-]+@([a-zA-Z0-9-]+\.)+[a-zA-Z]+$/.test(email)
}

export default function Scrna() {
  const { hash } = useLocation()

  const [cellType, setCellType] = useState<CellType>('epithelial')
  const [stage, setStage] = useState<Stage>('fetal')
  const [tab, setTab] = useState<ScrnaTab>('overview')

  const [gene, setGene] = useState('')
  const [email, setEmail] = useState('')
  const [geneDropdownOpen, setGeneDropdownOpen] = useState(false)
  const [queryStatus, setQueryStatus] = useState<QueryStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [imgDataUrl, setImgDataUrl] = useState<string | null>(null)
  const [queuedMsg, setQueuedMsg] = useState<string | null>(null)


  const geneUpperToCanonical = useMemo(() => {
    const m = new Map<string, string>()
    for (const g of SCRNA_GENES) m.set(g.toUpperCase(), g)
    return m
  }, [])

  const filteredGenes = useMemo(() => {
    const q = gene.trim().toLowerCase()
    if (!q) return SCRNA_GENES.slice(0, 16)
    const out: string[] = []
    for (const g of SCRNA_GENES) {
      if (g.toLowerCase().includes(q)) {
        out.push(g)
        if (out.length >= 16) break
      }
    }
    return out
  }, [gene])

  const canShowStaticTabs = cellType === 'epithelial'

  useEffect(() => {
    if (!canShowStaticTabs && (tab === 'region' || tab === 'goblet')) setTab('overview')
  }, [canShowStaticTabs, tab])

  // If user navigates to /scrna#snatac from dropdown, keep them on scrna for now
  useEffect(() => {
    if (hash === '#snatac') {
      setTab('overview')
    }
  }, [hash])

  const umapTitle = useMemo(
    () => chartTitle('scRNA', cellType, stage, 'Overview', 'UMAP'),
    [cellType, stage],
  )
  const dotTitle = useMemo(
    () => chartTitle('scRNA', cellType, stage, 'Overview', 'Dot Plot'),
    [cellType, stage],
  )
  const resultTitle = useMemo(
    () => chartTitle('scRNA', cellType, stage, 'Result Chart', 'Coverage Plot'),
    [cellType, stage],
  )
  const overviewDefaults = useMemo(() => OVERVIEW_BY_CELL_AND_STAGE[cellType][stage], [cellType, stage])
  const regionDefaults = useMemo(() => REGION_BY_STAGE[stage], [stage])
  const gobletDefaults = useMemo(() => GOBLET_BY_STAGE[stage], [stage])

  useEffect(() => {
    setImgDataUrl(null)
    setError(null)
    setQueryStatus('idle')
    setQueuedMsg(null)
  }, [cellType, stage])

  function submitGeneQuery() {
    const gRaw = gene.trim()
    setError(null)
    setQueuedMsg(null)
    setImgDataUrl(null)

    if (!gRaw) {
      setError('Gene cannot be empty!')
      return
    }

    const canonical = geneUpperToCanonical.get(gRaw.toUpperCase())
    if (!canonical) {
      setError(`Gene not found: ${gRaw}`)
      return
    }

    const em = email.trim()
    if (em && !isValidEmail(em)) {
      setError('If you enter an email, it must be valid.')
      return
    }

    setQueryStatus('loading')
    const url = `${getScRnaImageUrl({
      gene: canonical,
      sampleType: stage,
      cellType,
    })}&_=${Date.now()}`
    setImgDataUrl(url)

    if (em && isValidEmail(em)) {
      const plotUrl = url.replace(/&_=\d+$/, '')
      const context =
        cellType === 'epithelial' ? 'scrna_epithelial' : 'scrna_eec'
      void fetch('/api/email-plot-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context,
          email: em,
          gene: canonical,
          sample_type: stage,
          plot_url: plotUrl,
        }),
      }).catch(() => {})
    }
  }

  return (
    <div style={shell}>
      <style>{SCRNA_STYLE_TAG}</style>
      <style>{`@media (min-width: 900px){ .two-col-grid { grid-template-columns: 1fr 1fr; } }`}</style>
      <NavBar />

      <div className="pvs-layout">
        <div className="pvs-left">
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: '0.75rem',
              fontWeight: 600,
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
              color: 'var(--accent)',
              marginBottom: 16,
              animation: 'gutFadeUp 0.4s ease both',
            }}
          >
            <span style={{ width: 24, height: 2, background: 'var(--accent)', borderRadius: 2 }} />
            Single-Cell Omics
          </div>
          <div
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: '1.5rem',
              fontWeight: 700,
              color: 'var(--navy)',
              lineHeight: 1.3,
              marginBottom: 14,
              animation: 'gutFadeUp 0.4s 0.05s ease both',
            }}
          >
            Single-Cell Browser
          </div>
          <p style={{ ...subtle, animation: 'gutFadeUp 0.4s 0.10s ease both' }}>
            Explore gene expression (scRNA-seq) across gut cell types. Use the toggles to switch cell type and stage,
            then explore overview plots, query a gene, or view static comparisons.
          </p>
          {hash === '#snatac' ? (
            <p style={{ ...subtle, marginTop: 14 }}>
              You navigated to <code>snATAC</code> via the dropdown. That view will be added next; you’re currently
              viewing <strong>scRNA</strong>.
            </p>
          ) : null}
        </div>

        <div className="pvs-right">
          {/* Two togglers */}
          <div style={modeRow}>
            <div style={pillGroup} aria-label="Cell type">
              <button
                type="button"
                style={{ ...pill(cellType === 'epithelial'), borderRight: '1px solid var(--border)' }}
                onClick={() => setCellType('epithelial')}
              >
                Epithelial
              </button>
              <button type="button" style={{ ...pill(cellType === 'enteroendocrine'), borderRight: 'none' }} onClick={() => setCellType('enteroendocrine')}>
                Enteroendocrine
              </button>
            </div>

            <div style={pillGroup} aria-label="Stage">
              <button
                type="button"
                style={{ ...pill(stage === 'fetal'), borderRight: '1px solid var(--border)' }}
                onClick={() => setStage('fetal')}
              >
                Fetal
              </button>
              <button type="button" style={{ ...pill(stage === 'adult'), borderRight: 'none' }} onClick={() => setStage('adult')}>
                Adult
              </button>
            </div>
          </div>

          {/* Subtabs (all 4 in this file) */}
          <div style={tabsBar} role="tablist" aria-label="scRNA tabs">
            <button type="button" role="tab" aria-selected={tab === 'overview'} style={tabLink(tab === 'overview')} onClick={() => setTab('overview')}>
              Overview
            </button>
            <button type="button" role="tab" aria-selected={tab === 'result'} style={tabLink(tab === 'result')} onClick={() => setTab('result')}>
              Result Chart
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'region'}
              aria-disabled={!canShowStaticTabs}
              disabled={!canShowStaticTabs}
              style={tabLink(tab === 'region', !canShowStaticTabs)}
              onClick={() => setTab('region')}
              title={canShowStaticTabs ? undefined : 'Region Comparison is available for epithelial mode only'}
            >
              Region Comparison
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'goblet'}
              aria-disabled={!canShowStaticTabs}
              disabled={!canShowStaticTabs}
              style={tabLink(tab === 'goblet', !canShowStaticTabs)}
              onClick={() => setTab('goblet')}
              title={canShowStaticTabs ? undefined : 'Goblet Cells is available for epithelial mode only'}
            >
              Goblet Cells
            </button>
          </div>

          {/* Overview */}
          {tab === 'overview' ? (
            <div>
              <div className="two-col-grid" style={twoCol}>
                <div style={card}>
                  <div style={cardHeader}>
                    <div style={cardTitle}>{umapTitle}</div>
                  </div>
                  <div style={cardBody}>
                    <LightboxZoomImage alt={umapTitle} src={overviewDefaults.umapSrc} style={staticImg} />
                  </div>
                </div>
                <div style={card}>
                  <div style={cardHeader}>
                    <div style={cardTitle}>{dotTitle}</div>
                  </div>
                  <div style={cardBody}>
                    <LightboxZoomImage alt={dotTitle} src={overviewDefaults.dotSrc} style={staticImg} />
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* Result Chart (only backend call) */}
          {tab === 'result' ? (
            <div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 24, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minWidth: 220 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={fieldLabel}>Gene Name</span>
                    <div className="scrna-dropdown-wrap">
                      <input
                        value={gene}
                        onChange={(e) => {
                          setGene(e.target.value)
                          setGeneDropdownOpen(true)
                          setError(null)
                        }}
                        style={input}
                        placeholder="Search… e.g. LGR5, EPCAM, MUC2"
                        autoComplete="off"
                        onFocus={(e) => {
                          setGeneDropdownOpen(true)
                          e.currentTarget.style.borderColor = 'var(--accent)'
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = 'var(--border2)'
                          window.setTimeout(() => setGeneDropdownOpen(false), 200)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') submitGeneQuery()
                        }}
                      />
                      <div
                        className={`scrna-gene-dropdown${
                          geneDropdownOpen && gene.trim() && filteredGenes.length ? ' open' : ''
                        }`}
                      >
                        {filteredGenes.map((g) => (
                          <div
                            key={g}
                            role="option"
                            className="scrna-dropdown-item"
                            onMouseDown={(e) => {
                              e.preventDefault()
                              setGene(g)
                              setGeneDropdownOpen(false)
                              setError(null)
                            }}
                          >
                            {g}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={fieldLabel}>Email (optional)</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={input}
                      placeholder="your@email.edu"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') submitGeneQuery()
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border2)')}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  style={btnPrimary}
                  onClick={submitGeneQuery}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#c41f2d'
                    e.currentTarget.style.boxShadow = '0 4px 14px rgba(222,51,65,0.3)'
                    e.currentTarget.style.transform = 'translateY(-1px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--accent)'
                    e.currentTarget.style.boxShadow = 'none'
                    e.currentTarget.style.transform = 'none'
                  }}
                >
                  <svg width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                  Search
                </button>
              </div>

              {error ? (
                <div style={{ marginBottom: 16, color: 'var(--red)', fontSize: '0.82rem', fontWeight: 500 }}>
                  {error}
                </div>
              ) : null}
              {queuedMsg ? <div style={{ marginBottom: 16, ...subtle }}>{queuedMsg}</div> : null}

              <div style={card}>
                <div style={cardHeader}>
                  <div style={cardTitle}>{resultTitle}</div>
                  {queryStatus === 'loading' ? (
                    <span style={{ fontSize: '0.72rem', color: 'var(--muted)', fontFamily: "'JetBrains Mono', monospace" }}>
                      Loading…
                    </span>
                  ) : null}
                </div>
                <div style={cardBody}>
                  {imgDataUrl ? (
                    <div style={{ position: 'relative', minHeight: RESULT_CHART_MIN_H, borderRadius: 8 }}>
                      {queryStatus === 'loading' ? (
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 12,
                            background: '#f3f4f6',
                            borderRadius: 8,
                            zIndex: 1,
                            pointerEvents: 'none',
                          }}
                          aria-busy
                          aria-label="Generating plot"
                        >
                          <LoadingBar />
                          <div style={{ ...phText, padding: 0 }}>Generating plot…</div>
                        </div>
                      ) : null}
                      <LightboxZoomImage
                        key={imgDataUrl}
                        alt={resultTitle}
                        src={imgDataUrl}
                        style={{
                          width: '100%',
                          display: 'block',
                          borderRadius: 8,
                          border: '1px solid var(--border)',
                          minHeight: queryStatus === 'loading' ? RESULT_CHART_MIN_H : undefined,
                          opacity: queryStatus === 'loading' ? 0 : 1,
                        }}
                        onLoad={() => setQueryStatus('success')}
                        onError={() => {
                          setQueryStatus('error')
                          setError('This figure could not be loaded. Please try again.')
                          setImgDataUrl(null)
                        }}
                      />
                    </div>
                  ) : (
                    <div style={placeholder}>
                      <div style={phText}>
                        {queryStatus === 'idle' ? 'Search a gene above to view its coverage plot' : 'Coverage plot result'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {/* Region Comparison (static) */}
          {tab === 'region' ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <a
                  href={regionDefaults.degHref}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 14px',
                    border: '1px solid var(--border2)',
                    borderRadius: 6,
                    background: 'var(--surface)',
                    color: 'var(--muted)',
                    fontSize: '.78rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontFamily: "'Montserrat', sans-serif",
                    textDecoration: 'none',
                  }}
                >
                  Download DEG list
                </a>
              </div>
              <div className="two-col-grid" style={twoCol}>
                <div style={card}>
                  <div style={cardHeader}>
                    <div style={cardTitle}>{chartTitle('scRNA', cellType, stage, 'Region Comparison', 'Small Intestine')}</div>
                  </div>
                  <div style={cardBody}>
                    <LightboxZoomImage
                      alt={chartTitle('scRNA', cellType, stage, 'Region Comparison', 'Small Intestine')}
                      src={regionDefaults.smallSrc}
                      style={staticImg}
                    />
                  </div>
                </div>
                <div style={card}>
                  <div style={cardHeader}>
                    <div style={cardTitle}>{chartTitle('scRNA', cellType, stage, 'Region Comparison', 'Large Intestine')}</div>
                  </div>
                  <div style={cardBody}>
                    <LightboxZoomImage
                      alt={chartTitle('scRNA', cellType, stage, 'Region Comparison', 'Large Intestine')}
                      src={regionDefaults.largeSrc}
                      style={staticImg}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* Goblet Cells (static) */}
          {tab === 'goblet' ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <a
                  href={gobletDefaults.degHref}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 14px',
                    border: '1px solid var(--border2)',
                    borderRadius: 6,
                    background: 'var(--surface)',
                    color: 'var(--muted)',
                    fontSize: '.78rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontFamily: "'Montserrat', sans-serif",
                    textDecoration: 'none',
                  }}
                >
                  Download DEG list
                </a>
              </div>
              <div className="two-col-grid" style={twoCol}>
                <div style={card}>
                  <div style={cardHeader}>
                    <div style={cardTitle}>{chartTitle('scRNA', cellType, stage, 'Goblet Cells', 'MA Plot')}</div>
                  </div>
                  <div style={cardBody}>
                    <LightboxZoomImage
                      alt={chartTitle('scRNA', cellType, stage, 'Goblet Cells', 'MA Plot')}
                      src={gobletDefaults.maSrc}
                      style={staticImg}
                    />
                  </div>
                </div>
                <div style={card}>
                  <div style={cardHeader}>
                    <div style={cardTitle}>{chartTitle('scRNA', cellType, stage, 'Goblet Cells', 'Violin Plot')}</div>
                  </div>
                  <div style={cardBody}>
                    <LightboxZoomImage
                      alt={chartTitle('scRNA', cellType, stage, 'Goblet Cells', 'Violin Plot')}
                      src={gobletDefaults.violinSrc}
                      style={staticImg}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <Footer />
    </div>
  )
}

