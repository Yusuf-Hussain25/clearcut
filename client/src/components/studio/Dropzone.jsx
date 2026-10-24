import { useEffect, useRef, useState } from 'react'
import { ClipboardPasteIcon, ImageUpIcon, LockIcon } from 'lucide-react'
import { ACCEPTED, MAX_MB } from '../../lib/upload'

// Drop, click or paste (Ctrl/Cmd+V anywhere on the page) to pick a photo
const Dropzone = ({ onFile, disabled = false, disabledReason }) => {
  const input = useRef(null)
  const [over, setOver] = useState(false)

  useEffect(() => {
    if (disabled) return
    const onPaste = (e) => {
      const file = [...(e.clipboardData?.files || [])].find((f) => f.type.startsWith('image/'))
      if (file) {
        e.preventDefault()
        onFile(file)
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [disabled, onFile])

  const onDrop = (e) => {
    e.preventDefault()
    setOver(false)
    if (disabled) return
    const file = [...e.dataTransfer.files].find((f) => f.type.startsWith('image/'))
    if (file) onFile(file)
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={`relative overflow-hidden rounded-[26px] border-2 border-dashed transition-[border-color,background,transform] duration-300 ${over ? 'scale-[1.01] border-accent bg-accent-soft' : 'border-line-strong bg-surface'} ${disabled ? 'opacity-70' : ''}`}
    >
      <div className="checker pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_center,#000_10%,transparent_70%)]" />
      <div className="relative flex flex-col items-center px-6 py-14 text-center sm:py-20">
        <span className={`grid size-16 place-items-center rounded-2xl text-white shadow-glow transition-transform duration-300 ${over ? 'scale-110' : ''}`} style={{ background: 'var(--accent-grad)' }}>
          {disabled ? <LockIcon size={26} /> : <ImageUpIcon size={28} />}
        </span>
        <h2 className="mt-5 text-xl font-semibold tracking-tight sm:text-2xl">{over ? 'Drop it here' : 'Drop a photo to remove its background'}</h2>
        <p className="mt-1.5 max-w-md text-sm text-fg-3">
          {disabled ? disabledReason : `JPG, PNG, WebP or AVIF up to ${MAX_MB} MB. Each cutout uses one credit.`}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button className="btn btn-primary btn-lg" onClick={() => input.current?.click()} disabled={disabled}>
            <ImageUpIcon size={18} /> Choose a photo
          </button>
          <span className="hidden items-center gap-1.5 text-xs text-fg-3 sm:inline-flex">
            <ClipboardPasteIcon size={14} /> or paste with <kbd className="kbd">Ctrl</kbd>+<kbd className="kbd">V</kbd>
          </span>
        </div>
        <input
          ref={input}
          type="file"
          accept={ACCEPTED.join(',')}
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = '' // picking the same file again should still trigger
            if (file) onFile(file)
          }}
        />
      </div>
    </div>
  )
}

export default Dropzone
