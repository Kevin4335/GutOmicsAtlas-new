import type { CSSProperties } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import NavBar from '../components/NavBar'
import Footer from '../components/Footer'
import { LightboxZoomImage } from '../components/LightboxZoomImage'
import { ST_ALL_GENES } from '../data/stGenes'

type StTab = 'overview' | 'spatial-area' | 'gene-expr'

/** Same origin `/st/{gene}.png` or `VITE_SPATIAL_ST_DATA_BASE` / `VITE_SPATIAL_SM_DATA_BASE`. */
function stDataRoot(): string {
  const st = (import.meta.env.VITE_SPATIAL_ST_DATA_BASE as string | undefined)?.replace(/\/$/, '')
  if (st) return st
  return (import.meta.env.VITE_SPATIAL_SM_DATA_BASE as string | undefined)?.replace(/\/$/, '') ?? ''
}

function stGenePngUrl(gene: string): string {
  const root = stDataRoot()
  const path = `/st/${encodeURIComponent(gene)}.png`
  return root ? `${root}${path}` : path
}

const ST_STYLE_TAG = `
.st-page-layout {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px clamp(16px, 4vw, 56px) 72px;
  width: 80%;
  min-width: 0;
  box-sizing: border-box;
  flex: 1;
}
.st-tx-pvs {
  display: grid;
  grid-template-columns: 1fr;
  gap: 28px;
  align-items: start;
}
@media (min-width: 900px) {
  .st-tx-pvs { grid-template-columns: 240px 1fr; gap: 48px; }
}
.st-tx-pvs-left { position: static; }
@media (min-width: 900px) {
  .st-tx-pvs-left { position: sticky; top: 80px; }
}
.st-page-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 14px;
}
.st-eyebrow-line { width: 24px; height: 2px; background: var(--accent); border-radius: 2px; }
.st-pvs-title {
  font-family: 'Montserrat', sans-serif;
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--navy);
  margin: 0 0 10px;
  line-height: 1.3;
}
.st-pvs-desc { font-size: 0.82rem; color: var(--muted); line-height: 1.65; font-family: 'Montserrat', sans-serif; }
.st-tabs-bar {
  display: flex;
  border-bottom: 2px solid var(--border);
  margin-bottom: 24px;
  flex-wrap: wrap;
}
.st-tab-link {
  padding: 10px 16px;
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--muted);
  cursor: pointer;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  background: none;
  font-family: 'Montserrat', sans-serif;
  transition: color 0.15s, border-color 0.15s;
  white-space: nowrap;
}
.st-tab-link:hover { color: var(--text); }
.st-tab-link.active { color: var(--accent); border-bottom-color: var(--accent); font-weight: 600; }
.st-tab-pane { display: none; }
.st-tab-pane.active { display: block; }
.st-chart-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 16px;
}
.st-chart-card-header {
  padding: 14px 18px 12px;
  border-bottom: 1px solid var(--border);
  background: var(--surface2);
}
.st-chart-title { font-size: 0.88rem; font-weight: 700; color: var(--navy); }
.st-chart-body { padding: 0; }
.st-static-img {
  width: 100%;
  display: block;
  vertical-align: top;
}
.st-overview-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.st-gene-search-row { display: flex; gap: 10px; align-items: flex-end; margin-bottom: 24px; flex-wrap: wrap; }
.st-field-group { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 200px; }
.st-field-label {
  font-size: 0.68rem; font-weight: 600; color: var(--light);
  letter-spacing: 0.6px; text-transform: uppercase;
}
.st-field-input {
  border: 1px solid var(--border2);
  border-radius: 6px;
  padding: 7px 12px;
  font-size: 0.82rem;
  font-family: 'Montserrat', sans-serif;
  color: var(--text);
  background: var(--bg);
  outline: none;
  width: 100%;
}
.st-field-input:focus { border-color: var(--accent); }
.st-dropdown-wrap { position: relative; }
.st-gene-dropdown {
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
.st-gene-dropdown.open { display: block; }
.st-dropdown-item {
  padding: 8px 14px;
  font-size: 0.82rem;
  font-family: 'JetBrains Mono', monospace;
  color: var(--text);
  cursor: pointer;
  transition: background 0.1s;
}
.st-dropdown-item:hover { background: var(--accent-light); color: var(--accent); }
.st-btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: var(--accent);
  color: white;
  font-weight: 600;
  font-size: 0.875rem;
  padding: 9px 18px;
  border-radius: 7px;
  border: none;
  cursor: pointer;
  font-family: 'Montserrat', sans-serif;
}
.st-chart-placeholder {
  background: #f3f4f6;
  border-radius: 8px;
  margin: 12px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 260px;
  color: #9ca3af;
  font-size: 0.78rem;
  text-align: center;
}
.st-gene-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.st-gene-img { width: 100%; display: block; border-radius: 8px; border: 1px solid var(--border); }
`

