import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@clerk/react'
import {
  ArrowRightIcon, BadgeCheckIcon, BlendIcon, CheckIcon, ClipboardPasteIcon, DownloadIcon, GalleryHorizontalEndIcon,
  ImageUpIcon, LockKeyholeIcon, PaletteIcon, ScanIcon, SparklesIcon, ZapIcon,
} from 'lucide-react'
import Logo from '../components/ui/Logo'
import ThemeToggle from '../components/ui/ThemeToggle'
import StudioPreview from '../components/marketing/StudioPreview'
import { SAMPLES } from '../lib/samples'
import { GRADIENTS, gradientCss } from '../lib/backgrounds'
import { formatMoney } from '../lib/format'
import api from '../config/api'

const DEMO_ENABLED = Boolean(import.meta.env.VITE_DEMO_EMAIL)

const STEPS = [
  { icon: ImageUpIcon, title: 'Drop a photo', text: 'Drag it in, pick a file or paste a screenshot. JPG, PNG, WebP or AVIF.' },
  { icon: ScanIcon, title: 'Clearcut finds the subject', text: 'People, products, cars and plants are cut out in a few seconds.' },
  { icon: DownloadIcon, title: 'Style and export', text: 'Keep it transparent or add a backdrop, then download in the size you need.' },
]

const FEATURES = [
  { icon: ZapIcon, title: 'Fast cutouts', text: 'A segmentation model trained for clean edges on people and products, usually done in 2 to 6 seconds.' },
  { icon: PaletteIcon, title: 'Backdrops in one click', text: 'Solid colours, gradients, your own photo, or the original scene blurred like portrait mode.' },
  { icon: BlendIcon, title: 'Before / after', text: 'Drag the compare slider to check every edge against the original.' },
  { icon: GalleryHorizontalEndIcon, title: 'Your library', text: 'Every cutout is saved to your account: search, favourite, rename and download again later.' },
  { icon: ClipboardPasteIcon, title: 'Paste and copy', text: 'Paste a screenshot straight in, and copy the result back to your clipboard.' },
  { icon: LockKeyholeIcon, title: 'Private by default', text: 'Your photos are only reachable through short-lived signed links tied to your account.' },
]

const FAQ = [
  ['Is it really free to start?', 'Yes. Every new account gets 5 credits, no card needed. One credit is one cutout, and editing or re-downloading a cutout is always free.'],
  ['Do downloads have a watermark?', 'No. Every export is full quality with no watermark, whether you started on free credits or a pack.'],
  ['What formats can I export?', 'PNG and WebP keep transparency; JPG gets a backdrop. You can export at full size, 1080 px or 512 px.'],
  ['Do credits expire?', 'No. Credit packs are a one-time payment and stay on your account until you use them.'],
  ['What photos work best?', 'A clear subject with some contrast against the background: portraits, products, cars, plants. Very fine fur or transparent objects are the hardest cases.'],
]

const SHOWCASE_BACKDROPS = [
  { background: '#f4f1ea' },
  { background: gradientCss(GRADIENTS[0]) },
  { background: '#0b1020' },
  { background: gradientCss(GRADIENTS[2]) },
  { background: gradientCss(GRADIENTS[3]) },
  { background: '#3b6cff' },
]

