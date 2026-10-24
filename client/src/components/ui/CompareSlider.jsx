import { useEffect, useRef, useState } from 'react'
import { ChevronsLeftRightIcon } from 'lucide-react'

const clamp = (v) => Math.min(100, Math.max(0, v))
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Before/after slider. `before` is the original photo URL; `children` render the "after" layer
// (the cutout on whatever background is selected). Drag, click, or use the arrow keys.
const CompareSlider = ({ before, beforeAlt = 'Original photo', ratio, autoplay = false, initial = 50, className = '', children }) => {
  const box = useRef(null)
  const [pos, setPos] = useState(initial)
  const [touched, setTouched] = useState(false)
  const dragging = useRef(false)

  // Gentle sweep on the landing page until someone grabs the handle
  useEffect(() => {
    if (!autoplay || touched || reducedMotion()) return
    let frame
    const start = performance.now()
    const tick = (now) => {
      setPos(50 + Math.sin((now - start) / 1400) * 32)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [autoplay, touched])

  const moveTo = (clientX) => {
    const rect = box.current.getBoundingClientRect()
    setPos(clamp(((clientX - rect.left) / rect.width) * 100))
  }

  const onPointerDown = (e) => {
    setTouched(true)
    dragging.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    moveTo(e.clientX)
  }

  const onKeyDown = (e) => {
    const step = e.shiftKey ? 10 : 2
    if (e.key === 'ArrowLeft') setPos((p) => clamp(p - step))
    else if (e.key === 'ArrowRight') setPos((p) => clamp(p + step))
    else if (e.key === 'Home') setPos(0)
    else if (e.key === 'End') setPos(100)
    else return
    e.preventDefault()
    setTouched(true)
  }

  return (
    <div
      ref={box}
      className={`relative touch-none overflow-hidden select-none ${className}`}
      style={ratio ? { aspectRatio: ratio } : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={(e) => dragging.current && moveTo(e.clientX)}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
    >
      <div className="absolute inset-0">{children}</div>

      <div className="absolute inset-0 bg-elev" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <img src={before} alt={beforeAlt} draggable={false} className="size-full object-contain" />
      </div>

      <span className="pointer-events-none absolute top-3 left-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur" style={{ opacity: pos > 12 ? 1 : 0 }}>
        Before
      </span>
      <span className="pointer-events-none absolute top-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur" style={{ opacity: pos < 88 ? 1 : 0 }}>
        After
      </span>

      <div className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_12px_rgba(0,0,0,.35)]" style={{ left: `${pos}%` }} />
      <button
        type="button"
        role="slider"
        aria-label="Compare before and after"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pos)}
        onKeyDown={onKeyDown}
        className="absolute top-1/2 grid size-10 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize place-items-center rounded-full border border-white/70 bg-white/90 text-slate-800 shadow-lg backdrop-blur transition-transform hover:scale-105"
        style={{ left: `${pos}%` }}
      >
        <ChevronsLeftRightIcon size={18} />
      </button>
    </div>
  )
}

export default CompareSlider
