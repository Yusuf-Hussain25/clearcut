import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { GalleryHorizontalEndIcon, PlusIcon, SearchIcon, SearchXIcon, StarIcon, XIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import api, { errorMessage } from '../config/api'
import ImageCard, { ImageCardSkeleton } from '../components/library/ImageCard'
import EmptyState from '../components/ui/EmptyState'
import { ConfirmDialog } from '../components/ui/Modal'
import { plural } from '../lib/format'

const Library = () => {
  const [images, setImages] = useState([])
  const [total, setTotal] = useState(0)
  const [nextCursor, setNextCursor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('') // debounced query
  const [favorites, setFavorites] = useState(false)
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const requestId = useRef(0)

  useEffect(() => {
    const t = setTimeout(() => setSearch(query.trim()), 250)
    return () => clearTimeout(t)
  }, [query])

  // Only the latest request may update the grid, so fast typing can't show stale results
  const load = useCallback(async (cursor = null) => {
    const id = ++requestId.current
    cursor ? setLoadingMore(true) : setLoading(true)
    try {
      const { data } = await api.get('/api/images', { params: { q: search || undefined, favorites: favorites ? 1 : undefined, cursor: cursor || undefined } })
      if (id !== requestId.current) return
      setImages((prev) => (cursor ? [...prev, ...data.images] : data.images))
      setTotal(data.total)
      setNextCursor(data.nextCursor)
      setError(null)
    } catch (err) {
      if (id !== requestId.current) return
      setError(errorMessage(err, 'Could not load your library'))
    } finally {
      if (id === requestId.current) {
        setLoading(false)
        setLoadingMore(false)
      }
    }
  }, [search, favorites])

  useEffect(() => {
    // Refetch when the search or filter changes; showing the skeleton right away is intended
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  const toggleFavorite = async (image) => {
    const favorite = !image.favorite
    setImages((list) => list.map((i) => (i.id === image.id ? { ...i, favorite } : i)))
    try {
      await api.patch(`/api/images/${image.id}`, { favorite })
      if (favorites && !favorite) {
        setImages((list) => list.filter((i) => i.id !== image.id))
        setTotal((t) => t - 1)
      }
    } catch (err) {
      setImages((list) => list.map((i) => (i.id === image.id ? { ...i, favorite: image.favorite } : i)))
      toast.error(errorMessage(err))
    }
  }

  const confirmDelete = async () => {
    setDeleting(true)
    try {
      await api.delete(`/api/images/${toDelete.id}`)
      setImages((list) => list.filter((i) => i.id !== toDelete.id))
      setTotal((t) => t - 1)
      toast.success(`Deleted ${toDelete.name}`)
      setToDelete(null)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setDeleting(false)
    }
  }

  const filtered = Boolean(search) || favorites
  const showEmpty = !loading && !error && images.length === 0

  return (
    <div className="animate-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Library</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Your cutouts</h1>
          <p className="mt-1.5 text-sm text-fg-3" aria-live="polite">
            {loading ? 'Loading…' : filtered ? `${plural(total, 'match', 'matches')}` : `${plural(total, 'cutout')} saved to your account`}
          </p>
        </div>
        <Link to="/studio" className="btn btn-primary"><PlusIcon size={17} /> New cutout</Link>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="input-wrap flex-1 sm:max-w-sm">
          <SearchIcon size={17} />
          <input className="input" type="search" placeholder="Search by name" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search your cutouts" />
        </div>
        <div className="segmented self-start" role="group" aria-label="Filter">
          <button aria-pressed={!favorites} onClick={() => setFavorites(false)}>All</button>
          <button aria-pressed={favorites} onClick={() => setFavorites(true)}><StarIcon size={14} /> Favourites</button>
        </div>
      </div>

      {error && (
        <div className="card mt-6 flex flex-wrap items-center justify-between gap-3 p-5" role="alert">
          <p className="text-sm text-fg-2">{error}</p>
          <button className="btn btn-ghost btn-sm" onClick={() => load()}>Try again</button>
        </div>
      )}

      {showEmpty && (
        <div className="card mt-6">
          {filtered ? (
            <EmptyState
              icon={favorites && !search ? StarIcon : SearchXIcon}
              title={favorites && !search ? 'No favourites yet' : `Nothing matches “${search}”`}
              text={favorites && !search ? 'Star a cutout to keep it here.' : 'Try another name, or clear the filters.'}
              action={<button className="btn btn-ghost btn-sm" onClick={() => { setQuery(''); setFavorites(false) }}><XIcon size={15} /> Clear filters</button>}
            />
          ) : (
            <EmptyState
              icon={GalleryHorizontalEndIcon}
              title="Your library is empty"
              text="Every photo you clean up in the studio is saved here, ready to download again."
              action={<Link to="/studio" className="btn btn-primary btn-sm"><PlusIcon size={15} /> Make your first cutout</Link>}
            />
          )}
        </div>
      )}

      <ul className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
        {loading
          ? Array.from({ length: 8 }, (_, i) => <ImageCardSkeleton key={i} />)
          : images.map((image) => <ImageCard key={image.id} image={image} onToggleFavorite={toggleFavorite} onDelete={setToDelete} />)}
      </ul>

      {!loading && nextCursor && (
        <div className="mt-8 flex justify-center">
          <button className="btn btn-ghost" onClick={() => load(nextCursor)} disabled={loadingMore}>
            {loadingMore && <span className="spinner !size-4" />} Load more
          </button>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title={`Delete “${toDelete?.name}”?`}
        text="The original and the cutout are removed from your library. Credits aren't refunded."
        confirmLabel="Delete"
        danger
        busy={deleting}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />
    </div>
  )
}

export default Library
