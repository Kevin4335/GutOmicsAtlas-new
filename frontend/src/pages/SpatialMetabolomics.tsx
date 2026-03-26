import type { CSSProperties } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'
import Footer from '../components/Footer'

/** Legacy `frontend-old/js/sm.js` geometry (3000×15600 reference frame). */
const GLB_LEFT_RATIO = 558 / 3000
const GLB_RIGHT_RATIO = 2033 / 3000
const GLB_TOP_RATIO = 298 / 15600
const GLB_BOTTOM_RATIO = 14993 / 15600
const GLB_BLOCK_NUM = 295
const GLB_ZOOM_RATIO = 1.135
const GLB_MAX_ZOOM_LEVEL = 5
const GLB_MIN_ZOOM_LEVEL = -7
/** Session default when no `sm_zoom_level` yet — start at max zoom. */
const DEFAULT_SM_ZOOM_LEVEL = GLB_MAX_ZOOM_LEVEL

const SM_ZOOM_LEVEL_KEY = 'sm_zoom_level'

type MetaboliteRow = { name: string; mz: string; slideIndex: number }

/** Example labels for the first rows (prototype data); rest match legacy anonymous strips. */
const DEMO_METABOLITES: Omit<MetaboliteRow, 'slideIndex'>[] = [
  { name: 'PC 36:4', mz: '782.57' },
  { name: 'PE 36:2', mz: '740.53' },
  { name: 'SM 34:1', mz: '703.57' },
  { name: 'Cholesterol', mz: '369.35' },
  { name: 'LPC 18:2', mz: '520.34' },
  { name: 'TG 54:3', mz: '908.81' },
  { name: 'PC 34:1', mz: '760.59' },
  { name: 'PE 38:4', mz: '766.54' },
  { name: 'DG 36:2', mz: '635.56' },
  { name: 'Ceramide d18:1', mz: '538.52' },
  { name: 'PC 38:4', mz: '808.58' },
  { name: 'LPE 18:1', mz: '480.31' },
  { name: 'PS 36:1', mz: '812.55' },
  { name: 'PI 36:2', mz: '861.55' },
  { name: 'Sphingosine', mz: '300.28' },
  { name: 'LPC 20:4', mz: '544.34' },
  { name: 'TG 52:2', mz: '884.80' },
  { name: 'PC 32:0', mz: '734.56' },
  { name: 'Arachidonic acid', mz: '303.23' },
  { name: 'Oleic acid', mz: '281.25' },
]

function buildMetaboliteRows(): MetaboliteRow[] {
  const rows: MetaboliteRow[] = []
  for (let i = 0; i < GLB_BLOCK_NUM; i++) {
    const slideIndex = i + 1
    if (i < DEMO_METABOLITES.length) {
      rows.push({ ...DEMO_METABOLITES[i], slideIndex })
    } else {
      rows.push({ name: `Spatial region ${slideIndex}`, mz: '—', slideIndex })
    }
  }
  return rows
}

const METABOLITE_ROWS = buildMetaboliteRows()

/** Legacy: `GLB_DATA_SERVER_URL + '/sm/Slide' + index + '.png'`. Optional full origin; otherwise same-origin `/sm/...`. */
function smDataRoot(): string {
  const base = (import.meta.env.VITE_SPATIAL_SM_DATA_BASE as string | undefined)?.replace(/\/$/, '') ?? ''
  return base
}

function slideSpatialUrl(slideIndex: number): string {
  const root = smDataRoot()
  const path = `/sm/Slide${slideIndex}.png`
  return root ? `${root}${path}` : path
}

function zoomRatio(level: number) {
  return Math.pow(GLB_ZOOM_RATIO, level)
}

function readSessionInt(key: string, fallback: number) {
  try {
    const v = sessionStorage.getItem(key)
    if (v == null) return fallback
    const n = Number.parseInt(v, 10)
    return Number.isFinite(n) ? n : fallback
  } catch {
    return fallback
  }
}

