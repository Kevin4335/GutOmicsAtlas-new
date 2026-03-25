import type { CSSProperties } from 'react'
import { useRef, useState } from 'react'
import NavBar from '../components/NavBar'
import Footer from '../components/Footer'

type CellType = 'all' | 'epithelial'
type SnatacTab = 'overview' | 'result'
type QueryStatus = 'idle' | 'loading' | 'success' | 'queued' | 'error'

/** Default overview figures (legacy `frontend-old/html/snatac.html` static-imgs). Serve from `public/imgs/`. */
const OVERVIEW_BY_CELL: Record<
  CellType,
  { leftSrc: string; rightSrc: string; leftLabel: string; rightLabel: string }
> = {
  all: {
    leftSrc: '/imgs/atac_all_left_no_embed.png',
    rightSrc: '/imgs/snATACdotplotEEC.png',
    leftLabel: 'snATAC · All cell types · Overview · Coverage (default)',
    rightLabel: 'snATAC · All cell types · Overview · Dot plot (default)',
  },
  epithelial: {
    leftSrc: '/imgs/atac_ep_left_no_embed.png',
    rightSrc: '/imgs/snATACdotplotEpithelial.png',
    leftLabel: 'snATAC · Epithelial · Overview · Coverage (default)',
    rightLabel: 'snATAC · Epithelial · Overview · Dot plot (default)',
  },
}

const SNATAC_STYLE_TAG = `
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
  align-items: start;
  width: 80%;
}
.pvs-left { position: static; }
.pvs-right { min-width: 0; }
@media (min-width: 900px) {
  .pvs-layout { grid-template-columns: 240px 1fr; gap: 48px; padding-top: 40px; }
  .pvs-left { position: sticky; top: 80px; }
  .snatac-two-col { grid-template-columns: 1fr 1fr; }
}
`

function toHexUtf8(str: string) {
  const bytes = new TextEncoder().encode(str)
  let hex = ''
  for (const b of bytes) hex += b.toString(16).padStart(2, '0')
  return hex
}

function getStringField(obj: unknown, key: 'img' | 'error'): string | null {
  if (!obj || typeof obj !== 'object') return null
  if (!(key in obj)) return null
  const v = (obj as Record<string, unknown>)[key]
  return typeof v === 'string' ? v : v == null ? null : String(v)
}

const shell: CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  background: 'var(--bg)',
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
}

const cardBody: CSSProperties = { padding: 16 }

const placeholder: CSSProperties = {
  width: '100%',
  height: 320,
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

const tabsBar: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  borderBottom: '1px solid var(--border)',
  marginBottom: 24,
  width: '100%',
  overflowX: 'hidden',
  alignItems: 'stretch',
}

function tabLink(active: boolean): CSSProperties {
  return {
    minWidth: 0,
    width: '100%',
    padding: '10px 12px',
    fontSize: '0.82rem',
    fontWeight: active ? 600 : 500,
    color: active ? 'var(--accent)' : 'var(--muted)',
    cursor: 'pointer',
    border: 'none',
    borderBottom: 'none',
    background: 'none',
    fontFamily: "'Montserrat', sans-serif",
    transition: 'color .15s',
    whiteSpace: 'normal',
    overflowWrap: 'anywhere',
    wordBreak: 'break-word',
    lineHeight: 1.2,
    textAlign: 'center',
    boxShadow: active ? 'inset 0 -2px 0 var(--accent)' : 'inset 0 -2px 0 transparent',
  }
}

const twoCol: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: 16,
  marginBottom: 24,
}

