import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ClockIcon, CopyIcon, CpuIcon, DownloadIcon, FileImageIcon, ImageIcon, PencilIcon, RulerIcon, StarIcon, Trash2Icon,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api, { errorMessage, fileUrl } from '../../config/api'
import CompareSlider from '../ui/CompareSlider'
import { ConfirmDialog } from '../ui/Modal'
import BackdropPicker from './BackdropPicker'
import { backdropStyle } from '../../lib/backgrounds'
import { blurRadius, composeImage, saveBlob, shadowFor } from '../../lib/compose'
import { formatBytes, timeAgo } from '../../lib/format'

const ENGINES = { local: 'On-device model', clipdrop: 'ClipDrop', removebg: 'remove.bg' }
const FORMATS = [
  { id: 'png', label: 'PNG' },
  { id: 'jpeg', label: 'JPG' },
  { id: 'webp', label: 'WebP' },
]
const SIZES = [
  { id: 'full', label: 'Full', max: null },
  { id: '1080', label: '1080 px', max: 1080 },
  { id: '512', label: '512 px', max: 512 },
]
const canCopy = typeof window !== 'undefined' && 'ClipboardItem' in window && Boolean(navigator.clipboard?.write)

// The cutout drawn over the chosen backdrop, exactly as the export renders it
const Composite = ({ image, backdrop, shadow, longest, customImage }) => {
  const s = shadowFor(longest)
  return (
    <div className={`relative size-full overflow-hidden ${backdrop.type === 'transparent' ? 'checker' : ''}`} style={backdropStyle(backdrop)}>
      {backdrop.type === 'blur' && (
        <img
          src={fileUrl(image.urls.original)}
          crossOrigin="anonymous"
          alt=""
          className="absolute inset-0 size-full scale-[1.06] object-cover"
          style={{ filter: `blur(${blurRadius(backdrop.strength, longest)}px)` }}
        />
      )}
      {backdrop.type === 'image' && customImage && <img src={customImage} alt="" className="absolute inset-0 size-full object-cover" />}
      <img
        src={fileUrl(image.urls.result)}
        crossOrigin="anonymous"
        alt={`${image.name} with the background removed`}
        draggable={false}
        className="relative size-full object-contain"
        style={shadow ? { filter: `drop-shadow(0 ${s.offsetY}px ${s.blur}px ${s.color})` } : undefined}
      />
    </div>
  )
}