const Landing = () => {
  const { isSignedIn } = useAuth()
  const [plans, setPlans] = useState(null)
  const start = isSignedIn ? '/studio' : '/register'

  useEffect(() => {
    api.get('/api/billing/plans').then(({ data }) => setPlans(data.plans)).catch(() => setPlans([]))
  }, [])

  return (
    <div className="min-h-dvh">
      <header className="glass sticky top-0 z-30 border-x-0 border-t-0">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-8">
          <Logo />
          <nav className="ml-8 hidden items-center gap-1 md:flex" aria-label="Sections">
            {[['#how', 'How it works'], ['#features', 'Features'], ['#pricing', 'Pricing'], ['#faq', 'FAQ']].map(([href, label]) => (
              <a key={href} href={href} className="rounded-lg px-3 py-1.5 text-sm text-fg-2 transition-colors hover:bg-surface-2 hover:text-fg">{label}</a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1.5">
            <ThemeToggle />
            {isSignedIn ? (
              <Link to="/studio" className="btn btn-primary btn-sm">Open studio <ArrowRightIcon size={15} /></Link>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost btn-sm hidden sm:inline-flex">Log in</Link>
                <Link to="/register" className="btn btn-primary btn-sm">Get started</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid w-full max-w-7xl items-center gap-10 px-4 pt-12 pb-16 sm:px-8 lg:grid-cols-[1fr_1.05fr] lg:pt-20">
          <div className="min-w-0 animate-fade-up">
            <span className="chip chip-accent"><SparklesIcon size={13} /> New in 2.0: backdrops, blur and a library</span>
            <h1 className="mt-5 text-[44px] leading-[1.02] font-semibold tracking-[-0.05em] sm:text-[64px]">
              Remove the background.<br /><span className="gradient-text">Keep the moment.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base text-fg-2 sm:text-lg">
              Clearcut cuts people, products and pets out of any photo in seconds. Download a transparent PNG or drop in a new backdrop, ready for your shop, profile or slides.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={start} className="btn btn-primary btn-lg"><ImageUpIcon size={18} /> Remove a background</Link>
              {!isSignedIn && DEMO_ENABLED && <Link to="/login" className="btn btn-ghost btn-lg">Explore the demo</Link>}
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-fg-3">
              {['5 free credits', 'No watermark', 'PNG, JPG and WebP'].map((t) => (
                <li key={t} className="flex items-center gap-1.5"><BadgeCheckIcon size={16} className="text-accent-text" /> {t}</li>
              ))}
            </ul>
          </div>
          <div className="min-w-0 animate-fade-up [animation-delay:.1s]">
            <StudioPreview />
          </div>
        </section>

        {/* Showcase */}
        <section className="mx-auto w-full max-w-7xl px-4 sm:px-8" aria-label="Examples">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {SAMPLES.map((s, i) => (
              <li key={s.slug} className="group card relative aspect-[4/5] overflow-hidden !rounded-[22px]" style={SHOWCASE_BACKDROPS[i]}>
                <img src={s.original} alt="" loading="lazy" className="absolute inset-0 size-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                <img src={s.cutout} alt={`${s.label} cut out by Clearcut`} loading="lazy" className="relative size-full object-contain p-4 drop-shadow-[0_14px_20px_rgba(0,0,0,.28)] transition-opacity duration-500 group-hover:opacity-0" />
                <span className="absolute bottom-2.5 left-2.5 rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">{s.label}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-center text-xs text-fg-3">Hover a photo to see the original. Every cutout on this page was made by Clearcut.</p>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto w-full max-w-7xl scroll-mt-20 px-4 pt-24 sm:px-8">
          <p className="eyebrow text-center">How it works</p>
          <h2 className="mt-2 text-center text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Three steps, a few seconds</h2>
          <ol className="mt-10 grid gap-4 md:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="card relative p-6">
                <span className="absolute top-5 right-6 font-mono text-5xl font-semibold text-surface-3">{i + 1}</span>
                <span className="grid size-11 place-items-center rounded-2xl text-white shadow-glow" style={{ background: 'var(--accent-grad)' }}><Icon size={20} /></span>
                <h3 className="mt-5 text-lg font-semibold tracking-tight">{title}</h3>
                <p className="mt-1.5 text-sm text-fg-3">{text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto w-full max-w-7xl scroll-mt-20 px-4 pt-24 sm:px-8">
          <p className="eyebrow text-center">Features</p>
          <h2 className="mt-2 text-center text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Everything after the cutout, too</h2>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="card p-6 transition-transform duration-300 hover:-translate-y-0.5">
                <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent-text"><Icon size={19} /></span>
                <h3 className="mt-4 font-semibold tracking-tight">{title}</h3>
                <p className="mt-1.5 text-sm text-fg-3">{text}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Pricing */}
        <section id="pricing" className="mx-auto w-full max-w-7xl scroll-mt-20 px-4 pt-24 sm:px-8">
          <p className="eyebrow text-center">Pricing</p>
          <h2 className="mt-2 text-center text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Pay per cutout. No subscription.</h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-fg-3">Start with 5 free credits. Top up with a pack when you need more; credits never expire.</p>
          {plans === null && (
            <div className="mt-10 grid gap-4 md:grid-cols-3" aria-hidden="true">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-64 !rounded-[28px]" />)}</div>
          )}
          {plans?.length > 0 && (
            <ul className="mt-10 grid gap-4 md:grid-cols-3">
              {plans.map((p) => (
                <li key={p.id} className={`card flex flex-col p-6 ${p.popular ? 'shadow-glow' : ''}`}>
                  <p className="flex items-center justify-between text-sm font-semibold text-fg-2">
                    {p.name}
                    {p.popular && <span className="chip chip-accent">Most popular</span>}
                  </p>
                  <p className="mt-3 text-4xl font-semibold tracking-[-0.04em]">{formatMoney(p.amount, p.currency)}</p>
                  <p className="mt-1 text-sm"><span className="font-semibold">{p.credits.toLocaleString()} credits</span> <span className="text-fg-3">· {formatMoney(Math.round(p.amount / p.credits), p.currency)} each</span></p>
                  <p className="mt-3 flex-1 text-sm text-fg-3">{p.blurb}</p>
                  <Link to={start} className={`btn mt-6 ${p.popular ? 'btn-primary' : 'btn-ghost'}`}>Start with 5 free credits</Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto w-full max-w-3xl scroll-mt-20 px-4 pt-24 sm:px-8">
          <h2 className="text-center text-3xl font-semibold tracking-[-0.035em]">Questions</h2>
          <div className="mt-8 space-y-2">
            {FAQ.map(([q, a]) => (
              <details key={q} className="card group !rounded-2xl px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                  {q}
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-2 text-fg-2 transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <p className="mt-2 text-sm text-fg-2">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Closing CTA */}
        <section className="mx-auto w-full max-w-7xl px-4 pt-24 sm:px-8">
          <div className="card relative overflow-hidden px-6 py-14 text-center">
            <div className="checker pointer-events-none absolute inset-0 opacity-30 [mask-image:radial-gradient(ellipse_at_center,#000,transparent_70%)]" />
            <h2 className="relative text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Your next cutout is a few seconds away</h2>
            <p className="relative mt-3 text-fg-3">No card, no watermark. Just drop a photo.</p>
            <Link to={start} className="btn btn-primary btn-lg relative mt-7">Start for free <ArrowRightIcon size={18} /></Link>
            <ul className="relative mt-6 flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs text-fg-3">
              {['Private signed links', 'Library of every cutout', 'Credits never expire'].map((t) => <li key={t} className="flex items-center gap-1"><CheckIcon size={13} /> {t}</li>)}
            </ul>
          </div>
        </section>
      </main>

      <footer className="mx-auto mt-20 flex w-full max-w-7xl flex-col gap-4 border-t border-line px-4 py-8 text-sm text-fg-3 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <Logo size={24} />
        <p>© 2026 Clearcut · Built by <a href="https://github.com/Yusuf-Hussain25" className="text-fg-2 hover:text-fg">Yusuf Hussain</a></p>
        <p>Sample photos from <a href="https://github.com/Yusuf-Hussain25/clearcut#credits" className="text-fg-2 hover:text-fg">Wikimedia Commons</a></p>
      </footer>
    </div>
  )
}

export default Landing
