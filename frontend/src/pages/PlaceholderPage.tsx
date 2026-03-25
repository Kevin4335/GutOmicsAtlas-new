import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import NavBar from '../components/NavBar'
import Footer from '../components/Footer'

function titleFromPath(pathname: string) {
  const base = pathname.split('#')[0] ?? pathname
  const segment = base.split('/').filter(Boolean).pop() ?? 'Page'
  return segment
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

const SECTION_IDS: Record<string, string[]> = {
  '/scrna': ['scrna', 'snatac'],
  '/spatial-metabolomics': ['metabolomics', 'transcriptomics'],
}

export default function PlaceholderPage() {
  const { pathname, hash } = useLocation()
  const title = titleFromPath(pathname)

  useEffect(() => {
    if (!hash) return
    const id = hash.replace(/^#/, '')
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [pathname, hash])

  const sectionIds = SECTION_IDS[pathname]

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg)',
      }}
    >
      <NavBar />
      <main
        style={{
          flex: 1,
          maxWidth: 640,
          margin: '0 auto',
          padding: 'clamp(32px, 6vw, 72px) clamp(16px, 4vw, 56px)',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontSize: 'clamp(1.5rem, 3vw, 2rem)',
            fontWeight: 700,
            color: 'var(--navy)',
            marginBottom: 16,
          }}
        >
          {title}
        </h1>
        <p style={{ color: 'var(--muted)', marginBottom: 24, lineHeight: 1.65 }}>
          This section is not built in the React app yet.
        </p>
        {sectionIds?.map((id) => (
          <div
            key={id}
            id={id}
            tabIndex={-1}
            style={{
              scrollMarginTop: 96,
              marginTop: 32,
              paddingTop: 16,
              borderTop: '1px solid var(--border)',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'var(--navy)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            {id.replace(/-/g, ' ')}
          </div>
        ))}
        <Link
          to="/"
          style={{
            color: 'var(--accent)',
            fontWeight: 600,
            textDecoration: 'none',
            fontFamily: "'Montserrat', sans-serif",
          }}
        >
          ← Back to home
        </Link>
      </main>
      <Footer />
    </div>
  )
}
