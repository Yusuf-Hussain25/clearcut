import { useState } from 'react'
import { formatDate } from '../../lib/format'

// Cutouts per day for the last 14 days: one series, so the title names it and no legend is needed.
// Thin bars with rounded tops anchored to the baseline, a hover tooltip per bar, and a table for screen readers.
const UsageChart = ({ days }) => {
  const [hover, setHover] = useState(null)
  const max = Math.max(1, ...days.map((d) => d.count))
  const total = days.reduce((s, d) => s + d.count, 0)
  const label = (d) => formatDate(`${d.day}T12:00:00`, { weekday: 'short', day: 'numeric', month: 'short' })

  return (
    <figure>
      <figcaption className="flex items-baseline justify-between">
        <span className="text-sm font-semibold">Cutouts per day</span>
        <span className="text-xs text-fg-3">{total} in the last 14 days</span>
      </figcaption>

      <div className="relative mt-4 h-32" aria-hidden="true">
        {/* Recessive guide lines */}
        <div className="absolute inset-x-0 top-0 border-t border-dashed border-line" />
        <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-line" />
        <span className="absolute -top-2 right-0 bg-[var(--panel-solid)] pl-1 font-mono text-[10px] text-fg-3">{max}</span>

        <div className="absolute inset-0 flex items-end gap-[2px] border-b border-line-strong">
          {days.map((d, i) => (
            <div
              key={d.day}
              className="group relative flex h-full flex-1 items-end justify-center"
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
            >
              <div
                className="w-full max-w-[18px] rounded-t-[4px] transition-opacity"
                style={{
                  height: d.count ? `${(d.count / max) * 100}%` : 0,
                  background: 'var(--accent)',
                  opacity: hover === null || hover === i ? 1 : 0.45,
                }}
              />
              {hover === i && (
                <div className="pointer-events-none absolute bottom-full z-10 mb-2 rounded-lg border border-line-strong bg-[var(--panel-solid)] px-2.5 py-1.5 text-xs whitespace-nowrap shadow-soft">
                  <p className="text-fg-3">{label(d)}</p>
                  <p className="font-semibold text-fg">{d.count} {d.count === 1 ? 'cutout' : 'cutouts'}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-1.5 flex justify-between font-mono text-[10px] text-fg-3" aria-hidden="true">
        <span>{formatDate(`${days[0].day}T12:00:00`, { day: 'numeric', month: 'short' })}</span>
        <span>Today</span>
      </div>

      <table className="sr-only">
        <caption>Cutouts per day, last 14 days</caption>
        <thead><tr><th>Day</th><th>Cutouts</th></tr></thead>
        <tbody>{days.map((d) => <tr key={d.day}><td>{label(d)}</td><td>{d.count}</td></tr>)}</tbody>
      </table>
    </figure>
  )
}

export default UsageChart
