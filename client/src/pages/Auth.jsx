import { useState } from 'react'
import { SignIn, SignUp, useClerk, useUser } from '@clerk/react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeftIcon, GalleryHorizontalEndIcon, PaletteIcon, ShieldCheckIcon, SparklesIcon, WandSparklesIcon, ZapIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import Logo from '../components/ui/Logo'
import ThemeToggle from '../components/ui/ThemeToggle'
import StudioPreview from '../components/marketing/StudioPreview'
import api, { errorMessage } from '../config/api'

// Shows the demo button; the server issues the actual sign-in ticket
const DEMO_ENABLED = Boolean(import.meta.env.VITE_DEMO_EMAIL)

const FEATURES = [
  { icon: ZapIcon, title: 'Seconds, not minutes', text: 'Drop, paste or pick a photo and get a clean cutout in a few seconds.' },
  { icon: PaletteIcon, title: 'New backdrops', text: 'Solid colours, gradients, a blurred original or your own image.' },
  { icon: GalleryHorizontalEndIcon, title: 'A library of cutouts', text: 'Every result is saved: search, favourite and download again any time.' },
  { icon: WandSparklesIcon, title: 'Export your way', text: 'PNG with transparency, JPG or WebP, at full size or social sizes.' },
]

// Clerk renders its own form; we hide its header and frame it in our glass card.
const embedded = {
  elements: {
    header: { display: 'none' },
    rootBox: { width: '100%' },
  },
}

const Auth = ({ mode = 'login' }) => {
  const isRegister = mode === 'register'
  const { isLoaded, isSignedIn } = useUser()
  const clerk = useClerk()
  const navigate = useNavigate()
  const [demoLoading, setDemoLoading] = useState(false)

  if (isLoaded && isSignedIn) {
    return <Navigate to="/studio" replace />
  }

  const signInAsDemo = async () => {
    if (!clerk.loaded) return
    setDemoLoading(true)
    try {
      const { data } = await api.post('/api/demo/session')
      const attempt = await clerk.client.signIn.create({ strategy: 'ticket', ticket: data.ticket })
      if (attempt.status !== 'complete') {
        throw new Error('The demo account needs an extra verification step. Use the form instead.')
      }
      await clerk.setActive({ session: attempt.createdSessionId })
      toast.success('Signed in to the demo account')
      navigate('/studio', { replace: true })
    } catch (err) {
      toast.error(err.errors?.[0]?.longMessage || errorMessage(err, 'Could not open the demo account'))
    } finally {
      setDemoLoading(false)
    }
  }

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-5 sm:px-8">
        <Logo />
        <div className="flex items-center gap-1">
          <Link to="/" className="btn btn-ghost btn-sm hidden sm:inline-flex"><ArrowLeftIcon size={15} /> Home</Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Mobile order: headline, auth card, preview. Desktop: hero left, card right. */}
      <main className="mx-auto grid w-full max-w-7xl gap-8 px-4 pb-14 sm:px-8 lg:grid-cols-[1.12fr_1fr] lg:gap-x-14 lg:pt-4">
        <section className="min-w-0 animate-fade-up lg:col-start-1 lg:row-start-1">
          <span className="chip chip-accent"><SparklesIcon size={13} /> Free to start, no watermark</span>
          <h1 className="mt-5 text-[40px] leading-[1.04] font-semibold tracking-[-0.045em] sm:text-[54px]">
            Cut out anything.<br className="hidden sm:block" /> <span className="gradient-text">Keep only the subject.</span>
          </h1>
          <p className="mt-4 max-w-xl text-base text-fg-2 sm:text-lg">
            Remove the background from people, products and pets in seconds, then drop in a new backdrop and export a ready-to-post image.
          </p>
        </section>

        <section className="min-w-0 animate-fade-up [animation-delay:.08s] lg:sticky lg:top-6 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
          <div className="card mx-auto w-full max-w-[460px] p-5 shadow-deep sm:p-7">
            <div className="segmented mb-6 w-full" role="group" aria-label="Choose log in or sign up">
              <button aria-pressed={!isRegister} className="flex-1 justify-center" onClick={() => navigate('/login', { replace: true })}>Log in</button>
              <button aria-pressed={isRegister} className="flex-1 justify-center" onClick={() => navigate('/register', { replace: true })}>Sign up</button>
            </div>

            <h2 className="text-2xl font-semibold tracking-tight">{isRegister ? 'Create your account' : 'Welcome back'}</h2>
            <p className="mt-1 text-sm text-fg-3">
              {isRegister ? 'Start with 5 free credits, no card needed.' : 'Log in to open your studio and library.'}
            </p>

            <div className="mt-5 min-h-[300px]">
              {!isLoaded && (
                <div className="space-y-3" aria-hidden="true">
                  <div className="skeleton h-11" />
                  <div className="skeleton mx-auto h-3 w-16" />
                  <div className="skeleton h-11" />
                  <div className="skeleton h-11" />
                  <div className="skeleton h-11" />
                </div>
              )}
              {isRegister ? (
                <SignUp routing="path" path="/register" signInUrl="/login" fallbackRedirectUrl="/studio" appearance={embedded} />
              ) : (
                <SignIn routing="path" path="/login" signUpUrl="/register" fallbackRedirectUrl="/studio" appearance={embedded} />
              )}
            </div>

            {DEMO_ENABLED && (
              <>
                <div className="my-5 flex items-center gap-3 text-xs text-fg-3">
                  <span className="h-px flex-1 bg-line-strong" /> or <span className="h-px flex-1 bg-line-strong" />
                </div>
                <button className="btn btn-ghost btn-block" onClick={signInAsDemo} disabled={demoLoading || !isLoaded}>
                  {demoLoading ? <span className="spinner" /> : <SparklesIcon size={17} className="text-accent-text" />}
                  {demoLoading ? 'Opening demo…' : 'Explore with a demo account'}
                </button>
              </>
            )}

            <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-fg-3">
              <ShieldCheckIcon size={13} /> Your photos are private to your account
            </p>
          </div>
        </section>

        <section className="flex min-w-0 flex-col gap-8 animate-fade-up [animation-delay:.12s] lg:col-start-1 lg:row-start-2">
          <StudioPreview />

          <ul className="grid gap-3 sm:grid-cols-2">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="card flex gap-3 rounded-[20px] p-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-text"><Icon size={17} /></span>
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="mt-0.5 text-[13px] leading-snug text-fg-3">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  )
}

export default Auth