const Editor = ({ image, onChange }) => {
  const navigate = useNavigate()
  const stage = useRef(null)
  const [frame, setFrame] = useState({ width: 0, height: 0 })
  const [view, setView] = useState('result')
  const [backdrop, setBackdrop] = useState({ type: 'transparent' })
  const [shadow, setShadow] = useState(false)
  const [customImage, setCustomImage] = useState(null)
  const [format, setFormat] = useState('png')
  const [size, setSize] = useState('full')
  const [exporting, setExporting] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(image.name)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Fit the image into the stage, keeping its aspect ratio
  useEffect(() => {
    const el = stage.current
    if (!el) return
    const fit = () => {
      const maxW = el.clientWidth - 32
      const maxH = Math.min(window.innerHeight * 0.64, 760)
      const scale = Math.min(maxW / image.width, maxH / image.height, 1.6)
      setFrame({ width: Math.round(image.width * scale), height: Math.round(image.height * scale) })
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    window.addEventListener('resize', fit)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', fit)
    }
  }, [image.width, image.height])

  // Release the local backdrop photo when it changes or the editor closes
  useEffect(() => () => customImage && URL.revokeObjectURL(customImage), [customImage])

  const sizes = useMemo(() => SIZES.filter((s) => !s.max || s.max < Math.max(image.width, image.height)), [image.width, image.height])
  const maxSide = SIZES.find((s) => s.id === size)?.max ?? null
  const plainCutout = backdrop.type === 'transparent' && !shadow && format === 'png' && !maxSide
  const longestOnScreen = Math.max(frame.width, frame.height)

  const pickCustomImage = (file) => {
    const url = URL.createObjectURL(file)
    setCustomImage(url)
    setBackdrop({ type: 'image', imageUrl: url })
  }

  const renderAs = (fmt) =>
    composeImage({
      cutoutUrl: fileUrl(image.urls.result),
      originalUrl: fileUrl(image.urls.original),
      backdrop: backdrop.type === 'image' ? { ...backdrop, imageUrl: customImage } : backdrop,
      shadow,
      maxSide,
      format: fmt,
    })

  const download = async () => {
    const ext = format === 'jpeg' ? 'jpg' : format
    setExporting(true)
    try {
      saveBlob(await renderAs(format), `${image.name}-clearcut.${ext}`)
      toast.success(`Saved ${image.name}-clearcut.${ext}`)
    } catch (err) {
      toast.error(errorMessage(err, 'Export failed'))
    } finally {
      setExporting(false)
    }
  }

  // ClipboardItem takes the pending blob, so the copy stays inside the click's user gesture
  const copy = async () => {
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': renderAs('png') })])
      toast.success('Copied to the clipboard')
    } catch {
      toast.error("Your browser didn't allow copying the image")
    }
  }

  const save = async (patch) => {
    try {
      const { data } = await api.patch(`/api/images/${image.id}`, patch)
      onChange(data.image)
      return true
    } catch (err) {
      toast.error(errorMessage(err))
      return false
    }
  }

  // Enter submits and the input's blur would submit again: only the first one counts
  const renameBusy = useRef(false)
  const submitName = async (e) => {
    e.preventDefault()
    if (renameBusy.current) return
    const next = name.trim()
    if (!next || next === image.name) {
      setName(image.name)
      setRenaming(false)
      return
    }
    renameBusy.current = true
    if (await save({ name: next })) toast.success('Renamed')
    else setName(image.name)
    renameBusy.current = false
    setRenaming(false)
  }

  const remove = async () => {
    setDeleting(true)
    try {
      await api.delete(`/api/images/${image.id}`)
      toast.success(`Deleted ${image.name}`)
      navigate('/studio', { replace: true })
    } catch (err) {
      toast.error(errorMessage(err))
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  const composite = <Composite image={image} backdrop={backdrop} shadow={shadow} longest={longestOnScreen} customImage={customImage} />

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] animate-fade-up">
      {/* Stage */}
      <section className="card flex min-w-0 flex-col p-3 sm:p-4" aria-label="Preview">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-3">
          <div className="segmented" role="group" aria-label="View">
            {['result', 'compare', 'original'].map((v) => (
              <button key={v} aria-pressed={view === v} onClick={() => setView(v)} className="capitalize">{v}</button>
            ))}
          </div>
          <span className="hidden text-xs text-fg-3 sm:block">{view === 'compare' ? 'Drag the handle or use ← →' : `${image.width} × ${image.height}`}</span>
        </div>
        <div ref={stage} className="grid min-h-[300px] flex-1 place-items-center rounded-[20px] bg-surface p-4">
          {frame.width > 0 && (
            <div className="relative overflow-hidden rounded-xl shadow-soft" style={frame}>
              {view === 'result' && composite}
              {view === 'original' && <img src={fileUrl(image.urls.original)} alt={`${image.name}, original`} className="size-full object-contain" />}
              {view === 'compare' && (
                <CompareSlider before={fileUrl(image.urls.original)} beforeAlt={`${image.name}, original`} className="!absolute inset-0">
                  {composite}
                </CompareSlider>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Inspector */}
      <aside className="card flex flex-col gap-6 p-5" aria-label="Edit and export">
        <div>
          {renaming ? (
            <form onSubmit={submitName} className="flex gap-2">
              <input
                className="input !h-10"
                value={name}
                maxLength={120}
                autoFocus
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && (setName(image.name), setRenaming(false))}
                onBlur={submitName}
                aria-label="Image name"
              />
            </form>
          ) : (
            <div className="flex items-start gap-1">
              <h1 className="min-w-0 flex-1 truncate text-xl font-semibold tracking-tight" title={image.name}>{image.name}</h1>
              <button className="icon-btn !size-8" onClick={() => setRenaming(true)} aria-label="Rename" data-tip="Rename"><PencilIcon size={15} /></button>
              <button
                className={`icon-btn !size-8 ${image.favorite ? '!text-amber-400' : ''}`}
                onClick={() => save({ favorite: !image.favorite })}
                aria-pressed={image.favorite}
                aria-label={image.favorite ? 'Remove from favourites' : 'Add to favourites'}
                data-tip={image.favorite ? 'Favourite' : 'Add to favourites'}
              >
                <StarIcon size={16} fill={image.favorite ? 'currentColor' : 'none'} />
              </button>
            </div>
          )}
          <ul className="mt-3 flex flex-wrap gap-1.5 text-fg-2">
            <li className="chip"><RulerIcon size={12} /> {image.width}×{image.height}</li>
            <li className="chip"><FileImageIcon size={12} /> PNG · {formatBytes(image.resultBytes)}</li>
            <li className="chip"><CpuIcon size={12} /> {ENGINES[image.provider] || image.provider} · {(image.durationMs / 1000).toFixed(1)} s</li>
            <li className="chip"><ClockIcon size={12} /> {timeAgo(image.createdAt)}</li>
          </ul>
        </div>

        <div>
          <p className="eyebrow mb-3">Backdrop</p>
          <BackdropPicker value={backdrop} onChange={setBackdrop} customImage={customImage} onCustomImage={pickCustomImage} />
          <label className="mt-4 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-line bg-surface px-3.5 py-2.5">
            <span className="text-sm">
              Drop shadow
              <span className="block text-xs text-fg-3">Grounds the subject on its new backdrop</span>
            </span>
            <input type="checkbox" className="peer sr-only" checked={shadow} onChange={(e) => setShadow(e.target.checked)} />
            <span className="relative h-6 w-10 shrink-0 rounded-full bg-surface-3 transition-colors peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-accent after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-4" aria-hidden="true" />
          </label>
        </div>

        <div>
          <p className="eyebrow mb-3">Export</p>
          <div className="grid gap-2">
            <div className="segmented w-full" role="group" aria-label="Format">
              {FORMATS.map((f) => (
                <button key={f.id} aria-pressed={format === f.id} className="flex-1 justify-center" onClick={() => setFormat(f.id)}>{f.label}</button>
              ))}
            </div>
            {sizes.length > 1 && (
              <div className="segmented w-full" role="group" aria-label="Size">
                {sizes.map((s) => (
                  <button key={s.id} aria-pressed={size === s.id} className="flex-1 justify-center" onClick={() => setSize(s.id)}>{s.label}</button>
                ))}
              </div>
            )}
          </div>
          {format === 'jpeg' && backdrop.type === 'transparent' && (
            <p className="mt-2 text-xs text-fg-3">JPG can't be transparent, so it gets a white backdrop.</p>
          )}
          <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
            {plainCutout ? (
              <a className="btn btn-primary" href={fileUrl(image.urls.result, { download: true })}>
                <DownloadIcon size={17} /> Download PNG
              </a>
            ) : (
              <button className="btn btn-primary" onClick={download} disabled={exporting}>
                {exporting ? <span className="spinner !size-4" /> : <DownloadIcon size={17} />}
                {exporting ? 'Rendering…' : `Download ${FORMATS.find((f) => f.id === format).label}`}
              </button>
            )}
            {canCopy && (
              <button className="btn btn-ghost !px-3" onClick={copy} aria-label="Copy image to the clipboard" data-tip="Copy as PNG">
                <CopyIcon size={17} />
              </button>
            )}
          </div>
          <a href={fileUrl(image.urls.original, { download: true })} className="mt-3 inline-flex items-center gap-1.5 text-xs text-fg-3 hover:text-fg">
            <ImageIcon size={13} /> Download the original ({formatBytes(image.originalBytes)})
          </a>
        </div>

        <button className="btn btn-ghost btn-sm mt-auto self-start !text-danger" onClick={() => setConfirmDelete(true)}>
          <Trash2Icon size={15} /> Delete
        </button>
      </aside>

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete “${image.name}”?`}
        text="The original and the cutout are removed from your library. Credits aren't refunded."
        confirmLabel="Delete"
        danger
        busy={deleting}
        onConfirm={remove}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  )
}

export default Editor