const shell: CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  background: 'var(--bg)',
}

const OVERVIEW_IMAGES = [
  {
    src: '/imgs/spatial_trans_left_no_embed.png',
    title: 'Spatial TX · Overview',
    alt: 'Spatial transcriptomics overview (1 of 2)',
  },
  {
    src: '/imgs/spatial_trans_right_no_embed.png',
    title: 'Spatial TX · Overview',
    alt: 'Spatial transcriptomics overview (2 of 2)',
  },
] as const

const SPATIAL_AREA_IMAGE = {
  src: '/imgs/spatial_trans_bottom_no_embed.png',
  title: 'Spatial TX · Spatial area',
  alt: 'Spatial transcriptomics tissue layout',
} as const

const GENE_RIGHT_STATIC = '/imgs/spatial_trans_gene_right_no_embed.png'

function StLoadedImg({
  src,
  alt,
  onDone,
}: {
  src: string
  alt: string
  onDone?: () => void
}) {
  const [ok, setOk] = useState(true)
  useEffect(() => {
    setOk(true)
  }, [src])
  if (!ok) {
    return (
      <div className="st-chart-placeholder">
        <span>Could not load image from server.</span>
      </div>
    )
  }
  return (
    <div style={{ padding: 12 }}>
      <LightboxZoomImage
        className="st-gene-img"
        src={src}
        alt={alt}
        onLoad={() => onDone?.()}
        onError={() => {
          setOk(false)
          onDone?.()
        }}
      />
    </div>
  )
}

