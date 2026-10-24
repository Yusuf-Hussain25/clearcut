import { useRef } from 'react'
import { ImagePlusIcon, PipetteIcon } from 'lucide-react'
import { GRADIENTS, SOLIDS, gradientCss } from '../../lib/backgrounds'

const TABS = [
  { id: 'transparent', label: 'None' },
  { id: 'color', label: 'Colour' },
  { id: 'gradient', label: 'Gradient' },
  { id: 'blur', label: 'Blur' },
  { id: 'image', label: 'Image' },
]

const Swatch = ({ selected, label, style, className = '', onClick }) => (
  <button
    type="button"
    aria-label={label}
    aria-pressed={selected}
    onClick={onClick}
    className={`size-9 rounded-xl border border-line-strong transition-transform hover:scale-110 ${selected ? 'ring-2 ring-accent ring-offset-2 ring-offset-[var(--panel-solid)]' : ''} ${className}`}
    style={style}
  />
)

// Picks what goes behind the cutout: nothing, a colour, a gradient, the blurred original or a photo
const BackdropPicker = ({ value, onChange, customImage, onCustomImage }) => {
  const fileInput = useRef(null)
  const setType = (type) => {
    if (type === 'transparent') onChange({ type })
    if (type === 'color') onChange({ type, color: value.color || SOLIDS[0] })
    if (type === 'gradient') onChange({ type, gradient: value.gradient || GRADIENTS[0] })
    if (type === 'blur') onChange({ type, strength: value.strength || 1.6 })
    if (type === 'image') customImage ? onChange({ type, imageUrl: customImage }) : fileInput.current?.click()
  }

  return (
    <div>
      <div className="segmented flex w-full overflow-x-auto" role="group" aria-label="Backdrop type">
        {TABS.map((t) => (
          <button key={t.id} aria-pressed={value.type === t.id} className="flex-1 justify-center !px-2" onClick={() => setType(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 min-h-[88px]">
        {value.type === 'transparent' && (
          <p className="text-sm text-fg-3">Transparent background. Download as PNG or WebP to keep it.</p>
        )}

        {value.type === 'color' && (
          <div className="flex flex-wrap gap-2">
            {SOLIDS.map((c) => (
              <Swatch key={c} label={`Colour ${c}`} selected={value.color === c} style={{ background: c }} onClick={() => onChange({ type: 'color', color: c })} />
            ))}
            <label className="relative grid size-9 cursor-pointer place-items-center rounded-xl border border-line-strong bg-surface text-fg-2 transition-transform hover:scale-110" data-tip="Custom colour">
              <PipetteIcon size={16} />
              <input
                type="color"
                className="absolute inset-0 cursor-pointer opacity-0"
                value={value.color || '#ffffff'}
                onChange={(e) => onChange({ type: 'color', color: e.target.value })}
                aria-label="Pick a custom colour"
              />
            </label>
          </div>
        )}

        {value.type === 'gradient' && (
          <div className="flex flex-wrap gap-2">
            {GRADIENTS.map((g) => (
              <Swatch key={g.id} label={`${g.id} gradient`} selected={value.gradient?.id === g.id} style={{ background: gradientCss(g) }} onClick={() => onChange({ type: 'gradient', gradient: g })} />
            ))}
          </div>
        )}

        {value.type === 'blur' && (
          <div>
            <div className="flex items-center justify-between text-sm">
              <label htmlFor="blur-strength" className="text-fg-2">Blur strength</label>
              <span className="font-mono text-xs text-fg-3">{value.strength.toFixed(1)}</span>
            </div>
            <input
              id="blur-strength"
              type="range"
              min="0.4"
              max="4"
              step="0.1"
              value={value.strength}
              onChange={(e) => onChange({ type: 'blur', strength: Number(e.target.value) })}
              className="mt-2 w-full accent-[var(--accent)]"
            />
            <p className="mt-1 text-xs text-fg-3">Portrait mode: the original scene, softly out of focus.</p>
          </div>
        )}

        {value.type === 'image' && (
          <div className="flex items-center gap-3">
            {customImage && <img src={customImage} alt="Your backdrop" className="size-14 rounded-xl border border-line object-cover" />}
            <button className="btn btn-ghost btn-sm" onClick={() => fileInput.current?.click()}>
              <ImagePlusIcon size={15} /> {customImage ? 'Change photo' : 'Choose a photo'}
            </button>
          </div>
        )}
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) onCustomImage(file)
        }}
      />
      <p className="mt-2 text-[11px] text-fg-3">Backdrops are applied in your browser and never uploaded.</p>
    </div>
  )
}

export default BackdropPicker
