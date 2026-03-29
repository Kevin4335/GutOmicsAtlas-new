import {
  useCallback,
  useEffect,
  useState,
  type ImgHTMLAttributes,
  type MouseEvent,
  type MouseEventHandler,
} from 'react'
import { createPortal } from 'react-dom'
import Lightbox from 'yet-another-react-lightbox'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import 'yet-another-react-lightbox/styles.css'
import './lightbox-theme.css'

export type LightboxZoomImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'onClick'> & {
  /** Fires when the thumbnail button is clicked, before the lightbox opens. */
  onClick?: MouseEventHandler<HTMLButtonElement>
}

type PixelProbe = {
  clientX: number
  clientY: number
  px: number
  py: number
}

/** Map pointer position to PNG pixel indices (object-fit: contain letterbox aware). Approximate when zoom/pan is active. */
function naturalPixelFromImageEvent(e: MouseEvent<HTMLImageElement>): { px: number; py: number } | null {
  const el = e.currentTarget
  const nw = el.naturalWidth
  const nh = el.naturalHeight
  if (!nw || !nh) return null
  const rect = el.getBoundingClientRect()
  const scale = Math.min(rect.width / nw, rect.height / nh)
  const dispW = nw * scale
  const dispH = nh * scale
  const offX = (rect.width - dispW) / 2
  const offY = (rect.height - dispH) / 2
  const lx = e.clientX - rect.left - offX
  const ly = e.clientY - rect.top - offY
  if (lx < 0 || ly < 0 || lx > dispW || ly > dispH) return null
  const px = Math.floor((lx / dispW) * nw)
  const py = Math.floor((ly / dispH) * nh)
  return {
    px: Math.max(0, Math.min(nw - 1, px)),
    py: Math.max(0, Math.min(nh - 1, py)),
  }
}

/**
 * Click opens a full-screen lightbox; pinch / wheel zoom and pan only in the lightbox (Zoom plugin).
 */
export function LightboxZoomImage({
  alt = '',
  src,
  style,
  className,
  onClick,
  ...imgRest
}: LightboxZoomImageProps) {
  const [open, setOpen] = useState(false)
  const [probe, setProbe] = useState<PixelProbe | null>(null)
  const openLb = useCallback(() => setOpen(true), [])
  const closeLb = useCallback(() => {
    setProbe(null)
    setOpen(false)
  }, [])

  useEffect(() => {
    if (!open) setProbe(null)
  }, [open])

  const handleSlideImageMove = useCallback((e: MouseEvent<HTMLImageElement>) => {
    const coords = naturalPixelFromImageEvent(e)
    if (!coords) {
      setProbe(null)
      return
    }
    setProbe({
      ...coords,
      clientX: e.clientX,
      clientY: e.clientY,
    })
  }, [])

  if (src == null || src === '') {
    return null
  }

  const slide = { src: String(src), alt: alt || 'Figure' }

  let tooltipLeft = 0
  let tooltipTop = 0
  if (probe && typeof window !== 'undefined') {
    const pad = 14
    const tw = 118
    const th = 28
    tooltipLeft = Math.min(probe.clientX + pad, window.innerWidth - tw - 8)
    tooltipTop = Math.min(probe.clientY + pad, window.innerHeight - th - 8)
  }

  return (
    <>
      <button
        type="button"
        className="chart-lightbox-trigger"
        aria-haspopup="dialog"
        aria-label={alt ? `Enlarge figure: ${alt}` : 'Enlarge figure'}
        onClick={(e) => {
          onClick?.(e)
          if (!e.defaultPrevented) openLb()
        }}
        style={{
          border: 'none',
          padding: 0,
          margin: 0,
          background: 'transparent',
          cursor: 'zoom-in',
          display: 'block',
          width: '100%',
          lineHeight: 0,
        }}
      >
        <img alt={alt} src={src} style={style} className={className} {...imgRest} />
      </button>
      <Lightbox
        open={open}
        close={closeLb}
        slides={[slide]}
        plugins={[Zoom]}
        zoom={{
          maxZoomPixelRatio: 3,
          scrollToZoom: true,
          pinchZoomV4: true,
          wheelZoomDistanceFactor: 420,
          pinchZoomDistanceFactor: 420,
        }}
        carousel={{
          finite: true,
          imageProps: {
            onMouseMove: handleSlideImageMove,
            onMouseLeave: () => setProbe(null),
          },
        }}
        controller={{ closeOnBackdropClick: true }}
        render={{
          buttonPrev: () => null,
          buttonNext: () => null,
        }}
      />
      {open && probe && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="chart-lightbox-pixel-readout"
              style={{
                position: 'fixed',
                left: tooltipLeft,
                top: tooltipTop,
                zIndex: 100050,
                padding: '5px 10px',
                borderRadius: 6,
                fontSize: 12,
                fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                background: 'rgba(17, 17, 17, 0.92)',
                color: '#f1f5f9',
                border: '1px solid var(--accent, #de3341)',
                pointerEvents: 'none',
                boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
                whiteSpace: 'nowrap',
              }}
            >
              x: {probe.px}&nbsp;&nbsp;y: {probe.py}
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
