import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { useMediaQuery } from '../lib/useMediaQuery'
import type { CategoryOption } from '../lib/categories'
import type { Condition, ItemType, StockStatus } from '../lib/types'
import { CONDITION_LABEL, ITEM_TYPE_LABEL, STOCK_STATUS_LABEL } from '../lib/types'

interface Props {
  types: ItemType[]
  onTypesChange: (types: ItemType[]) => void
  categories: CategoryOption[]
  /** Selected category keys. */
  selected: string[]
  onChange: (selected: string[]) => void
  /** Shop: a single "Hide sold out" switch. */
  hideSoldOut?: boolean
  onHideSoldOutChange?: (hide: boolean) => void
  /** Admin: filter by condition (the shop uses tabs for this instead). */
  conditions?: Condition[]
  onConditionsChange?: (conditions: Condition[]) => void
  /** Admin: filter by stock status instead of "Hide sold out". */
  stock?: StockStatus[]
  onStockChange?: (stock: StockStatus[]) => void
  /** How many items match right now, shown on the phone sheet's "Show N items" button. */
  resultCount?: number
}

// How long the phone sheet takes to slide away; matches the sheet-down animation.
const CLOSE_MS = 220

const toggled = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((x) => x !== value) : [...list, value])

/** Filter-icon button that opens checklists of item types and categories (several can be picked) plus availability. */
export default function FilterMenu({ types, onTypesChange, categories, selected, onChange, hideSoldOut = false, onHideSoldOutChange, conditions, onConditionsChange, stock, onStockChange, resultCount }: Props) {
  const [open, setOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  // Phones get a bottom sheet; larger screens keep the dropdown.
  const asSheet = !useMediaQuery('(min-width: 640px)')
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const sheet = useRef<HTMLDivElement>(null)
  const drag = useRef<{ startY: number; dy: number } | null>(null)

  const close = () => {
    if (!asSheet) return setOpen(false)
    setClosing(true)
    window.setTimeout(() => {
      setOpen(false)
      setClosing(false)
      trigger.current?.focus()
    }, CLOSE_MS)
  }

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
      // Keep receiving moves even if the finger slides off the top bar.
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    } catch {
      // Some browsers refuse capture for synthetic or already-ended pointers; dragging still works.
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
    sheet.current.style.transition = ''
    if (dy > 90) {
      // Slide the rest of the way down from where the finger let go.
      sheet.current.style.animation = 'none'
      sheet.current.style.transition = `transform ${CLOSE_MS}ms ease-in`
      sheet.current.style.transform = 'translateY(100%)'
      close()
    } else {
      // Not far enough: spring back up.
      sheet.current.style.transition = 'transform .2s ease-out'
      sheet.current.style.transform = ''
    }
  }

  const clearAll = () => {
    onTypesChange([])
    onChange([])
    onHideSoldOutChange?.(false)
    onConditionsChange?.([])
    onStockChange?.([])
  }

  const activeCount = types.length + selected.length + Number(hideSoldOut) + (conditions?.length ?? 0) + (stock?.length ?? 0)
  const toggleType = (t: ItemType) => onTypesChange(toggled(types, t))
  const toggle = (c: string) => onChange(toggled(selected, c))

  const row = `flex cursor-pointer items-center gap-3 rounded-lg px-2 hover:bg-subtle ${asSheet ? 'min-h-12 text-base' : 'min-h-11 text-sm'}`
  const box = asSheet ? 'h-5 w-5 accent-brand' : 'h-4 w-4 accent-brand'

  const sections = (
    <>
      <span className="block px-2 py-1.5 text-xs font-medium uppercase tracking-wide text-muted">Type</span>
      <ul>
        {(Object.keys(ITEM_TYPE_LABEL) as ItemType[]).map((t) => (
          <li key={t}>
            <label className={row}>
              <input type="checkbox" className={box} checked={types.includes(t)} onChange={() => toggleType(t)} />
              {ITEM_TYPE_LABEL[t]}
            </label>
          </li>
        ))}
      </ul>

      {conditions && onConditionsChange && (
        <div className="mt-2 border-t border-line pt-2">
          <span className="block px-2 py-1.5 text-xs font-medium uppercase tracking-wide text-muted">Condition</span>
          <ul>
            {(Object.keys(CONDITION_LABEL) as Condition[]).map((c) => (
              <li key={c}>
                <label className={row}>
                  <input type="checkbox" className={box} checked={conditions.includes(c)} onChange={() => onConditionsChange(toggled(conditions, c))} />
                  {CONDITION_LABEL[c]}
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-2 flex items-center justify-between border-t border-line px-2 pb-1.5 pt-3.5">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">Categories</span>
        {selected.length > 0 && (
          <button type="button" className="text-xs font-medium text-brand-ink hover:underline" onClick={() => onChange([])}>
            Clear
          </button>
        )}
      </div>
      {categories.length === 0 ? (
        <p className="px-2 py-3 text-sm text-muted">No categories yet.</p>
      ) : (
        <ul className={asSheet ? '' : 'max-h-72 overflow-y-auto'}>
          {categories.map((c) => (
            <li key={c.key}>
              <label className={row}>
                <input type="checkbox" className={box} checked={selected.includes(c.key)} onChange={() => toggle(c.key)} />
                {c.label}
              </label>
            </li>
          ))}
        </ul>
      )}

      {stock && onStockChange ? (
        <div className="mt-2 border-t border-line pt-2">
          <span className="block px-2 py-1.5 text-xs font-medium uppercase tracking-wide text-muted">Stock</span>
          <ul>
            {(Object.keys(STOCK_STATUS_LABEL) as StockStatus[]).map((s) => (
              <li key={s}>
                <label className={row}>
                  <input type="checkbox" className={box} checked={stock.includes(s)} onChange={() => onStockChange(toggled(stock, s))} />
                  {STOCK_STATUS_LABEL[s]}
                </label>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        onHideSoldOutChange && (
          <div className="mt-2 border-t border-line pt-2">
            <span className="block px-2 py-1.5 text-xs font-medium uppercase tracking-wide text-muted">Availability</span>
            <label className={row}>
              <input type="checkbox" className={box} checked={hideSoldOut} onChange={(e) => onHideSoldOutChange(e.target.checked)} />
              Hide sold out
            </label>
          </div>
        )
      )}
    </>
  )

  return (
    <div ref={root} className="relative shrink-0">
      <button
        ref={trigger}
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={activeCount ? `Filters, ${activeCount} active` : 'Filters'}
        className={`relative flex h-10 items-center gap-2 rounded-lg border px-3 text-sm transition ${
          activeCount || open ? 'border-brand text-brand-ink' : 'border-line bg-surface text-ink hover:border-brand'
        }`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 6h16M7 12h10M10 18h4" />
        </svg>
        <span className="hidden sm:inline">Filters</span>
        {activeCount > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-semibold text-white">
            {activeCount}
          </span>
        )}
      </button>

      {open && !asSheet && (
        <div className="absolute left-0 z-30 mt-2 max-h-[calc(100dvh-9rem)] w-64 max-w-[calc(100vw-2rem)] overflow-y-auto overscroll-contain rounded-xl border border-line bg-surface p-2 shadow-lg">
          {sections}
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
              aria-labelledby="filter-sheet-title"
              tabIndex={-1}
              className="absolute outline-none inset-x-0 bottom-0 flex max-h-[85dvh] flex-col rounded-t-3xl bg-surface shadow-2xl motion-safe:animate-[sheet-up_.32s_cubic-bezier(.16,1,.3,1)_backwards] in-data-closing:motion-safe:animate-[sheet-down_.22s_ease-in_both]"
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
                  <h2 id="filter-sheet-title" className="font-display text-xl">Filters</h2>
                  <button
                    type="button"
                    onClick={close}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-subtle hover:text-ink"
                    aria-label="Close filters"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-line px-2 pb-2">{sections}</div>

              <div className="flex shrink-0 gap-3 border-t border-line px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
                <button type="button" className="btn-ghost flex-1 py-3" onClick={clearAll} disabled={activeCount === 0}>
                  Clear all
                </button>
                <button type="button" className="btn-primary flex-[2] py-3" onClick={close}>
                  {resultCount === undefined ? 'Show results' : `Show ${resultCount} item${resultCount === 1 ? '' : 's'}`}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
