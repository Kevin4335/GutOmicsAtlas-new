import { useEffect, useState, type CSSProperties } from 'react'

const BAR_WRAP: CSSProperties = {
  width: '68%',
  maxWidth: 420,
  height: 8,
  background: '#e5e7eb',
  borderRadius: 4,
  overflow: 'hidden',
}

const BAR_FILL: CSSProperties = {
  height: '100%',
  background: 'var(--accent)',
  borderRadius: 4,
  transition: 'none',
}

/** Indeterminate-style progress (stalls ~88%) until unmounted when the chart loads. */
export function LoadingBar() {
  const [pct, setPct] = useState(6)

  useEffect(() => {
    const tick = () => {
      setPct((prev) => {
        if (prev >= 88) return prev
        const jump = 2 + Math.floor(Math.random() * 7)
        return Math.min(88, prev + jump)
      })
    }
    const id = window.setInterval(tick, 650 + Math.floor(Math.random() * 450))
    return () => window.clearInterval(id)
  }, [])

  return (
    <div style={BAR_WRAP} aria-hidden>
      <div style={{ ...BAR_FILL, width: `${pct}%` }} />
    </div>
  )
}
