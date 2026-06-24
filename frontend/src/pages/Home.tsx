import type { CSSProperties } from 'react'
import NavBar from '../components/NavBar'
import Footer from '../components/Footer'
import { useNavigate } from 'react-router-dom'

/** Keyframes + responsive grids (small global snippet; rest is inline styles). */
const HOME_STYLE_TAG = `
@keyframes gutSlideUpIn {
  0% { opacity: 0; transform: translateY(28px); }
  100% { opacity: 1; transform: translateY(0); }
}
.gut-home-hero {
  display: grid;
  grid-template-columns: 1fr;
  gap: 36px;
  align-items: start;
}
@media (min-width: 900px) {
  .gut-home-hero {
    grid-template-columns: 1fr 380px;
    gap: 72px;
  }
}
.gut-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 14px;
  align-items: stretch;
}
`

const STATS = [
  { label: 'Omics Modalities', hint: 'scRNA · snATAC · Spatial TX', value: '3' },
  { label: 'Spatial Genes', hint: 'transcriptomics panel', value: '422' },
  { label: 'Tissue Regions', hint: 'Small intestine · Large intestine', value: '2' },
  {
    label: 'Development Stages',
    hint: 'Fetal · Adult',
    value: '2',
  },
] as const

const MODULES = [
  {
    id: 'scrna',
    index: 'MODULE 01',
    title: 'scRNA-seq',
    desc: 'Single-cell RNA sequencing of fetal and adult gut epithelial and enteroendocrine cells with UMAP, dot plots, and region comparison.',
    stage: 'Fetal + Adult',
    cellType: 'All epithelial cells and enteroendocrine cells',
    borderColor: 'var(--green)',
    pillBg: 'var(--green-light)',
    titleColor: 'var(--green)',
  },
  {
    id: 'snatac',
    index: 'MODULE 02',
    title: 'snATAC-seq',
    desc: 'Single-nucleus ATAC sequencing profiling chromatin accessibility with IGV-style coverage plots across all gut cell types.',
    stage: 'Fetal',
    cellType: 'All cell types and epithelial cells',
    borderColor: 'var(--teal)',
    pillBg: 'var(--teal-light)',
    titleColor: 'var(--teal)',
  },
  {
    id: 'spatial-transcriptomics',
    index: 'MODULE 03',
    title: 'Spatial Transcriptomics',
    desc: 'Spatial gene expression across 422 genes in 18 and 20-week fetal gut sections, with cell type reference maps.',
    stage: 'Fetal',
    cellType: 'Epithelial cells',
    borderColor: 'var(--purple)',
    pillBg: 'var(--purple-light)',
    titleColor: 'var(--purple)',
  },
] as const

const FEATURES = [
  {
    icon: '🧬',
    title: 'scRNA & snATAC Browser',
    desc: 'Explore single-cell expression and chromatin accessibility across epithelial and enteroendocrine cell types with interactive UMAP and dot plots.',
  },
  {
    icon: '🤖',
    title: 'AI-Powered Analysis',
    desc: 'Chat with AI to explore GLKB (Genomic Literature Knowledge Base) and answer questions about gut biology and dataset findings.',
  },
  {
    icon: '🗺️',
    title: 'Spatial Data Visualization',
    desc: 'Query 422 genes to see spatial expression across gut tissue sections.',
  },
  {
    icon: '📊',
    title: 'Differential Expression',
    desc: 'MA plots and violin plots comparing gene expression between 1. small intestine and large intestine, 2. goblet cells versus other epithelial cells, across different developmental stages from fetal samples to adult samples.',
  },
] as const

function fade(delayMs: string): CSSProperties {
  return {
    opacity: 0,
    animation: `gutSlideUpIn 0.4s ease-out forwards`,
    animationDelay: delayMs,
  }
}

const sectionHeadTag: CSSProperties = {
  fontSize: '0.7rem',
  fontWeight: 600,
  letterSpacing: '1px',
  textTransform: 'uppercase',
  color: 'var(--light)',
  whiteSpace: 'nowrap',
  flexShrink: 0,
  fontFamily: "'Montserrat', sans-serif",
}

