import { useEffect, useState } from 'react'
import { CheckIcon, SparklesIcon } from 'lucide-react'
import CompareSlider from '../ui/CompareSlider'
import { SAMPLES } from '../../lib/samples'
import { PREVIEW_BACKDROPS, backdropStyle, gradientCss } from '../../lib/backgrounds'

const swatchStyle = (bg) =>
  bg.type === 'transparent' ? undefined : { background: bg.type === 'color' ? bg.color : gradientCss(bg.gradient) }

// Live, interactive preview of the studio for the landing and auth pages:
// real cutouts from Clearcut's engine, a before/after slider and backdrop swatches.
const StudioPreview = ({ samples = SAMPLES.slice(0, 4), className = '' }) => {
  const [step, setStep] = useState(0)
  const [manual, setManual] = useState(null) // { index, bgIndex } once someone picks
  const paused = manual !== null
  const N = PREVIEW_BACKDROPS.length
  const index = paused ? manual.index : Math.floor(step / N) % samples.length
  const bgIndex = paused ? manual.bgIndex : step % N
  const sample = samples[index]
  const bg = PREVIEW_BACKDROPS[bgIndex]
  const pick = (next) => setManual({ index, bgIndex, ...next })

  // Rotate the backdrop, and the photo after a full round, until someone interacts
  useEffect(() => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => setStep((s) => s + 1), 2600)
    return () => clearInterval(t)
  }, [paused])

  return (
    <div className={`card overflow-hidden shadow-deep ${className}`} onPointerDown={() => !paused && pick({})}>
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
        </div>
        <p className="truncate font-mono text-xs text-fg-3">{sample.slug}.jpg</p>
        <span className="chip chip-ok ml-auto !h-6"><CheckIcon size={12} /> Background removed</span>
      </div>

      <CompareSlider before={sample.original} beforeAlt={`${sample.label} sample, original`} ratio="4 / 3" autoplay={!paused}>
        <div className={`size-full transition-[background] duration-500 ${bg.type === 'transparent' ? 'checker' : ''}`} style={backdropStyle(bg)}>
          <img src={sample.cutout} alt={`${sample.label} sample with the background removed`} draggable={false} className="size-full object-contain" />
        </div>
      </CompareSlider>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
        <div className="segmented !p-1" role="group" aria-label="Sample photo">
          {samples.map((s, i) => (
            <button key={s.slug} aria-pressed={i === index} className="!h-7 !px-2.5 !text-xs" onClick={() => pick({ index: i })}>
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5" role="group" aria-label="Backdrop">
          {PREVIEW_BACKDROPS.map((b, i) => (
            <button
              key={i}
              aria-label={b.type === 'transparent' ? 'Transparent backdrop' : `Backdrop ${i}`}
              aria-pressed={i === bgIndex}
              onClick={() => pick({ bgIndex: i })}
              className={`size-6 rounded-full border border-line-strong transition-transform hover:scale-110 ${b.type === 'transparent' ? 'checker' : ''} ${i === bgIndex ? 'ring-2 ring-accent ring-offset-2 ring-offset-[var(--panel-solid)]' : ''}`}
              style={swatchStyle(b)}
            />
          ))}
          <SparklesIcon size={14} className="ml-1 text-accent-text" aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}

export default StudioPreview