export default function SpatialTranscriptomics() {
  const [tab, setTab] = useState<StTab>('overview')
  const [geneInput, setGeneInput] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [selectedGene, setSelectedGene] = useState<string | null>(null)
  const [geneError, setGeneError] = useState<string | null>(null)
  const [loadingGene, setLoadingGene] = useState(false)

  useEffect(() => {
    if (selectedGene) setLoadingGene(true)
  }, [selectedGene])

  const filteredGenes = useMemo(() => {
    const q = geneInput.trim().toLowerCase()
    if (!q) return ST_ALL_GENES.slice(0, 16)
    return ST_ALL_GENES.filter((g) => g.toLowerCase().includes(q)).slice(0, 16)
  }, [geneInput])

  const applyGeneSearch = useCallback(() => {
    const val = geneInput.trim().toUpperCase()
    setGeneError(null)
    if (!val) {
      setGeneError('Enter a gene symbol.')
      return
    }
    const match = ST_ALL_GENES.find((g) => g.toUpperCase() === val)
    if (!match) {
      setGeneError('Gene not in this spatial transcriptomics panel list.')
      return
    }
    setSelectedGene(match)
    setGeneInput(match)
    setDropdownOpen(false)
  }, [geneInput])

  const genePngSrc = selectedGene ? stGenePngUrl(selectedGene) : null

  return (
    <div style={shell}>
      <style>{ST_STYLE_TAG}</style>
      <NavBar />

      <div className="st-page-layout">
        <div className="st-tx-pvs">
          <div className="st-tx-pvs-left">
            <div className="st-page-eyebrow">
              <span className="st-eyebrow-line" />
              Spatial Omics
            </div>
            <h2 className="st-pvs-title">Spatial Transcriptomics</h2>
            <p className="st-pvs-desc">
              Spatial gene expression (Visium) across fetal gut small intestine (duodenum and jejunum) and large
              intestinal (colon) tissue sections. Use overview and spatial area for static reference maps; search a gene
              under Gene expression to load feature plots from the server.
            </p>
          </div>
          <div>
            <div className="st-tabs-bar" role="tablist" aria-label="Spatial transcriptomics">
              <button
                type="button"
                role="tab"
                className={`st-tab-link${tab === 'overview' ? ' active' : ''}`}
                onClick={() => setTab('overview')}
              >
                Overview
              </button>
              <button
                type="button"
                role="tab"
                className={`st-tab-link${tab === 'spatial-area' ? ' active' : ''}`}
                onClick={() => setTab('spatial-area')}
              >
                Spatial area
              </button>
              <button
                type="button"
                role="tab"
                className={`st-tab-link${tab === 'gene-expr' ? ' active' : ''}`}
                onClick={() => setTab('gene-expr')}
              >
                Gene expression
              </button>
            </div>

            <div className={`st-tab-pane${tab === 'overview' ? ' active' : ''}`}>
              <div className="st-overview-stack">
                {OVERVIEW_IMAGES.map((item, i) => (
                  <div key={item.src} className="st-chart-card">
                    <div className="st-chart-card-header">
                      <div className="st-chart-title">
                        {item.title} · Figure {i + 1}
                      </div>
                    </div>
                    <div className="st-chart-body">
                      <LightboxZoomImage className="st-static-img" src={item.src} alt={item.alt} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={`st-tab-pane${tab === 'spatial-area' ? ' active' : ''}`}>
              <div className="st-chart-card">
                <div className="st-chart-card-header">
                  <div className="st-chart-title">{SPATIAL_AREA_IMAGE.title}</div>
                </div>
                <div className="st-chart-body">
                  <LightboxZoomImage className="st-static-img" src={SPATIAL_AREA_IMAGE.src} alt={SPATIAL_AREA_IMAGE.alt} />
                </div>
              </div>
            </div>

            <div className={`st-tab-pane${tab === 'gene-expr' ? ' active' : ''}`}>
              <div className="st-gene-search-row">
                <div className="st-field-group st-dropdown-wrap">
                  <span className="st-field-label">Gene name</span>
                  <input
                    className="st-field-input"
                    value={geneInput}
                    placeholder="Search… e.g. LGR5"
                    onChange={(e) => {
                      setGeneInput(e.target.value)
                      setDropdownOpen(true)
                      setGeneError(null)
                    }}
                    onFocus={() => setDropdownOpen(true)}
                    onBlur={() => {
                      window.setTimeout(() => setDropdownOpen(false), 200)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') applyGeneSearch()
                    }}
                  />
                  <div
                    className={`st-gene-dropdown${
                      dropdownOpen && geneInput.trim() && filteredGenes.length ? ' open' : ''
                    }`}
                  >
                    {filteredGenes.map((g) => (
                      <div
                        key={g}
                        role="option"
                        className="st-dropdown-item"
                        onMouseDown={(e) => {
                          e.preventDefault()
                          setGeneInput(g)
                          setSelectedGene(g)
                          setDropdownOpen(false)
                          setGeneError(null)
                        }}
                      >
                        {g}
                      </div>
                    ))}
                  </div>
                </div>
                <button type="button" className="st-btn-primary" onClick={applyGeneSearch}>
                  <svg width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                  Load
                </button>
              </div>

              {geneError ? (
                <div style={{ color: 'var(--red)', fontSize: '0.82rem', marginBottom: 16 }}>{geneError}</div>
              ) : null}

              {!selectedGene ? (
                <div className="st-chart-placeholder" style={{ marginTop: 8 }}>
                  Choose a gene and click Load to fetch spatial feature plots from the server.
                </div>
              ) : (
                <div className="st-gene-stack">
                  <div className="st-chart-card">
                    <div className="st-chart-card-header">
                      <div className="st-chart-title">Spatial TX · Gene expression · {selectedGene} </div>
                      {loadingGene ? (
                        <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Loading…</span>
                      ) : null}
                    </div>
                    <div className="st-chart-body">
                      {genePngSrc ? (
                        <StLoadedImg
                          key={genePngSrc}
                          src={genePngSrc}
                          alt={`Spatial expression · ${selectedGene}`}
                          onDone={() => setLoadingGene(false)}
                        />
                      ) : null}
                    </div>
                  </div>
                  <div className="st-chart-card">
                    <div className="st-chart-card-header">
                      <div className="st-chart-title">Spatial TX · Gene expression · {selectedGene} · Reference</div>
                    </div>
                    <div className="st-chart-body">
                      <LightboxZoomImage className="st-static-img" src={GENE_RIGHT_STATIC} alt="Spatial reference panel" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