export default function Home() {
  const navigate = useNavigate()

  const shell: CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg)',
  }

  const inner: CSSProperties = {
    maxWidth: 1200,
    margin: '0 auto',
    paddingLeft: 'clamp(16px, 4vw, 56px)',
    paddingRight: 'clamp(16px, 4vw, 56px)',
  }

  const btnPrimary: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    background: 'var(--accent)',
    color: 'white',
    fontWeight: 600,
    fontSize: '0.875rem',
    padding: '11px 24px',
    borderRadius: 7,
    border: 'none',
    cursor: 'pointer',
    fontFamily: "'Montserrat', sans-serif",
    letterSpacing: '0.1px',
    transition: 'all 0.2s',
  }

  const btnOutline: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    background: 'white',
    border: '1px solid var(--border2)',
    color: 'var(--text)',
    fontWeight: 500,
    fontSize: '0.875rem',
    padding: '11px 24px',
    borderRadius: 7,
    cursor: 'pointer',
    fontFamily: "'Montserrat', sans-serif",
    transition: 'all 0.2s',
  }

  return (
    <div style={shell}>
      <style>{HOME_STYLE_TAG}</style>
      <NavBar />

      <div style={inner}>
        {/* Hero — layout mirrors Home.js (grid + stats card) */}
        <div
          className="gut-home-hero"
          style={{
            paddingTop: 72,
            paddingBottom: 64,
          }}
        >
          <div>
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
                marginBottom: 20,
                fontFamily: "'Montserrat', sans-serif",
                ...fade('0ms'),
              }}
            >
              <span
                style={{
                  width: 24,
                  height: 2,
                  background: 'var(--accent)',
                  borderRadius: 2,
                }}
              />
              Multi-Omics Research Platform
            </div>
            <h1
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontSize: 'clamp(2.2rem, 4vw, 3rem)',
                fontWeight: 700,
                lineHeight: 1.15,
                letterSpacing: '-0.5px',
                color: 'var(--navy)',
                marginBottom: 20,
                ...fade('50ms'),
              }}
            >
              Explore the{' '}
              <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>GutOmics</em>
              <br />
              Atlas
            </h1>
            <p
              style={{
                fontSize: '1rem',
                color: 'var(--muted)',
                lineHeight: 1.75,
                maxWidth: 520,
                marginBottom: 36,
                fontWeight: 400,
                ...fade('100ms'),
              }}
            >
              An AI-powered platform for exploring multi-omics data from human gut tissues.
              Integrates scRNA-seq, snATAC-seq, and spatial transcriptomics from fetal and adult
              gut samples.
            </p>
            <div
              style={{
                display: 'flex',
                gap: 12,
                flexWrap: 'wrap',
                ...fade('170ms'),
              }}
            >
              <button
                type="button"
                style={btnPrimary}
                onClick={() => navigate('/chat')}
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
                <svg
                  width={14}
                  height={14}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.2}
                  viewBox="0 0 24 24"
                >
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Launch Explorer
              </button>
              <button
                type="button"
                style={btnOutline}
                onClick={() => navigate('/help')}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent-border)'
                  e.currentTarget.style.color = 'var(--accent)'
                  e.currentTarget.style.background = 'var(--accent-light)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border2)'
                  e.currentTarget.style.color = 'var(--text)'
                  e.currentTarget.style.background = 'white'
                }}
              >
                <svg
                  width={14}
                  height={14}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                Documentation
              </button>
            </div>
          </div>

          {/* Stats panel */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              overflow: 'hidden',
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              position: 'sticky',
              top: 84,
              alignSelf: 'start',
              ...fade('300ms'),
            }}
          >
            <div
              style={{
                padding: '20px 24px 16px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--muted)',
                  letterSpacing: '0.7px',
                  textTransform: 'uppercase',
                }}
              >
                Dataset Summary
              </span>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.65rem',
                  background: 'var(--accent-light)',
                  color: 'var(--accent)',
                  padding: '3px 8px',
                  borderRadius: 4,
                  fontWeight: 500,
                }}
              >
                Multi-Omics · v1.8
              </span>
            </div>
            <div style={{ padding: '8px 0' }}>
              {STATS.map((row, i) => (
                <div
                  key={row.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 24px',
                    borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span
                      style={{
                        fontSize: '0.82rem',
                        fontWeight: 500,
                        color: 'var(--text)',
                      }}
                    >
                      {row.label}
                    </span>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        color: 'var(--light)',
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      {row.hint}
                    </span>
                  </div>
                  <span
                    style={{
                      fontFamily: "'Montserrat', sans-serif",
                      fontSize: '1.55rem',
                      fontWeight: 700,
                      color: 'var(--navy)',
                      letterSpacing: '-0.5px',
                      lineHeight: 1,
                    }}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Data modules — mirrors “Disease stages” block in Home.js */}
        <div style={{ paddingBottom: 72 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              marginBottom: 28,
              width: '100%',
            }}
          >
            <span style={sectionHeadTag}>Data Modules</span>
            <div style={{ flex: 1, height: 1, minWidth: 0, background: 'var(--border)' }} />
          </div>
          <div className="gut-card-grid">
            {MODULES.map((m) => (
              <div
                key={m.id}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: '24px 20px',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.2s',
                  minHeight: 0,
                  boxShadow: 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.08)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none'
                  e.currentTarget.style.transform = 'none'
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: m.borderColor,
                  }}
                />
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.65rem',
                    color: 'var(--light)',
                    letterSpacing: '0.8px',
                    marginBottom: 10,
                  }}
                >
                  {m.index}
                </div>
                <div
                  style={{
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    marginBottom: 10,
                    color: m.titleColor,
                  }}
                >
                  {m.title}
                </div>
                <div
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--muted)',
                    lineHeight: 1.6,
                    marginBottom: 18,
                  }}
                >
                  {m.desc}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      padding: '4px 10px',
                      borderRadius: 100,
                      background: m.pillBg,
                      color: m.titleColor,
                      alignSelf: 'flex-start',
                    }}
                  >
                    <span
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: '50%',
                        background: 'currentColor',
                      }}
                    />
                    Developmental Stage: {m.stage}
                  </span>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      color: 'var(--muted)',
                      lineHeight: 1.5,
                    }}
                  >
                    Cell type: {m.cellType}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Platform capabilities */}
        <div style={{ paddingBottom: 72 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              marginBottom: 28,
              width: '100%',
            }}
          >
            <span style={sectionHeadTag}>Platform Capabilities</span>
            <div style={{ flex: 1, height: 1, minWidth: 0, background: 'var(--border)' }} />
          </div>
          <div className="gut-card-grid">
            {FEATURES.map((feat) => (
              <div
                key={feat.title}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: '28px 24px',
                  transition: 'all 0.2s',
                  minHeight: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.07)'
                  e.currentTarget.style.borderColor = 'var(--accent-border)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none'
                  e.currentTarget.style.borderColor = 'var(--border)'
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    background: 'var(--accent-light)',
                    borderRadius: 9,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.1rem',
                    marginBottom: 16,
                  }}
                >
                  {feat.icon}
                </div>
                <div
                  style={{
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: 'var(--navy)',
                    marginBottom: 8,
                  }}
                >
                  {feat.title}
                </div>
                <div
                  style={{
                    fontSize: '0.82rem',
                    color: 'var(--muted)',
                    lineHeight: 1.65,
                  }}
                >
                  {feat.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Citation — label “Dataset” per index(2).html */}
        <div style={{ paddingBottom: 72 }}>
          <div
            style={{
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              borderLeft: '3px solid var(--accent)',
              borderRadius: '0 10px 10px 0',
              padding: '20px 28px',
              display: 'flex',
              alignItems: 'center',
              gap: 24,
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                color: 'var(--accent)',
                whiteSpace: 'nowrap',
              }}
            >
              Dataset
            </span>
            <span
              style={{
                fontSize: '0.82rem',
                color: 'var(--muted)',
                fontFamily: "'JetBrains Mono', monospace",
                lineHeight: 1.5,
              }}
            >
              GutOmicsAtlas · scRNA-seq · snATAC-seq · Spatial Transcriptomics · Human Gut ·
              Fetal & Adult · Chen Laboratory · Weill Cornell Medicine
            </span>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
