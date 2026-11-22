/** Page numbers to show: all of them when few, otherwise 1 … 4 5 6 … 20 around the current page. */
function pageList(page: number, count: number): (number | 'gap')[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1)
  const around = [page - 1, page, page + 1].filter((n) => n > 1 && n < count)
  const list: (number | 'gap')[] = [1]
  // A gap of just one page shows that page's number instead of "…".
  if (around[0] === 3) list.push(2)
  else if (around[0] > 3) list.push('gap')
  list.push(...around)
  const last = around[around.length - 1]
  if (last === count - 2) list.push(count - 1)
  else if (last < count - 2) list.push('gap')
  list.push(count)
  return list
}

/** Previous / page numbers / Next. Phones show "3 / 12" instead of the numbers. Always shown, even for a single page. */
export default function Pagination({ page, pageCount, onChange, className = '' }: {
  page: number
  pageCount: number
  onChange: (page: number) => void
  className?: string
}) {
  return (
    <nav className={`flex items-center justify-center gap-2 ${className}`} aria-label="Pagination">
      <button className="btn-ghost min-h-11 px-4" onClick={() => onChange(page - 1)} disabled={page === 1}>
        Previous
      </button>
      <p className="px-2 text-sm text-muted tabular-nums sm:hidden" aria-live="polite">
        {page} / {pageCount}
      </p>
      <div className="hidden items-center gap-1 sm:flex">
        {pageList(page, pageCount).map((n, i) =>
          n === 'gap' ? (
            <span key={`gap-${i}`} className="px-1 text-muted" aria-hidden>
              …
            </span>
          ) : (
            <button
              key={n}
              onClick={() => onChange(n)}
              aria-current={n === page ? 'page' : undefined}
              aria-label={`Page ${n}`}
              className={`h-11 min-w-11 rounded-full px-3 text-sm tabular-nums transition ${
                n === page ? 'bg-brand font-semibold text-white' : 'text-muted hover:text-brand-ink'
              }`}
            >
              {n}
            </button>
          ),
        )}
      </div>
      <button className="btn-ghost min-h-11 px-4" onClick={() => onChange(page + 1)} disabled={page === pageCount}>
        Next
      </button>
    </nav>
  )
}