export default function Snatac() {
  const [cellType, setCellType] = useState<CellType>('all')
  const [tab, setTab] = useState<SnatacTab>('overview')
  const [query, setQuery] = useState('')
  const [queryStatus, setQueryStatus] = useState<QueryStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [imgDataUrl, setImgDataUrl] = useState<string | null>(null)
  const [queuedMsg, setQueuedMsg] = useState<string | null>(null)
  const inflight = useRef<AbortController | null>(null)

  const resultTitle = `snATAC · ${cellType === 'all' ? 'All cell types' : 'Epithelial'} · Result Chart · Coverage Plot`
  const overview = OVERVIEW_BY_CELL[cellType]

  async function submitQuery() {
    const loci = query.trim()
    setError(null)
    setQueuedMsg(null)
    setImgDataUrl(null)

    if (!loci) {
      setError('Genetic loci cannot be empty.')
      return
    }

    inflight.current?.abort()
    const ac = new AbortController()
    inflight.current = ac
    setQueryStatus('loading')

    const payload = {
      function: 'snatac',
      type: cellType === 'all' ? 'eecs' : 'ep',
      gene: loci,
      pdf_path: 'combined_plot.pdf',
    }

    const hex = toHexUtf8(JSON.stringify(payload))
    const url = `/api/${hex}`

    try {
      const res = await fetch(url, { method: 'GET', signal: ac.signal })
      if (res.status === 202) {
        setQueryStatus('queued')
        setQueuedMsg('Your request is being processed. Please try again shortly.')
        return
      }
      const text = await res.text()
      const json = text ? (JSON.parse(text) as unknown) : null
      if (!res.ok) {
        setQueryStatus('error')
        setError(getStringField(json, 'error') ?? `HTTP ${res.status}`)
        return
      }
      const img = getStringField(json, 'img') ?? ''
      if (!img) {
        setQueryStatus('error')
        setError('No image returned from server.')
        return
      }
      setImgDataUrl(`data:image/png;base64,${img}`)
      setQueryStatus('success')
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      setQueryStatus('error')
      setError('Network error.')
    } finally {
      if (inflight.current === ac) inflight.current = null
    }
  }

  return (
    <div style={shell}>
      <style>{SNATAC_STYLE_TAG}</style>
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
            Explore chromatin accessibility (snATAC-seq) across gut cell groups. Use Overview for default static
            plots, then switch to Result Chart to query a genetic loci.
          </p>
          <div
            style={{
              marginTop: 18,
              paddingTop: 10,
              borderTop: '1px solid var(--border)',
              fontSize: '0.72rem',
              letterSpacing: '0.7px',
              textTransform: 'uppercase',
              color: 'var(--light)',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            View: snATAC
          </div>
        </div>

        <div className="pvs-right">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={pillGroup} aria-label="Cell type">
              <button
                type="button"
                style={{ ...pill(cellType === 'all'), borderRight: '1px solid var(--border)' }}
                onClick={() => setCellType('all')}
              >
                All cell types
              </button>
              <button
                type="button"
                style={{ ...pill(cellType === 'epithelial'), borderRight: 'none' }}
                onClick={() => setCellType('epithelial')}
              >
                Epithelial
              </button>
            </div>
          </div>

          <div style={tabsBar} role="tablist" aria-label="snATAC tabs">
            <button type="button" role="tab" aria-selected={tab === 'overview'} style={tabLink(tab === 'overview')} onClick={() => setTab('overview')}>
              Overview
            </button>
            <button type="button" role="tab" aria-selected={tab === 'result'} style={tabLink(tab === 'result')} onClick={() => setTab('result')}>
              Result Chart
            </button>
          </div>

          {tab === 'overview' ? (
            <div className="snatac-two-col" style={twoCol}>
              <div style={card}>
                <div style={cardHeader}>
                  <div style={cardTitle}>{overview.leftLabel}</div>
                </div>
                <div style={{ ...cardBody, padding: 12 }}>
                  <img
                    alt={overview.leftLabel}
                    src={overview.leftSrc}
                    style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 8 }}
                  />
                </div>
              </div>
              <div style={card}>
                <div style={cardHeader}>
                  <div style={cardTitle}>{overview.rightLabel}</div>
                </div>
                <div style={{ ...cardBody, padding: 12 }}>
                  <img
                    alt={overview.rightLabel}
                    src={overview.rightSrc}
                    style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 8 }}
                  />
                </div>
              </div>
            </div>
          ) : null}

          {tab === 'result' ? (
            <>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 24, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 220 }}>
                  <span style={fieldLabel}>Genetic Loci</span>
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    style={input}
                    placeholder="e.g. chr11:6153000-6159000"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submitQuery()
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border2)')}
                  />
                </div>
                <button
                  type="button"
                  style={btnPrimary}
                  onClick={submitQuery}
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
                  Submit
                </button>
              </div>

              {error ? (
                <div style={{ marginBottom: 16, color: 'var(--red)', fontSize: '0.82rem', fontWeight: 500 }}>{error}</div>
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
                    <img
                      alt={resultTitle}
                      src={imgDataUrl}
                      style={{ width: '100%', display: 'block', borderRadius: 8, border: '1px solid var(--border)' }}
                    />
                  ) : (
                    <div style={placeholder}>
                      <div style={phText}>
                        {queryStatus === 'idle'
                          ? 'Enter a loci above to view its snATAC coverage plot'
                          : 'snATAC result chart'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <Footer />
    </div>
  )
}