const SM_STYLE_TAG = `
.sm-viewer-layout {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px clamp(16px, 4vw, 56px) 72px;
  width: 80%;
  min-width: 0;
  box-sizing: border-box;
}
.sm-tx-pvs {
  display: grid;
  grid-template-columns: 1fr;
  gap: 28px;
  align-items: start;
}
@media (min-width: 900px) {
  .sm-tx-pvs { grid-template-columns: 240px 1fr; gap: 48px; }
}
.sm-tx-pvs-left { position: static; }
@media (min-width: 900px) {
  .sm-tx-pvs-left { position: sticky; top: 80px; }
}
.sm-page-eyebrow {
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
.sm-eyebrow-line { width: 24px; height: 2px; background: var(--accent); border-radius: 2px; }
.sm-pvs-title {
  font-family: 'Montserrat', sans-serif;
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--navy);
  margin: 0 0 10px;
  line-height: 1.3;
}
.sm-pvs-desc { font-size: 0.82rem; color: var(--muted); line-height: 1.65; font-family: 'Montserrat', sans-serif; }
.sm-metabo-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  align-items: start;
}
.sm-metabo-map-col {
  min-width: 0;
  max-width: 100%;
}
@media (min-width: 900px) {
  .sm-metabo-layout { grid-template-columns: 1fr 460px; }
}
.sm-map-chart-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--navy);
  font-family: 'Montserrat', sans-serif;
  margin-bottom: 10px;
}
.sm-zoom-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
  position: sticky;
  top: 72px;
  background: var(--bg);
  padding: 8px 0;
  z-index: 20;
}
.sm-zoom-btn-sq {
  width: 32px; height: 32px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  cursor: pointer;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--muted);
  transition: all 0.15s;
  font-weight: 700;
  line-height: 1;
}
.sm-zoom-btn-sq:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-light); }
.sm-zoom-btn-sq:disabled { opacity: 0.45; cursor: not-allowed; }
.sm-hm-legend-wrap {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
  margin-left: 8px;
  flex-shrink: 0;
}
.sm-hm-legend-title {
  font-size: 0.6rem;
  color: var(--muted);
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.3px;
}
.sm-hm-legend-bar {
  width: 120px;
  height: 10px;
  border-radius: 3px;
  background: linear-gradient(to right, #0000FF, #FFFFFF, #FF0000);
}
.sm-hm-legend-labels {
  display: flex;
  justify-content: space-between;
  width: 120px;
  font-size: 0.58rem;
  color: var(--muted);
  font-family: 'JetBrains Mono', monospace;
}
.sm-map-hint {
  font-size: 0.72rem;
  color: var(--muted);
  margin-left: auto;
  flex: 1 1 120px;
  min-width: 0;
  padding-left: 12px;
}
.sm-map-viewport {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  overflow: hidden;
  -webkit-overflow-scrolling: touch;
}
.sm-scroll-container {
  width: 100%;
  height: clamp(280px, 62vh, 720px);
  overflow: auto;
  scrollbar-width: thin;
  box-sizing: border-box;
}
.sm-scroll-container::-webkit-scrollbar { width: 8px; height: 8px; }
.sm-scroll-container::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 4px; }
.sm-image-container { position: relative; line-height: 0; margin: 0 auto; }
.sm-select-img { width: 100%; display: block; vertical-align: top; }
.sm-strip-hit {
  position: absolute;
  z-index: 100;
  border: none;
  padding: 0;
  margin: 0;
  cursor: pointer;
  background: #000;
  opacity: 0;
  transition: opacity 0.08s;
}
.sm-strip-hit:hover { opacity: 0.15; }
.sm-strip-hit:focus-visible { opacity: 0.2; outline: 2px solid var(--accent); outline-offset: -2px; }
.sm-strip-hit.selected { opacity: 0.22; box-shadow: inset 0 0 0 2px var(--accent); }
.sm-selected-name-rail {
  margin-top: 10px;
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface2);
  -webkit-overflow-scrolling: touch;
}
.sm-selected-name-rail::-webkit-scrollbar { height: 6px; }
.sm-selected-name-rail-inner {
  white-space: nowrap;
  font-size: 0.8rem;
  font-family: 'JetBrains Mono', monospace;
  color: var(--text);
  min-width: min-content;
}
.sm-detail-col { position: static; }
@media (min-width: 900px) {
  .sm-detail-col { position: sticky; top: 80px; align-self: start; }
}
.sm-chart-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
}
.sm-chart-card-header {
  padding: 14px 18px 12px;
  border-bottom: 1px solid var(--border);
  background: var(--surface2);
}
.sm-chart-title { font-size: 0.88rem; font-weight: 700; color: var(--navy); }
.sm-detail-metabolite-name { font-size: 1.05rem; font-weight: 700; color: var(--navy); margin-bottom: 4px; }
.sm-detail-mz { font-size: 0.72rem; color: var(--light); font-family: 'JetBrains Mono', monospace; margin-bottom: 18px; }
.sm-chart-body { padding: 0; min-height: 200px; }
.sm-chart-placeholder {
  background: #f3f4f6;
  border-radius: 8px;
  margin: 12px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 160px;
  color: #9ca3af;
  font-size: 0.78rem;
  text-align: center;
}
.sm-detail-img { width: 100%; display: block; border-radius: 8px; border: 1px solid var(--border); }
.sm-tabs-bar {
  display: flex;
  border-bottom: 2px solid var(--border);
  margin-bottom: 24px;
  flex-wrap: wrap;
}
.sm-tab-link {
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
.sm-tab-link:hover { color: var(--text); }
.sm-tab-link.active { color: var(--accent); border-bottom-color: var(--accent); font-weight: 600; }
.sm-tab-pane { display: none; }
.sm-tab-pane.active { display: block; }
.sm-two-col-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  margin-bottom: 24px;
}
@media (min-width: 900px) {
  .sm-two-col-grid { grid-template-columns: 1fr 1fr; }
}
.sm-gene-search-row { display: flex; gap: 10px; align-items: flex-end; margin-bottom: 24px; flex-wrap: wrap; }
.sm-field-group { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 200px; }
.sm-field-label {
  font-size: 0.68rem; font-weight: 600; color: var(--light);
  letter-spacing: 0.6px; text-transform: uppercase;
}
.sm-field-input {
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
.sm-field-input:focus { border-color: var(--accent); }
.sm-dropdown-wrap { position: relative; }
.sm-gene-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.1);
  z-index: 50;
  max-height: 200px;
  overflow-y: auto;
  display: none;
}
.sm-gene-dropdown.open { display: block; }
.sm-dropdown-item {
  padding: 8px 14px;
  font-size: 0.82rem;
  font-family: 'JetBrains Mono', monospace;
  color: var(--text);
  cursor: pointer;
  transition: background 0.1s;
}
.sm-dropdown-item:hover { background: var(--accent-light); color: var(--accent); }
.sm-btn-primary {
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
`

