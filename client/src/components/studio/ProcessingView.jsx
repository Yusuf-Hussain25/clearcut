import { CheckIcon, LoaderIcon, UploadCloudIcon, WandSparklesIcon } from 'lucide-react'
import { formatBytes } from '../../lib/format'

const STEPS = [
  { id: 'uploading', label: 'Uploading', icon: UploadCloudIcon },
  { id: 'processing', label: 'Finding the subject and removing the background', icon: WandSparklesIcon },
]

// Shown while a photo is uploaded and processed: the photo with a scan sweep and real progress
const ProcessingView = ({ job }) => {
  const current = STEPS.findIndex((s) => s.id === job.stage)
  return (
    <div className="card grid gap-6 p-4 sm:p-6 lg:grid-cols-[1fr_320px] animate-pop-in" aria-live="polite">
      <div className="checker relative grid min-h-[300px] place-items-center overflow-hidden rounded-[20px] sm:min-h-[420px]">
        <img src={job.preview} alt="" className="max-h-[60vh] w-auto max-w-full object-contain opacity-80" />
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 animate-[scan_1.8s_var(--ease-out)_infinite] bg-gradient-to-b from-transparent via-[rgba(59,108,255,.28)] to-transparent" />
        </div>
      </div>

      <div className="flex flex-col justify-center">
        <p className="eyebrow">Working on it</p>
        <h2 className="mt-1 truncate text-xl font-semibold tracking-tight" title={job.file.name}>{job.file.name}</h2>
        <p className="text-sm text-fg-3">{formatBytes(job.file.size)}</p>

        <ol className="mt-6 space-y-4">
          {STEPS.map((step, i) => {
            const done = i < current
            const active = i === current
            return (
              <li key={step.id} className="flex items-start gap-3">
                <span className={`grid size-8 shrink-0 place-items-center rounded-full ${done ? 'bg-ok/15 text-ok' : active ? 'bg-accent-soft text-accent-text' : 'bg-surface-2 text-fg-3'}`}>
                  {done ? <CheckIcon size={16} /> : active ? <LoaderIcon size={16} className="animate-spin" /> : <step.icon size={16} />}
                </span>
                <div className="min-w-0 flex-1 pt-1">
                  <p className={`text-sm ${active ? 'font-semibold' : 'text-fg-2'}`}>{step.label}</p>
                  {step.id === 'uploading' && active && (
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={Math.round(job.progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Upload progress">
                      <div className="h-full rounded-full transition-[width] duration-200" style={{ width: `${job.progress * 100}%`, background: 'var(--accent-grad)' }} />
                    </div>
                  )}
                  {step.id === 'processing' && active && <p className="mt-0.5 text-xs text-fg-3">Usually 2 to 6 seconds</p>}
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}

export default ProcessingView
