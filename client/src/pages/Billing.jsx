import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CoinsIcon, CreditCardIcon, GaugeIcon, ImagesIcon, InfoIcon, ReceiptTextIcon, ShoppingBagIcon, WalletIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import api, { errorMessage } from '../config/api'
import { useAccount } from '../hooks/useAccount'
import PlanCard, { PlanCardSkeleton } from '../components/billing/PlanCard'
import UsageChart from '../components/billing/UsageChart'
import EmptyState from '../components/ui/EmptyState'
import { loadRazorpay } from '../lib/razorpay'
import { formatDate, formatMoney, plural } from '../lib/format'

const STATUS = {
  paid: 'chip-ok',
  failed: 'chip-danger',
}

const Stat = ({ icon: Icon, label, value }) => (
  <div className="rounded-2xl border border-line bg-surface p-3.5">
    <p className="flex items-center gap-1.5 text-xs text-fg-3"><Icon size={13} /> {label}</p>
    <p className="mt-1 text-lg font-semibold tracking-tight">{value}</p>
  </div>
)

const Billing = () => {
  const { me, credits, isDemo, setCredits, refresh } = useAccount()
  const [catalog, setCatalog] = useState(null)
  const [transactions, setTransactions] = useState(null)
  const [busy, setBusy] = useState(null) // { plan, provider }
  const [params, setParams] = useSearchParams()
  const confirming = useRef(false)

  const loadTransactions = useCallback(async () => {
    try {
      const { data } = await api.get('/api/billing/transactions')
      setTransactions(data.transactions)
    } catch (err) {
      setTransactions([])
      toast.error(errorMessage(err, 'Could not load your purchases'))
    }
  }, [])

  useEffect(() => {
    api.get('/api/billing/plans')
      .then(({ data }) => setCatalog(data))
      .catch((err) => toast.error(errorMessage(err, 'Could not load the plans')))
    // eslint-disable-next-line react-hooks/set-state-in-effect -- state is set after the request resolves
    loadTransactions()
  }, [loadTransactions])

  const confirm = useCallback(async (payload) => {
    const { data } = await api.post('/api/billing/confirm', payload)
    setCredits(data.credits)
    toast.success(`${data.plan}: +${data.added.toLocaleString()} credits added`)
    refresh()
    loadTransactions()
  }, [loadTransactions, refresh, setCredits])

  // Back from Stripe Checkout: verify the session on the server, then tidy the URL
  useEffect(() => {
    const status = params.get('checkout')
    if (!status || confirming.current) return
    confirming.current = true
    const sessionId = params.get('session_id')
    setParams({}, { replace: true })
    if (status === 'cancelled') {
      toast('Checkout cancelled. You weren\'t charged.')
      return
    }
    if (status === 'success' && sessionId) {
      // Runs once per return from Stripe; the balance updates after the server verifies the payment
      // eslint-disable-next-line react-hooks/set-state-in-effect
      confirm({ provider: 'stripe', sessionId }).catch((err) => toast.error(errorMessage(err, 'Could not confirm the payment')))
    }
  }, [params, setParams, confirm])

  const buy = async (plan, provider) => {
    setBusy({ plan: plan.id, provider })
    try {
      const { data } = await api.post('/api/billing/checkout', { planId: plan.id, provider })
      if (provider === 'stripe') {
        window.location.assign(data.url)
        return // keep the button busy while the browser leaves
      }
      const Razorpay = await loadRazorpay()
      const checkout = new Razorpay({
        key: data.keyId,
        order_id: data.order.id,
        amount: data.order.amount,
        currency: data.order.currency,
        name: 'Clearcut',
        description: `${data.plan.name}: ${data.plan.credits} credits`,
        prefill: data.prefill,
        theme: { color: '#3b6cff' },
        handler: (res) =>
          confirm({ provider: 'razorpay', orderId: res.razorpay_order_id, paymentId: res.razorpay_payment_id, signature: res.razorpay_signature })
            .catch((err) => toast.error(errorMessage(err, 'Could not confirm the payment'))),
        modal: { ondismiss: () => setBusy(null) },
      })
      checkout.on('payment.failed', (res) => toast.error(res.error?.description || 'The payment failed'))
      checkout.open()
      setBusy(null)
    } catch (err) {
      toast.error(errorMessage(err, 'Could not start checkout'))
      setBusy(null)
    }
  }

  const providers = catalog?.providers || { stripe: false, razorpay: false }
  const stats = me?.stats

  return (
    <div className="animate-fade-up">
      <p className="eyebrow">Billing</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Credits & usage</h1>

      <div className="mt-6 grid gap-4 lg:grid-cols-[360px_1fr]">
        <section className="card relative overflow-hidden p-6" aria-label="Balance">
          <div className="checker pointer-events-none absolute -top-10 -right-10 size-44 rotate-12 rounded-[32px] opacity-50" />
          <p className="relative flex items-center gap-1.5 text-sm text-fg-2"><CoinsIcon size={15} /> Balance</p>
          {credits === null ? (
            <div className="skeleton mt-3 h-14 w-32" />
          ) : (
            <p className="relative mt-2 text-6xl font-semibold tracking-[-0.05em] tabular-nums"><span className="gradient-text">{credits.toLocaleString()}</span></p>
          )}
          <p className="relative mt-1 text-sm text-fg-3">{credits === null ? ' ' : `${plural(credits, 'cutout')} left · credits never expire`}</p>
          {me && <p className="relative mt-6 text-xs text-fg-3">Member since {formatDate(me.user.createdAt)}</p>}
        </section>

        <section className="card p-6" aria-label="Usage">
          {stats ? <UsageChart days={stats.last14} /> : <div className="skeleton h-40" />}
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat icon={ImagesIcon} label="Cutouts made" value={stats ? stats.processed.toLocaleString() : '–'} />
            <Stat icon={ShoppingBagIcon} label="Credits bought" value={stats ? stats.creditsPurchased.toLocaleString() : '–'} />
            <Stat icon={GaugeIcon} label="Avg. time" value={stats?.avgSeconds ? `${stats.avgSeconds} s` : '–'} />
            <Stat icon={ReceiptTextIcon} label="Orders" value={stats ? stats.orders : '–'} />
          </div>
        </section>
      </div>

      <section className="mt-12" aria-labelledby="packs">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="packs" className="text-xl font-semibold tracking-tight">Top up credits</h2>
            <p className="mt-1 text-sm text-fg-3">One credit = one cutout. Pay once, no subscription.</p>
          </div>
          {catalog && (providers.stripe || providers.razorpay) && (
            <p className="flex items-center gap-1.5 text-xs text-fg-3">
              {providers.stripe && <><CreditCardIcon size={13} /> Stripe</>}
              {providers.stripe && providers.razorpay && ' · '}
              {providers.razorpay && <><WalletIcon size={13} /> Razorpay</>}
            </p>
          )}
        </div>

        {isDemo && (
          <p className="card mt-4 flex items-center gap-2 !rounded-2xl px-4 py-3 text-sm text-fg-2"><InfoIcon size={16} className="shrink-0 text-accent-text" /> You're exploring the shared demo account, so checkout is turned off. Create your own account to try it.</p>
        )}
        {catalog && !providers.stripe && !providers.razorpay && !isDemo && (
          <p className="card mt-4 flex items-center gap-2 !rounded-2xl px-4 py-3 text-sm text-fg-2"><InfoIcon size={16} className="shrink-0 text-accent-text" /> Payments aren't set up on this server yet. Add Stripe or Razorpay keys to server/.env to enable checkout.</p>
        )}

        <ul className="mt-6 grid gap-4 md:grid-cols-3">
          {catalog
            ? catalog.plans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  providers={providers}
                  busy={busy?.plan === plan.id ? busy.provider : busy ? 'other' : null}
                  blockedReason={isDemo ? 'demo' : null}
                  onBuy={(provider) => buy(plan, provider)}
                />
              ))
            : Array.from({ length: 3 }, (_, i) => <PlanCardSkeleton key={i} />)}
        </ul>
      </section>

      <section className="mt-12" aria-labelledby="history">
        <h2 id="history" className="text-xl font-semibold tracking-tight">Purchase history</h2>
        <div className="card mt-4 overflow-hidden">
          {transactions === null ? (
            <div className="space-y-3 p-5">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-10" />)}</div>
          ) : transactions.length === 0 ? (
            <EmptyState icon={ReceiptTextIcon} title="No purchases yet" text="Credit packs you buy show up here with their receipts." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-fg-3">
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 font-medium">Pack</th>
                    <th className="px-5 py-3 font-medium">Credits</th>
                    <th className="px-5 py-3 font-medium">Amount</th>
                    <th className="px-5 py-3 font-medium">Method</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id} className="border-b border-line last:border-0 hover:bg-surface">
                      <td className="px-5 py-3.5 text-fg-2">{formatDate(t.paidAt || t.createdAt)}</td>
                      <td className="px-5 py-3.5 font-medium">{t.plan}</td>
                      <td className="px-5 py-3.5 font-mono tabular-nums">+{t.credits.toLocaleString()}</td>
                      <td className="px-5 py-3.5 tabular-nums">{formatMoney(t.amount, t.currency)}</td>
                      <td className="px-5 py-3.5 text-fg-2 capitalize">{t.provider === 'stripe' ? 'Card (Stripe)' : t.provider}</td>
                      <td className="px-5 py-3.5"><span className={`chip capitalize ${STATUS[t.status] || ''}`}>{t.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default Billing
