import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { UserButton } from '@clerk/react'
import { CoinsIcon, CreditCardIcon, GalleryHorizontalEndIcon, ScissorsIcon, SparklesIcon } from 'lucide-react'
import Logo from './ui/Logo'
import ThemeToggle from './ui/ThemeToggle'
import { useAccount } from '../hooks/useAccount'

const NAV = [
  { to: '/studio', label: 'Studio', icon: ScissorsIcon },
  { to: '/library', label: 'Library', icon: GalleryHorizontalEndIcon },
  { to: '/billing', label: 'Billing', icon: CreditCardIcon },
]

const CreditsPill = () => {
  const { credits } = useAccount()
  const low = credits !== null && credits <= 2
  return (
    <NavLink
      to="/billing"
      className={`chip !h-9 !gap-2 !px-3 !text-[13px] transition-colors hover:border-line-strong ${low ? 'chip-warn' : ''}`}
      aria-label={credits === null ? 'Credits loading' : `${credits} credits left. Buy more`}
    >
      <CoinsIcon size={15} className={low ? '' : 'text-accent-text'} />
      {credits === null ? <span className="skeleton h-3 w-6" /> : <span className="font-mono font-semibold tabular-nums">{credits.toLocaleString()}</span>}
      <span className="hidden sm:inline">credits</span>
    </NavLink>
  )
}

// Signed-in shell: glass top bar on every size, plus an app-style tab bar on phones
const AppLayout = () => {
  const { isDemo } = useAccount()
  const { pathname } = useLocation()
  const isActive = (to) => pathname === to || pathname.startsWith(`${to}/`)

  return (
    <div className="min-h-dvh pb-24 md:pb-10">
      <header className="glass sticky top-0 z-30 border-x-0 border-t-0">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-8">
          <Logo to="/studio" />
          {isDemo && <span className="chip chip-accent hidden lg:inline-flex"><SparklesIcon size={12} /> Demo account</span>}

          <nav className="ml-6 hidden items-center gap-1 md:flex" aria-label="Main">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={`inline-flex h-9 items-center gap-2 rounded-xl px-3 text-sm font-medium transition-colors ${isActive(to) ? 'bg-surface-3 text-fg' : 'text-fg-2 hover:bg-surface-2 hover:text-fg'}`}
              >
                <Icon size={16} /> {label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            <CreditsPill />
            <ThemeToggle />
            <div className="ml-1 grid size-9 place-items-center">
              <UserButton appearance={{ elements: { avatarBox: { width: 32, height: 32 } } }} />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 pt-6 sm:px-8 sm:pt-8">
        <Outlet />
      </main>

      <nav className="glass fixed inset-x-3 bottom-3 z-30 grid grid-cols-3 rounded-2xl p-1.5 shadow-deep md:hidden" aria-label="Main">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={`flex flex-col items-center gap-0.5 rounded-xl py-2 text-[11px] font-medium transition-colors ${isActive(to) ? 'bg-accent-soft text-accent-text' : 'text-fg-3'}`}
          >
            <Icon size={19} /> {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export default AppLayout
