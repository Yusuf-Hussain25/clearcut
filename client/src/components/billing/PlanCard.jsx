import { CheckIcon, CreditCardIcon, SparklesIcon, WalletIcon } from 'lucide-react'
import { formatMoney } from '../../lib/format'

const PERKS = ['Transparent PNG, JPG and WebP exports', 'Backdrops, blur and shadows', 'Credits never expire']

// A credit pack. `onBuy(provider)` starts checkout; `busy` is the provider currently loading.
const PlanCard = ({ plan, providers, onBuy, busy, blockedReason }) => {
  const perCredit = formatMoney(Math.round(plan.amount / plan.credits), plan.currency)
  const anyProvider = providers.stripe || providers.razorpay
  const disabled = Boolean(busy) || Boolean(blockedReason) || !anyProvider

  return (
    <li className={`card relative flex flex-col p-6 ${plan.popular ? 'shadow-glow' : ''}`}>
      {plan.popular && (
        <span className="chip absolute -top-3 left-6 !border-0 !text-white" style={{ background: 'var(--accent-grad)' }}>
          <SparklesIcon size={12} /> Most popular
        </span>
      )}
      <p className="text-sm font-semibold text-fg-2">{plan.name}</p>
      <p className="mt-3 flex items-baseline gap-1.5">
        <span className="text-4xl font-semibold tracking-[-0.04em]">{formatMoney(plan.amount, plan.currency)}</span>
        <span className="text-sm text-fg-3">one-time</span>
      </p>
      <p className="mt-1 text-sm">
        <span className="font-semibold">{plan.credits.toLocaleString()} credits</span>
        <span className="text-fg-3"> · {perCredit} per cutout</span>
      </p>
      <p className="mt-3 text-sm text-fg-3">{plan.blurb}</p>

      <ul className="mt-5 space-y-2 text-sm text-fg-2">
        {PERKS.map((p) => (
          <li key={p} className="flex gap-2"><CheckIcon size={16} className="mt-0.5 shrink-0 text-accent-text" /> {p}</li>
        ))}
      </ul>

      <div className="mt-6 grid gap-2 pt-1 [&>*]:w-full">
        {providers.stripe && (
          <button className={`btn ${plan.popular ? 'btn-primary' : 'btn-mono'}`} onClick={() => onBuy('stripe')} disabled={disabled}>
            {busy === 'stripe' ? <span className="spinner !size-4" /> : <CreditCardIcon size={17} />} Pay by card
          </button>
        )}
        {providers.razorpay && (
          <button className={`btn ${providers.stripe || !plan.popular ? 'btn-ghost' : 'btn-primary'}`} onClick={() => onBuy('razorpay')} disabled={disabled}>
            {busy === 'razorpay' ? <span className="spinner !size-4" /> : <WalletIcon size={17} />} UPI, cards & more (Razorpay)
          </button>
        )}
        {!anyProvider && (
          <button className="btn btn-ghost" disabled>
            <CreditCardIcon size={17} /> Checkout not configured
          </button>
        )}
      </div>
    </li>
  )
}

export const PlanCardSkeleton = () => (
  <li className="card space-y-3 p-6" aria-hidden="true">
    <div className="skeleton h-4 w-20" />
    <div className="skeleton h-10 w-32" />
    <div className="skeleton h-4 w-40" />
    <div className="skeleton h-16" />
    <div className="skeleton h-11" />
  </li>
)

export default PlanCard
