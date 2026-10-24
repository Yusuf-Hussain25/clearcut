import { MoonIcon, SunIcon } from 'lucide-react'
import { toggleTheme } from '../../lib/theme'
import { useTheme } from '../../hooks/useTheme'

const ThemeToggle = ({ className = '' }) => {
  const theme = useTheme()
  const next = theme === 'light' ? 'dark' : 'light'
  return (
    <button
      type="button"
      className={`icon-btn ${className}`}
      onClick={toggleTheme}
      aria-label={`Switch to ${next} theme`}
      data-tip={`${next === 'light' ? 'Light' : 'Dark'} theme`}
      data-tip-pos="bottom-end"
    >
      {theme === 'light' ? <MoonIcon size={18} /> : <SunIcon size={18} />}
    </button>
  )
}

export default ThemeToggle
