import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react'

// Matches the sheet-down animation.
const CLOSE_MS = 220

export interface BulkAction {
  label: string
  icon: ReactNode
  onClick: () => void
  danger?: boolean
}

interface Props {
  /** How many items are selected; the sheet shows while this is above 0. */
  count: number
  /** How many items match the current search and filters. */
  total: number
  onSelectAll: () => void
  onClear: () => void
  actions: BulkAction[]
  busy?: boolean
}

/**
 * Bottom sheet with actions for the selected items. Slides up when the first item is selected and
 * away when the selection is cleared (or swiped down). It doesn't block the page, so more items
 * can be ticked while it's open.
 */
export default function BulkActionSheet({ count, total, onSelectAll, onClear, actions, busy = false }: Props) {
  // Keep showing the last count while sliding away, so the text doesn't jump to "0 selected".
  const [shownCount, setShownCount] = useState(count)
  const [mounted, setMounted] = useState(count > 0)
  if (count > 0 && shownCount !== count) setShownCount(count)
  if (count > 0 && !mounted) setMounted(true)
  const closing = count === 0 && mounted
  const panel = useRef<HTMLDivElement>(null)
  const drag = useRef<{ startY: number; dy: number } | null>(null)

  // Unmount after the slide-down finishes.
  useEffect(() => {
    if (!closing) return
    const id = window.setTimeout(() => setMounted(false), CLOSE_MS)
    return () => window.clearTimeout(id)
  }, [closing])

  // Reopened (e.g. an item ticked right after a swipe-away): drop any leftover swipe position.
  const open = count > 0
  useEffect(() => {
    if (!open || !panel.current) return
    panel.current.style.animation = ''
    panel.current.style.transition = ''
    panel.current.style.transform = ''
  }, [open])

  // Swipe the top of the sheet down to clear the selection.
  const onDragStart = (e: ReactPointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
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
    if (dy > 70 && !busy) {
      panel.current.style.animation = 'none'
      panel.current.style.transition = `transform ${CLOSE_MS}ms ease-in`
      panel.current.style.transform = 'translateY(110%)'
      onClear()
    } else {
      panel.current.style.transition = 'transform .2s ease-out'
      panel.current.style.transform = ''
    }
  }

  if (!mounted) return null
  const allSelected = shownCount >= total

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center sm:px-4 sm:pb-4">
      <div
        ref={panel}
        role="region"
        aria-label="Actions for selected items"
        className={`pointer-events-auto w-full max-w-2xl rounded-t-3xl border border-line bg-surface px-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(35,31,32,0.12)] sm:rounded-3xl sm:pb-4 ${
          closing
            ? 'motion-safe:animate-[sheet-down_.22s_ease-in_both]'
            : 'motion-safe:animate-[sheet-up_.32s_cubic-bezier(.16,1,.3,1)_backwards]'
        }`}
      >
        <div
          className="-mx-4 cursor-grab touch-none px-4 pt-2.5 active:cursor-grabbing"
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
        >
          <div className="mx-auto h-1.5 w-10 rounded-full bg-line sm:hidden" aria-hidden />
          <div className="mt-2 flex items-center justify-between gap-3 sm:mt-1">
            <p className="text-sm">
              <span className="font-display text-xl tabular-nums" aria-live="polite">{shownCount}</span>
              <span className="ml-1.5 text-muted">selected</span>
            </p>
            <div className="flex items-center gap-1">
              {!allSelected && (
                <button
                  type="button"
                  className="rounded-full px-3 py-2 text-sm font-medium text-brand-ink hover:bg-brand-soft"
                  onClick={onSelectAll}
                  disabled={busy}
                >
                  Select all {total}
                </button>
              )}
              <button
                type="button"
                className="rounded-full px-3 py-2 text-sm text-muted hover:bg-subtle hover:text-ink"
                onClick={onClear}
                disabled={busy}
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        <div className="mt-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${actions.length}, minmax(0, 1fr))` }}>
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={a.onClick}
              disabled={busy}
              className={`flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-2xl border px-1 py-2.5 text-xs font-medium transition active:scale-95 disabled:opacity-50 ${
                a.danger
                  ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                  : 'border-line bg-subtle text-ink hover:border-brand hover:text-brand-ink'
              }`}
            >
              {a.icon}
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
