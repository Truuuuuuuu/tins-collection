import { useEffect, useRef, useState } from 'react'

interface Props {
  categories: string[]
  selected: string[]
  onChange: (selected: string[]) => void
  hideSoldOut: boolean
  onHideSoldOutChange: (hide: boolean) => void
}

/** Filter-icon button that opens a checklist of categories (several can be picked) plus availability. */
export default function FilterMenu({ categories, selected, onChange, hideSoldOut, onHideSoldOutChange }: Props) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  // Close on outside tap or Escape.
  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const activeCount = selected.length + Number(hideSoldOut)
  const toggle = (c: string) => onChange(selected.includes(c) ? selected.filter((s) => s !== c) : [...selected, c])

  return (
    <div ref={root} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
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

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-xl border border-line bg-surface p-2 shadow-lg sm:left-0 sm:right-auto">
          <div className="flex items-center justify-between px-2 py-1.5">
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
            <ul className="max-h-72 overflow-y-auto">
              {categories.map((c) => (
                <li key={c}>
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 text-sm hover:bg-subtle">
                    <input type="checkbox" className="h-4 w-4 accent-brand" checked={selected.includes(c)} onChange={() => toggle(c)} />
                    {c}
                  </label>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-2 border-t border-line pt-2">
            <span className="block px-2 py-1.5 text-xs font-medium uppercase tracking-wide text-muted">Availability</span>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 text-sm hover:bg-subtle">
              <input type="checkbox" className="h-4 w-4 accent-brand" checked={hideSoldOut} onChange={(e) => onHideSoldOutChange(e.target.checked)} />
              Hide sold out
            </label>
          </div>
        </div>
      )}
    </div>
  )
}
