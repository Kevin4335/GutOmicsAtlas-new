import type { CSSProperties } from 'react'

const footer: CSSProperties = {
  borderTop: '1px solid var(--border)',
  background: 'var(--surface)',
  padding: '20px clamp(16px, 4vw, 56px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: 12,
}

const copyright: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  textAlign: 'center',
  fontSize: '0.78rem',
  color: 'var(--light)',
  padding: '12px 24px 28px',
  fontFamily: "'Montserrat', sans-serif",
  background: 'var(--surface)',
  borderTop: '1px solid var(--border)',
}

export default function Footer() {
  return (
    <>
      <footer style={footer}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 700,
              fontSize: '0.95rem',
              color: 'var(--navy)',
            }}
          >
            GutOmicsAtlas
          </span>
          <span style={{ color: 'var(--light)' }}>·</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
            Multi-Omics Research Platform · v1.8
          </span>
        </div>
      </footer>
      <div style={copyright}>
        Copyright © Chen lab at Weill Cornell Medicine 2024 All rights reserved.
      </div>
    </>
  )
}
