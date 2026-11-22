import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useMediaQuery } from '../lib/useMediaQuery'

// Matches the sheet-down / modal-out animations.
const CLOSE_MS = 220

interface Props {
  title: string
  children?: ReactNode
  confirmLabel: string
  /** Red button for actions that undo or remove something. */
  danger?: boolean
  busy?: boolean
  onConfirm: () => void
  onClose: () => void
}

/**
 * Asks "are you sure?" before an action. A centered modal on larger screens, a bottom sheet on
 * phones (swipe it down or tap outside to cancel). Mount it to open it; it animates out before
 * calling onClose.
 */
export default function ConfirmSheet({ title, children, confirmLabel, danger = false, busy = false, onConfirm, onClose }: Props) {
  const asSheet = !useMediaQuery('(min-width: 640px)')
  const [closing, setClosing] = useState(false)
  const panel = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<number | undefined>(undefined)
  const drag = useRef<{ startY: number; dy: number } | null>(null)

  const close = () => {
    if (busy || closeTimer.current !== undefined) return
    setClosing(true)
    closeTimer.current = window.setTimeout(onClose, CLOSE_MS)
  }

  useEffect(() => () => window.clearTimeout(closeTimer.current), [])

  // Escape cancels; the page behind doesn't scroll; focus moves into the dialog.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    document.addEventListener('keydown', onKey)
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    const returnFocus = document.activeElement as HTMLElement | null
    panel.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      returnFocus?.focus?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Phones: drag the top of the sheet down to cancel.
  const onDragStart = (e: ReactPointerEvent) => {
    if (!asSheet) return
    drag.current = { startY: e.clientY, dy: 0 }
    try {
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    } catch {
      // Capture can fail for synthetic pointers; dragging still works.
    }
  }
  const onDragMove = (e: ReactPointerEvent) => {
    if (!drag.current || !panel.current) return
    drag.current.dy = Math.max(0, e.clientY - drag.current.startY)
    panel.current.style.transition = 'none'
    panel.current.style.transform = `translateY(${drag.current.dy}px)`
  }
  const onDragEnd = () => {
    if (!drag.current || !panel.current) return
    const { dy } = drag.current
    drag.current = null
    if (dy > 90 && !busy) {
      panel.current.style.animation = 'none'
      panel.current.style.transition = `transform ${CLOSE_MS}ms ease-in`
      panel.current.style.transform = 'translateY(100%)'
      close()
    } else {
      panel.current.style.transition = 'transform .2s ease-out'
      panel.current.style.transform = ''
    }
  }

  return createPortal(
    <div className={`fixed inset-0 z-50 flex justify-center ${asSheet ? 'items-end' : 'items-center p-4'}`} data-closing={closing || undefined}>
      <div
        className="absolute inset-0 bg-black/40 motion-safe:animate-[sheet-fade_.22s_ease-out_both] in-data-closing:motion-safe:animate-[sheet-fade-out_.22s_ease-in_both]"
        onClick={close}
        aria-hidden
      />
      <div
        ref={panel}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        tabIndex={-1}
        className={`relative w-full bg-surface shadow-2xl outline-none ${
          asSheet
            ? 'max-h-[85dvh] overflow-y-auto rounded-t-3xl px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] motion-safe:animate-[sheet-up_.32s_cubic-bezier(.16,1,.3,1)_backwards] in-data-closing:motion-safe:animate-[sheet-down_.22s_ease-in_both]'
            : 'max-w-md rounded-2xl p-6 motion-safe:animate-[modal-in_.22s_cubic-bezier(.16,1,.3,1)_backwards] in-data-closing:motion-safe:animate-[modal-out_.18s_ease-in_both]'
        }`}
      >
        <div
          className={asSheet ? '-mx-5 cursor-grab touch-none px-5 pb-1 pt-2.5 active:cursor-grabbing' : ''}
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
        >
          {asSheet && <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line" aria-hidden />}
          <h2 id="confirm-title" className="font-display text-xl">{title}</h2>
        </div>
        <div className="mt-2 text-sm text-muted">{children}</div>
        <div className={`mt-6 flex gap-3 ${asSheet ? 'flex-col-reverse' : 'justify-end'}`}>
          <button type="button" className={`btn-ghost ${asSheet ? 'py-3' : ''}`} onClick={close} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className={`${danger ? 'btn bg-red-700 text-white hover:bg-red-800' : 'btn-primary'} ${asSheet ? 'py-3' : ''}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
