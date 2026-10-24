import { Link } from 'react-router-dom'
import { DownloadIcon, StarIcon, Trash2Icon } from 'lucide-react'
import { fileUrl } from '../../config/api'
import { timeAgo } from '../../lib/format'

// One cutout in the library grid: thumbnail on the checkerboard, name, age and quick actions
const ImageCard = ({ image, onToggleFavorite, onDelete }) => (
  <li className="group card relative overflow-hidden !rounded-[22px] transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-soft animate-fade-up">
    <Link to={`/studio/${image.id}`} className="block rounded-[22px] focus-visible:outline-offset-[-2px]" aria-label={`Open ${image.name} in the studio`}>
      <div className="checker relative aspect-[4/3] overflow-hidden">
        <img
          src={fileUrl(image.urls.thumb)}
          alt=""
          loading="lazy"
          className="size-full object-contain p-3 transition-transform duration-500 group-hover:scale-[1.04]"
        />
      </div>
      <div className="flex items-center gap-2 px-3.5 pt-3 pb-3.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold" title={image.name}>{image.name}</p>
          <p className="mt-0.5 text-xs text-fg-3">
            {timeAgo(image.createdAt)} · {image.width}×{image.height}
          </p>
        </div>
      </div>
    </Link>

    {/* Quick actions: always visible on touch, on hover/focus with a mouse */}
    <div className="absolute top-2.5 right-2.5 flex gap-1 transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-focus-within:opacity-100 [@media(hover:hover)]:group-hover:opacity-100">
      <a
        href={fileUrl(image.urls.result, { download: true })}
        className="icon-btn glass !size-8 !rounded-lg !text-fg"
        aria-label={`Download ${image.name}`}
        data-tip="Download PNG"
      >
        <DownloadIcon size={15} />
      </a>
      <button className="icon-btn glass !size-8 !rounded-lg !text-fg" onClick={() => onDelete(image)} aria-label={`Delete ${image.name}`} data-tip="Delete">
        <Trash2Icon size={15} />
      </button>
    </div>
    <button
      className={`icon-btn glass absolute top-2.5 left-2.5 !size-8 !rounded-lg ${image.favorite ? '!text-amber-400' : '!text-fg [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-focus-within:opacity-100 [@media(hover:hover)]:group-hover:opacity-100'}`}
      onClick={() => onToggleFavorite(image)}
      aria-pressed={image.favorite}
      aria-label={image.favorite ? `Remove ${image.name} from favourites` : `Add ${image.name} to favourites`}
    >
      <StarIcon size={15} fill={image.favorite ? 'currentColor' : 'none'} />
    </button>
  </li>
)

export const ImageCardSkeleton = () => (
  <li className="card overflow-hidden !rounded-[22px]" aria-hidden="true">
    <div className="skeleton aspect-[4/3] !rounded-none" />
    <div className="space-y-2 px-3.5 pt-3 pb-4">
      <div className="skeleton h-3.5 w-2/3" />
      <div className="skeleton h-3 w-1/3" />
    </div>
  </li>
)

export default ImageCard
