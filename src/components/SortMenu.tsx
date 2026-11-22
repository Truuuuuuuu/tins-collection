import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { useMediaQuery } from '../lib/useMediaQuery'
import type { SortOrder } from '../lib/sort'
import { SORT_LABEL } from '../lib/sort'

// How long the phone sheet takes to slide away; matches the sheet-down animation.
const CLOSE_MS = 220

const ORDERS = Object.keys(SORT_LABEL) as SortOrder[]

/**
 * Sort button that matches the Filters button: a dropdown on larger screens, a bottom sheet on
 * phones (tap an option, swipe down or tap outside to close). Phones show just the icon.
 */
export default function SortMenu({ value, onChange, align = 'left' }: { value: SortOrder; onChange: (v: SortOrder) => void; align?: 'left' | 'right' }) {
  const active = value !== 'newest'
  const asSheet = !useMediaQuery('(min-width: 640px)')
  const [open, setOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const sheet = useRef<HTMLDivElement>(null)
  const drag = useRef<{ startY: number; dy: number } | null>(null)
  // The pending "finish closing" timer, so a quick reopen or a second close can't trip over it.
  const closeTimer = useRef<number | undefined>(undefined)

  const show = () => {
    window.clearTimeout(closeTimer.current)
    closeTimer.current = undefined
    setClosing(false)
    setOpen(true)
  }

  const close = () => {
    if (!asSheet) return setOpen(false)
    if (closeTimer.current !== undefined) return // already sliding away
    setClosing(true)
    closeTimer.current = window.setTimeout(() => {
      closeTimer.current = undefined
      setOpen(false)
      setClosing(false)
      trigger.current?.focus()
    }, CLOSE_MS)
  }

  useEffect(() => () => window.clearTimeout(closeTimer.current), [])

  // Close on Escape; the dropdown also closes on a tap outside it.
  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => !asSheet && !root.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, asSheet])

  // While the sheet is up, the page behind it shouldn't scroll, and focus moves into the sheet.
  useEffect(() => {
    if (!open || !asSheet) return
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    sheet.current?.focus()
    return () => {
      document.body.style.overflow = overflow
    }
  }, [open, asSheet])

  // Swipe the sheet's top bar down to dismiss it.
  const onDragStart = (e: ReactPointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    drag.current = { startY: e.clientY, dy: 0 }
    try {
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    } catch {
      // Some browsers refuse capture for synthetic pointers; dragging still works.
    }
  }
  const onDragMove = (e: ReactPointerEvent) => {
    if (!drag.current || !sheet.current) return
    drag.current.dy = Math.max(0, e.clientY - drag.current.startY)
    sheet.current.style.transition = 'none'
    sheet.current.style.transform = `translateY(${drag.current.dy}px)`
  }
  const onDragEnd = () => {
    if (!drag.current || !sheet.current) return
    const { dy } = drag.current
    drag.current = null
    if (dy > 90) {
      sheet.current.style.animation = 'none'
      sheet.current.style.transition = `transform ${CLOSE_MS}ms ease-in`
      sheet.current.style.transform = 'translateY(100%)'
      close()
    } else {
      sheet.current.style.transition = 'transform .2s ease-out'
      sheet.current.style.transform = ''
    }
  }

  const pick = (s: SortOrder) => {
    onChange(s)
    close()
  }

  const row = `flex cursor-pointer items-center gap-3 rounded-lg px-2 hover:bg-subtle ${asSheet ? 'min-h-12 text-base' : 'min-h-11 text-sm'}`
  const box = asSheet ? 'h-5 w-5 accent-brand' : 'h-4 w-4 accent-brand'

  const options = (
    <ul>
      {ORDERS.map((s) => (
        <li key={s}>
          {/* Tapping the option that's already picked just closes the menu. */}
          <label className={row} onClick={() => value === s && close()}>
            <input type="radio" name="sort-order" className={box} checked={value === s} onChange={() => pick(s)} />
            {SORT_LABEL[s]}
          </label>
        </li>
      ))}
    </ul>
  )

  return (
    <div ref={root} className="relative shrink-0">
      <button
        ref={trigger}
        type="button"
        onClick={() => (open && !closing ? close() : show())}
        aria-expanded={open}
        aria-haspopup={asSheet ? 'dialog' : 'true'}
        aria-label={`Sort by: ${SORT_LABEL[value]}`}
        className={`relative flex h-10 items-center gap-2 rounded-lg border px-3 text-sm transition ${
          active || open ? 'border-brand text-brand-ink' : 'border-line bg-surface text-ink hover:border-brand'
        }`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4" />
        </svg>
        <span className="hidden whitespace-nowrap sm:inline">{SORT_LABEL[value]}</span>
      </button>

      {open && !asSheet && (
        <div className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} z-30 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-xl border border-line bg-surface p-2 shadow-lg`}>
          <span className="block px-2 py-1.5 text-xs font-medium uppercase tracking-wide text-muted">Sort by</span>
          {options}
        </div>
      )}

      {open &&
        asSheet &&
        createPortal(
          <div className="fixed inset-0 z-50" data-closing={closing || undefined}>
            <div
              className="absolute inset-0 bg-black/40 motion-safe:animate-[sheet-fade_.22s_ease-out_both] in-data-closing:motion-safe:animate-[sheet-fade-out_.22s_ease-in_both]"
              onClick={close}
              aria-hidden
            />
            <div
              ref={sheet}
              role="dialog"
              aria-modal="true"
              aria-labelledby="sort-sheet-title"
              tabIndex={-1}
              className="absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col rounded-t-3xl bg-surface shadow-2xl outline-none motion-safe:animate-[sheet-up_.32s_cubic-bezier(.16,1,.3,1)_backwards] in-data-closing:motion-safe:animate-[sheet-down_.22s_ease-in_both]"
            >
              <div
                className="shrink-0 cursor-grab touch-none px-4 pb-2 pt-2.5 active:cursor-grabbing"
                onPointerDown={onDragStart}
                onPointerMove={onDragMove}
                onPointerUp={onDragEnd}
                onPointerCancel={onDragEnd}
              >
                <div className="mx-auto h-1.5 w-10 rounded-full bg-line" aria-hidden />
                <div className="mt-3 flex items-center justify-between">
                  <h2 id="sort-sheet-title" className="font-display text-xl">Sort by</h2>
                  <button
                    type="button"
                    onClick={close}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-subtle hover:text-ink"
                    aria-label="Close sort"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-line px-2 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
                {options}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
