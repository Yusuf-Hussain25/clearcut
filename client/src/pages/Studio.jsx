import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeftIcon, ArrowRightIcon, CoinsIcon, ImageOffIcon, PlusIcon, SparklesIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import api, { errorMessage, fileUrl } from '../config/api'
import { useAccount } from '../hooks/useAccount'
import Dropzone from '../components/studio/Dropzone'
import { ACCEPTED, MAX_MB } from '../lib/upload'
import ProcessingView from '../components/studio/ProcessingView'
import Editor from '../components/studio/Editor'
import EmptyState from '../components/ui/EmptyState'
import Modal from '../components/ui/Modal'
import { SAMPLES } from '../lib/samples'
import { timeAgo } from '../lib/format'

// Recent cutouts under the dropzone
const RecentStrip = () => {
  const [images, setImages] = useState(null)
  useEffect(() => {
    api.get('/api/images').then(({ data }) => setImages(data.images.slice(0, 6))).catch(() => setImages([]))
  }, [])
  if (images && images.length === 0) return null
  return (
    <section className="mt-10" aria-label="Recent cutouts">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold tracking-tight">Recent</h2>
        <Link to="/library" className="inline-flex items-center gap-1 text-sm text-fg-2 hover:text-fg">Library <ArrowRightIcon size={14} /></Link>
      </div>
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {images === null
          ? Array.from({ length: 6 }, (_, i) => <li key={i} className="skeleton aspect-square !rounded-2xl" />)
          : images.map((img) => (
              <li key={img.id}>
                <Link to={`/studio/${img.id}`} state={{ image: img }} className="group block" aria-label={`Open ${img.name}`}>
                  <div className="checker aspect-square overflow-hidden rounded-2xl border border-line transition-transform group-hover:-translate-y-0.5">
                    <img src={fileUrl(img.urls.thumb)} alt="" loading="lazy" className="size-full object-contain p-2" />
                  </div>
                  <p className="mt-1.5 truncate text-xs text-fg-2">{img.name}</p>
                  <p className="text-[11px] text-fg-3">{timeAgo(img.createdAt)}</p>
                </Link>
              </li>
            ))}
      </ul>
    </section>
  )
}

const EditorSkeleton = () => (
  <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]" aria-hidden="true">
    <div className="card p-4"><div className="skeleton h-9 w-56" /><div className="skeleton mt-4 h-[52vh] !rounded-[20px]" /></div>
    <div className="card space-y-4 p-5">
      <div className="skeleton h-6 w-2/3" />
      <div className="flex gap-2"><div className="skeleton h-6 w-20" /><div className="skeleton h-6 w-24" /><div className="skeleton h-6 w-16" /></div>
      <div className="skeleton mt-6 h-10" /><div className="skeleton h-20" /><div className="skeleton h-10" /><div className="skeleton h-11" />
    </div>
  </div>
)