const shell: CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  background: 'var(--bg)',
}

function SpatialMetaMap({
  selectedIdx,
  onSelectIdx,
}: {
  selectedIdx: number | null
  onSelectIdx: (idx: number) => void
}) {
  const [zoomLevel, setZoomLevel] = useState(() => readSessionInt(SM_ZOOM_LEVEL_KEY, DEFAULT_SM_ZOOM_LEVEL))
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const initializedScrollRef = useRef(false)

  useEffect(() => {
    try {
      sessionStorage.setItem(SM_ZOOM_LEVEL_KEY, String(zoomLevel))
    } catch {
      /* ignore */
    }
  }, [zoomLevel])

  const bumpZoom = (dir: 1 | -1) => {
    setZoomLevel((z) => {
      const nz = z + dir
      if (nz > GLB_MAX_ZOOM_LEVEL || nz < GLB_MIN_ZOOM_LEVEL) return z
      return nz
    })
  }

  /** Scale vs baseline width = 100% of the scroll frame (`1.135^zoomLevel`). Never use `vw` here — it blew out the page layout. */
  const scale = zoomRatio(zoomLevel)
  const imageInnerWidthPct = 100 * scale

  const leftPct = GLB_LEFT_RATIO * 100
  const widthPct = (GLB_RIGHT_RATIO - GLB_LEFT_RATIO) * 100
  const stripHeightPct = ((GLB_BOTTOM_RATIO - GLB_TOP_RATIO) / GLB_BLOCK_NUM) * 100

  // Initial UX: start the map panned ~20% to the right.
  // We only do this once so user zoom/pan behavior isn't overridden.
  useEffect(() => {
    if (initializedScrollRef.current) return
    const el = scrollContainerRef.current
    if (!el) return
    const maxScroll = el.scrollWidth - el.clientWidth
    if (maxScroll > 0) {
      el.scrollLeft = maxScroll * 0.2
    }
    initializedScrollRef.current = true
  }, [zoomLevel])

  return (
    <div>
      <div className="sm-map-chart-title">
        Metabolite map — frame stays fixed; + / − magnify the map inside (scroll to pan)
      </div>
      <div className="sm-zoom-row">
        <button
          type="button"
          className="sm-zoom-btn-sq"
          title="Zoom in"
          disabled={zoomLevel >= GLB_MAX_ZOOM_LEVEL}
          onClick={() => bumpZoom(1)}
        >
          +
        </button>
        <button
          type="button"
          className="sm-zoom-btn-sq"
          title="Zoom out"
          disabled={zoomLevel <= GLB_MIN_ZOOM_LEVEL}
          onClick={() => bumpZoom(-1)}
        >
          −
        </button>
        <div className="sm-hm-legend-wrap" aria-hidden>
          <div className="sm-hm-legend-title">Log₂FC</div>
          <div className="sm-hm-legend-bar" />
          <div className="sm-hm-legend-labels">
            <span>−5</span>
            <span>0</span>
            <span>+5</span>
          </div>
        </div>
        <span className="sm-map-hint">
          Hover bands for highlight; click for detail. Scroll/pan when the map is larger than the frame.
        </span>
      </div>
      <div className="sm-map-viewport">
        <div ref={scrollContainerRef} className="sm-scroll-container">
          <div className="sm-image-container" style={{ width: `${imageInnerWidthPct}%` }}>
            <img
              className="sm-select-img"
              src="/imgs/spatial_meta.png"
              alt="Spatial metabolomics overview — vertical metabolite strips"
            />
            {Array.from({ length: GLB_BLOCK_NUM }, (_, i) => (
              <button
                key={i}
                type="button"
                className={`sm-strip-hit${selectedIdx === i ? ' selected' : ''}`}
                style={{
                  left: `${leftPct}%`,
                  width: `${widthPct}%`,
                  top: `${(GLB_TOP_RATIO + (i * (GLB_BOTTOM_RATIO - GLB_TOP_RATIO)) / GLB_BLOCK_NUM) * 100}%`,
                  height: `${stripHeightPct}%`,
                }}
                aria-label={`Metabolite strip ${i + 1}`}
                onClick={() => onSelectIdx(i)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function DetailFigure({
  src,
  alt,
  fallbackLabel,
}: {
  src: string
  alt: string
  fallbackLabel: string
}) {
  const [ok, setOk] = useState(true)
  useEffect(() => {
    setOk(true)
  }, [src])
  if (!ok) {
    return (
      <div className="sm-chart-placeholder">
        <span>{fallbackLabel}</span>
        <span style={{ fontSize: '0.7rem', opacity: 0.85 }}>Image not available at expected path.</span>
      </div>
    )
  }
  return (
    <div style={{ padding: 12 }}>
      <img className="sm-detail-img" src={src} alt={alt} onError={() => setOk(false)} />
    </div>
  )
}

export default function SpatialMetabolomics() {
  const { pathname, hash: locationHash } = useLocation()
  const navigate = useNavigate()

  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)

  useEffect(() => {
    if (pathname !== '/spatial-metabolomics') return
    if (locationHash === '#transcriptomics') {
      navigate('/spatial-transcriptomics', { replace: true })
      return
    }
    if (!locationHash || locationHash === '#') {
      navigate('/spatial-metabolomics#metabolomics', { replace: true })
    }
  }, [pathname, locationHash, navigate])

  const selectedRow = selectedIdx != null ? METABOLITE_ROWS[selectedIdx] : null

  return (
    <div style={shell}>
      <style>{SM_STYLE_TAG}</style>
      <NavBar />

      <div className="sm-viewer-layout">
          <div className="sm-tx-pvs">
            <div className="sm-tx-pvs-left">
              <div className="sm-page-eyebrow">
                <span className="sm-eyebrow-line" />
                Spatial Omics
              </div>
              <h2 className="sm-pvs-title">Spatial Metabolomics</h2>
              <p className="sm-pvs-desc">
                Metabolite spatial distribution (MALDI imaging) across fetal gut tissue sections. Explore metabolite
                expression and quantification across Duodenum and Colon.
              </p>
            </div>
            <div>
              <div className="sm-metabo-layout">
                <div className="sm-metabo-map-col">
                  <SpatialMetaMap selectedIdx={selectedIdx} onSelectIdx={setSelectedIdx} />
                  {selectedIdx != null ? (
                    <div className="sm-selected-name-rail" aria-live="polite">
                      <div className="sm-selected-name-rail-inner">
                        {METABOLITE_ROWS[selectedIdx].name} · m/z {METABOLITE_ROWS[selectedIdx].mz} · strip{' '}
                        {METABOLITE_ROWS[selectedIdx].slideIndex}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="sm-detail-col">
                  <div className="sm-chart-card">
                    <div className="sm-chart-card-header">
                      <div className="sm-chart-title">Spatial Metabolomics · Metabolite detail</div>
                    </div>
                    <div className="sm-chart-body">
                      {!selectedRow ? (
                        <div className="sm-chart-placeholder" style={{ margin: 16 }}>
                          <span style={{ fontSize: '2rem', opacity: 0.35 }}>🧪</span>
                          <span>Click a band on the metabolite map to view spatial distribution and quantification.</span>
                        </div>
                      ) : (
                        <>
                          <div style={{ padding: '16px 18px 4px' }}>
                            <div className="sm-detail-metabolite-name">{selectedRow.name}</div>
                            <div className="sm-detail-mz">m/z {selectedRow.mz}</div>
                          </div>
                          <div style={{ borderTop: '1px solid var(--border)' }}>
                            <div className="sm-chart-card-header">
                              <div className="sm-chart-title">
                                Spatial Metabolomics · {selectedRow.name} · Spatial distribution
                              </div>
                            </div>
                            <DetailFigure
                              src={slideSpatialUrl(selectedRow.slideIndex)}
                              alt={`Spatial distribution · ${selectedRow.name}`}
                              fallbackLabel="Spatial distribution"
                            />
                          </div>
                          
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
      </div>

      <Footer />
    </div>
  )
}
