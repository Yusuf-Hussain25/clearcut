import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { XIcon } from 'lucide-react'

// Accessible dialog: Escape and backdrop close it, focus moves inside and returns afterwards.
const Modal = ({ open, onClose, title, children, width = 440, labelledBy }) => {
  const panel = useRef(null)

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    panel.current?.querySelector('input, button:not([data-close]), [tabindex]')?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      previous?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm animate-[fade-up_.2s_ease-out_both]" onClick={onClose} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={labelledBy ? undefined : title}
        className="card relative w-full p-6 shadow-deep animate-pop-in"
        style={{ maxWidth: width, background: 'var(--panel-solid)' }}
      >
        <button data-close className="icon-btn absolute top-3 right-3" onClick={onClose} aria-label="Close">
          <XIcon size={18} />
        </button>
        {children}
      </div>
    </div>,
    document.body
  )
}

// Yes/no confirmation built on Modal
export const ConfirmDialog = ({ open, title, text, confirmLabel = 'Confirm', danger = false, busy = false, onConfirm, onClose }) => (
  <Modal open={open} onClose={busy ? undefined : onClose} title={title}>
    <h2 className="pr-8 text-lg font-semibold tracking-tight">{title}</h2>
    {text && <p className="mt-2 text-sm text-fg-2">{text}</p>}
    <div className="mt-6 flex justify-end gap-2">
      <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={busy}>Cancel</button>
      <button className={`btn btn-sm ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={busy}>
        {busy && <span className="spinner !size-4" />}
        {confirmLabel}
      </button>
    </div>
  </Modal>
)

export default Modal
