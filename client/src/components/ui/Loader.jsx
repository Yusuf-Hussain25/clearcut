import { LogoMark } from './Logo'

// Full-screen placeholder while Clerk loads the session
const Loader = ({ text = 'Loading' }) => (
  <div className="grid min-h-dvh place-items-center" role="status" aria-live="polite">
    <div className="flex flex-col items-center gap-4 animate-fade-up">
      <LogoMark size={44} className="animate-pulse" />
      <p className="text-sm text-fg-3">{text}…</p>
    </div>
  </div>
)

export default Loader
