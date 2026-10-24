import { useState } from 'react'

const initials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('') || '?'

// Hue picked from the name, so the same person always gets the same colour
const hue = (name = '') => [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 210)

const Avatar = ({ name, src, size = 36, online = false }) => {
  const [broken, setBroken] = useState(false)
  const showImage = src && !broken
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      {showImage ? (
        <img src={src} alt="" className="size-full rounded-full object-cover" onError={() => setBroken(true)} />
      ) : (
        <span
          className="grid size-full place-items-center rounded-full font-semibold text-white"
          style={{ background: `linear-gradient(135deg, hsl(${hue(name)} 70% 58%), hsl(${(hue(name) + 40) % 360} 70% 44%))`, fontSize: size * 0.38 }}
          aria-hidden="true"
        >
          {initials(name)}
        </span>
      )}
      {online && (
        <span
          className="absolute right-0 bottom-0 rounded-full bg-ok ring-2 ring-[var(--bg)]"
          style={{ width: size * 0.28, height: size * 0.28 }}
          aria-label="Online"
        />
      )}
    </span>
  )
}

export default Avatar
