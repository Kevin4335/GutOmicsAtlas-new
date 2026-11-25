import type { CSSProperties } from 'react'

export type DownloadItem = {
  href: string
  label: string
}

const bar: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 8,
  marginBottom: 16,
  flexWrap: 'wrap',
}

const linkStyle: CSSProperties = {
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
}

/** Same-origin download chips for `/downloads/...` (and other static hrefs). */
export function DownloadLinks({ items }: { items: DownloadItem[] }) {
  if (!items.length) return null
  return (
    <div style={bar}>
      {items.map((it) => (
        <a key={`${it.href}:${it.label}`} href={it.href} download style={linkStyle}>
          {it.label}
        </a>
      ))}
    </div>
  )
}
