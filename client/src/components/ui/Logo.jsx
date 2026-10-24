import { useId } from 'react'
import { Link } from 'react-router-dom'

// The Clearcut mark: a tile split by a diagonal cut. The solid gradient side is the subject,
// the checkerboard side is the background that has been removed.
export const LogoMark = ({ size = 32, className = '' }) => {
  const id = useId().replace(/:/g, '')
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8fb0ff" />
          <stop offset=".45" stopColor="#3b6cff" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
        <pattern id={`c${id}`} width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" fill="var(--checker-a, #eef1f7)" />
          <rect width="4" height="4" fill="var(--checker-b, #c3cad8)" />
          <rect x="4" y="4" width="4" height="4" fill="var(--checker-b, #c3cad8)" />
        </pattern>
        <clipPath id={`r${id}`}>
          <rect width="32" height="32" rx="9" />
        </clipPath>
      </defs>
      <g clipPath={`url(#r${id})`}>
        <rect width="32" height="32" fill={`url(#c${id})`} />
        <path d="M0 0H23L11 32H0Z" fill={`url(#g${id})`} />
        <path d="M23 0L11 32" stroke="#fff" strokeOpacity=".9" strokeWidth="1.4" strokeDasharray="2.4 2" />
      </g>
      <rect x=".5" y=".5" width="31" height="31" rx="8.5" fill="none" stroke="var(--border-strong, rgba(0,0,0,.1))" />
    </svg>
  )
}

const Logo = ({ size = 30, to = '/', showText = true }) => (
  <Link to={to} className="inline-flex items-center gap-2.5 rounded-xl" aria-label="Clearcut home">
    <LogoMark size={size} />
    {showText && (
      <span className="text-[19px] font-semibold tracking-[-0.035em]">
        Clear<span className="gradient-text">cut</span>
      </span>
    )}
  </Link>
)

export default Logo
