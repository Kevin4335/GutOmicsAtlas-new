import { useState, type CSSProperties } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'

const header: CSSProperties = {
  background: 'var(--surface)',
  borderBottom: '1px solid var(--border)',
  padding: '0 clamp(16px, 4vw, 56px)',
  height: 64,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  position: 'sticky',
  top: 0,
  zIndex: 100,
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  overflow: 'visible',
}

const logo: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  textDecoration: 'none',
  color: 'inherit',
}

const logoMark: CSSProperties = {
  width: 36,
  height: 36,
  background: 'var(--navy)',
  borderRadius: 8,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
}

const logoTitle: CSSProperties = {
  fontFamily: "'Montserrat', sans-serif",
  fontWeight: 700,
  fontSize: '1.05rem',
  color: 'var(--navy)',
  letterSpacing: '-0.2px',
  lineHeight: 1.2,
}

const logoSub: CSSProperties = {
  fontSize: '0.68rem',
  color: 'var(--light)',
  letterSpacing: '0.8px',
  textTransform: 'uppercase',
  fontWeight: 500,
  fontFamily: "'Montserrat', sans-serif",
  lineHeight: 1.2,
}

const nav: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  flexWrap: 'wrap',
  justifyContent: 'flex-end',
  overflow: 'visible',
  position: 'relative',
  zIndex: 1,
}

const navDivider: CSSProperties = {
  width: 1,
  height: 18,
  background: 'var(--border)',
  margin: '0 6px',
}

function linkBase(active: boolean, isBtnNav = false): CSSProperties {
  if (isBtnNav) {
    return {
      background: active ? 'var(--accent)' : '#111827',
      color: 'white',
      fontWeight: 600,
      padding: '7px 16px',
      borderRadius: 6,
      textDecoration: 'none',
      fontSize: '0.85rem',
      fontFamily: "'Montserrat', sans-serif",
      transition: 'all 0.15s',
      border: 'none',
      cursor: 'pointer',
    }
  }
  return {
    color: active ? 'var(--accent)' : 'var(--muted)',
    textDecoration: 'none',
    fontSize: '0.85rem',
    fontWeight: active ? 600 : 500,
    padding: '7px 14px',
    borderRadius: 6,
    transition: 'all 0.15s',
    background: active ? 'var(--accent-light)' : 'transparent',
    fontFamily: "'Montserrat', sans-serif",
    border: 'none',
    cursor: 'pointer',
  }
}

/** Inline-block + non-flex wrapper so the menu stays in one hover subtree (avoids flex row “gaps”). */
const ddWrap: CSSProperties = {
  position: 'relative',
  display: 'inline-block',
  verticalAlign: 'middle',
}

const ddMenu: CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
  minWidth: 210,
  padding: '8px 5px 5px',
}

function dropdownLinkStyle(active: boolean): CSSProperties {
  return {
    display: 'block',
    padding: '9px 14px',
    fontSize: '0.83rem',
    fontWeight: active ? 600 : 500,
    color: active ? 'var(--accent)' : 'var(--muted)',
    textDecoration: 'none',
    borderRadius: 6,
    transition: 'background 0.15s, color 0.15s',
    fontFamily: "'Montserrat', sans-serif",
    background: active ? 'var(--accent-light)' : 'transparent',
    cursor: 'pointer',
  }
}

function getHoverBg(active: boolean) {
  return active ? 'var(--accent-light)' : 'var(--surface2)'
}

function isHashActive(to: string, pathname: string, hash: string) {
  const [path, frag] = to.split('#')
  if (path !== pathname || !frag) return false
  return hash === `#${frag}`
}

function isPathInGroup(to: string, pathname: string) {
  const [path] = to.split('#')
  return pathname === path || pathname.startsWith(`${path}/`)
}

function Dropdown({
  label,
  items,
}: {
  label: string
  items: { to: string; label: string }[]
}) {
  const [open, setOpen] = useState(false)
  const { pathname, hash } = useLocation()
  const groupActive = items.some((item) => isPathInGroup(item.to, pathname))

  return (
    <div
      style={{
        ...ddWrap,
        /* Later flex siblings (Help, About, wrapped rows) paint on top unless this item stacks above */
        zIndex: open ? 5000 : undefined,
      }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          color: groupActive ? 'var(--accent)' : 'var(--muted)',
          textDecoration: 'none',
          fontSize: '0.85rem',
          fontWeight: groupActive ? 600 : 500,
          padding: '7px 14px',
          borderRadius: 6,
          transition: 'all 0.15s',
          cursor: 'pointer',
          fontFamily: "'Montserrat', sans-serif",
          whiteSpace: 'nowrap',
          background: open ? getHoverBg(groupActive) : groupActive ? 'var(--accent-light)' : 'transparent',
        }}
      >
        {label}
        <svg
          width={10}
          height={10}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          style={{
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s',
            flexShrink: 0,
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </span>
      {open ? (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: '100%',
            marginTop: -6,
            paddingTop: 10,
            minWidth: '100%',
            zIndex: 1,
            boxSizing: 'border-box',
            pointerEvents: 'auto',
          }}
        >
          <div style={ddMenu}>
            {items.map((item) => {
              const active = isHashActive(item.to, pathname, hash)
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  style={dropdownLinkStyle(active)}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = 'var(--surface2)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = 'transparent'
                    }
                  }}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default function NavBar() {
  return (
    <header style={header}>
      <NavLink to="/" style={logo}>
        <div style={logoMark}>
          <svg
            viewBox="0 0 24 24"
            style={{ width: 20, height: 20, fill: 'none', stroke: 'white', strokeWidth: 1.8 }}
          >
            <path d="M5 3h11a3 3 0 010 6H8a3 3 0 000 6h8a3 3 0 010 6H5" />
          </svg>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={logoTitle}>GutOmicsAtlas</span>
          <span style={logoSub}>Multi-Omics · Human Gut</span>
        </div>
      </NavLink>

      <nav style={nav} aria-label="Main">
        <NavLink
          to="/"
          end
          style={({ isActive }) => linkBase(isActive)}
          onMouseEnter={(e) => {
            const active = e.currentTarget.getAttribute('aria-current') === 'page'
            e.currentTarget.style.background = getHoverBg(active)
          }}
          onMouseLeave={(e) => {
            const active = e.currentTarget.getAttribute('aria-current') === 'page'
            e.currentTarget.style.background = active ? 'var(--accent-light)' : 'transparent'
          }}
        >
          Home
        </NavLink>
        <NavLink
          to="/chat"
          style={({ isActive }) => linkBase(isActive)}
          onMouseEnter={(e) => {
            const active = e.currentTarget.getAttribute('aria-current') === 'page'
            e.currentTarget.style.background = getHoverBg(active)
          }}
          onMouseLeave={(e) => {
            const active = e.currentTarget.getAttribute('aria-current') === 'page'
            e.currentTarget.style.background = active ? 'var(--accent-light)' : 'transparent'
          }}
        >
          Chat with AI
        </NavLink>

        <Dropdown
          label="Single Cell Modality"
          items={[
            { to: '/scrna', label: 'scRNA' },
            { to: '/snatac', label: 'snATAC' },
          ]}
        />
        <Dropdown
          label="Spatial Modality"
          items={[{ to: '/spatial-transcriptomics', label: 'Spatial Transcriptomics' }]}
        />

        <div style={navDivider} aria-hidden />
        <NavLink to="/help" style={({ isActive }) => linkBase(isActive)}>
          Help
        </NavLink>
        <NavLink to="/about" style={({ isActive }) => linkBase(isActive, true)}>
          About
        </NavLink>
      </nav>
    </header>
  )
}