const Studio = () => {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { credits, setCredits, refresh } = useAccount()
  const [job, setJob] = useState(null) // { file, preview, progress, stage }
  const [opened, setOpened] = useState({}) // id -> image, fetched or edited here
  const [loadErrors, setLoadErrors] = useState({}) // id -> message
  const [outOfCredits, setOutOfCredits] = useState(false)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  // The open image comes from the navigation state (after an upload or from a list) or is fetched
  const passed = location.state?.image?.id === id ? location.state.image : null
  const image = id ? opened[id] || passed : null
  const loadError = id ? loadErrors[id] : null
  const setImage = useCallback((img) => setOpened((o) => ({ ...o, [img.id]: img })), [])

  useEffect(() => {
    if (!id || image) return
    let cancelled = false
    api.get(`/api/images/${id}`)
      .then(({ data }) => !cancelled && setImage(data.image))
      .catch((err) => !cancelled && setLoadErrors((e) => ({ ...e, [id]: errorMessage(err, 'Could not open this image') })))
    return () => { cancelled = true }
  }, [id, image, setImage])

  const upload = useCallback(async (file) => {
    if (!ACCEPTED.includes(file.type)) return toast.error('Use a JPG, PNG, WebP or AVIF image')
    if (file.size > MAX_MB * 1024 * 1024) return toast.error(`That image is over ${MAX_MB} MB`)
    if (credits === 0) return setOutOfCredits(true)

    const preview = URL.createObjectURL(file)
    setJob({ file, preview, progress: 0, stage: 'uploading' })
    try {
      const form = new FormData()
      form.append('image', file)
      const { data } = await api.post('/api/images', form, {
        onUploadProgress: (e) => {
          const progress = e.total ? e.loaded / e.total : 0
          setJob((j) => j && { ...j, progress, stage: progress >= 1 ? 'processing' : 'uploading' })
        },
      })
      setCredits(data.credits)
      refresh()
      // The upload keeps going if you leave the studio; it just won't pull you back
      if (mounted.current) {
        toast.success('Background removed')
        navigate(`/studio/${data.image.id}`, { state: { image: data.image } })
      }
    } catch (err) {
      const body = err.response?.data
      if (typeof body?.credits === 'number') setCredits(body.credits)
      if (body?.code === 'NO_CREDITS') setOutOfCredits(true)
      else toast.error(errorMessage(err, 'Could not process that image'))
    } finally {
      URL.revokeObjectURL(preview)
      setJob(null)
    }
  }, [credits, navigate, refresh, setCredits])

  const trySample = async (sample) => {
    try {
      const res = await fetch(sample.original)
      const blob = await res.blob()
      upload(new File([blob], `${sample.slug}.jpg`, { type: 'image/jpeg' }))
    } catch {
      toast.error('Could not load the sample')
    }
  }

  let body
  if (job) {
    body = <ProcessingView job={job} />
  } else if (id) {
    body = loadError ? (
      <div className="card">
        <EmptyState
          icon={ImageOffIcon}
          title="This image isn't available"
          text={loadError}
          action={<Link to="/library" className="btn btn-ghost btn-sm"><ArrowLeftIcon size={15} /> Back to the library</Link>}
        />
      </div>
    ) : image ? (
      <Editor key={image.id} image={image} onChange={setImage} />
    ) : (
      <EditorSkeleton />
    )
  } else {
    body = (
      <>
        <Dropzone onFile={upload} disabled={credits === 0} disabledReason="You're out of credits. Top up to keep removing backgrounds." />
        {credits === 0 && (
          <div className="mt-4 flex justify-center">
            <Link to="/billing" className="btn btn-primary"><CoinsIcon size={17} /> Get more credits</Link>
          </div>
        )}
        <section className="mt-8" aria-label="Try a sample photo">
          <div className="mb-3 flex items-center gap-2">
            <SparklesIcon size={15} className="text-accent-text" />
            <h2 className="text-base font-semibold tracking-tight">No photo handy? Try one of ours</h2>
          </div>
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {SAMPLES.map((s) => (
              <li key={s.slug}>
                <button
                  className="group block w-full text-left disabled:opacity-60"
                  onClick={() => trySample(s)}
                  disabled={credits === 0}
                  aria-label={`Remove the background from the ${s.label.toLowerCase()} sample (uses 1 credit)`}
                >
                  <div className="aspect-square overflow-hidden rounded-2xl border border-line">
                    <img src={s.original} alt="" loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  </div>
                  <p className="mt-1.5 text-xs text-fg-2">{s.label}</p>
                </button>
              </li>
            ))}
          </ul>
        </section>
        <RecentStrip />
      </>
    )
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Studio</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
            {id && !job ? 'Edit and export' : 'Remove a background'}
          </h1>
        </div>
        {id && !job && (
          <Link to="/studio" className="btn btn-ghost"><PlusIcon size={17} /> New cutout</Link>
        )}
      </div>

      {body}

      <Modal open={outOfCredits} onClose={() => setOutOfCredits(false)} title="Out of credits">
        <span className="grid size-12 place-items-center rounded-2xl bg-warn/15 text-warn"><CoinsIcon size={22} /></span>
        <h2 className="mt-4 text-lg font-semibold tracking-tight">You're out of credits</h2>
        <p className="mt-1.5 text-sm text-fg-2">Each cutout uses one credit. Pick a pack to keep going; credits never expire.</p>
        <div className="mt-6 flex justify-end gap-2">
          <button className="btn btn-ghost btn-sm" onClick={() => setOutOfCredits(false)}>Not now</button>
          <Link to="/billing" className="btn btn-primary btn-sm" onClick={() => setOutOfCredits(false)}>See credit packs</Link>
        </div>
      </Modal>
    </div>
  )
}

export default Studio
