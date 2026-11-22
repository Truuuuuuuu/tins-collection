import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useMediaQuery } from '../lib/useMediaQuery'
import { useAdminSearch } from '../store/search'

const TABS: { to: string; label: string; short?: string }[] = [
  { to: '/admin', label: 'Items' },
  { to: '/admin/sales', label: 'Sales' },
  // Very narrow phones (under 360px) show the short label so the bar and search button fit.
  { to: '/admin/trash', label: 'Recently deleted', short: 'Deleted' },
]

const searchIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" aria-hidden>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
)

/**
 * The admin section tabs plus a round pink search button beside them.
 * - `header`: large screens, centered in the top bar.
 * - `page`: phones and tablets, floating just under the header while scrolling.
 * Each placement only renders at its own screen size. The search button (Items tab only) swaps the
 * tabs for a search field in the same spot; closing it brings the tabs back.
 */
export default function AdminNav({ placement }: { placement: 'header' | 'page' }) {
  const { pathname } = useLocation()
  const auth = useAuth()
  const large = useMediaQuery('(min-width: 1024px)')
  const { query, setQuery } = useAdminSearch()
  const active = TABS.findIndex((t) => t.to === pathname)
  const links = useRef<(HTMLAnchorElement | null)[]>([])
  const sentinel = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const searchButton = useRef<HTMLButtonElement>(null)
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null)
  // No slide on the very first placement, only when switching tabs.
  const [animate, setAnimate] = useState(false)
  const [floating, setFloating] = useState(false)
  const [searching, setSearching] = useState(false)
  const show = active !== -1 && auth.status === 'signed-in' && auth.isAdmin && (placement === 'header') === large
  const inPage = placement === 'page'
  // Search only filters the item list, so the button only appears on the Items tab.
  const canSearch = pathname === '/admin'
  // Switching to another tab closes an open search.
  const open = searching && canSearch

  // Measure the active tab and move the pill under it; re-measure when the window resizes.
  useLayoutEffect(() => {
    if (!show || open) return
    const measure = () => {
      // Measure the tab's list item: its position is relative to the whole tab bar, like the pill's.
      const el = links.current[active]?.parentElement
      if (el) setPill({ left: el.offsetLeft, width: el.offsetWidth })
    }
    measure()
    window.addEventListener('resize', measure)
    // Fonts can finish loading after the first measure and change the tab widths.
    document.fonts?.ready.then(measure)
    return () => window.removeEventListener('resize', measure)
  }, [active, show, open])

  useEffect(() => {
    if (!pill || animate) return
    const id = requestAnimationFrame(() => setAnimate(true))
    return () => cancelAnimationFrame(id)
  }, [pill, animate])

  // A zero-height marker just above the bar: once it scrolls under the header, the bar is floating.
  useEffect(() => {
    if (!show || !inPage || !sentinel.current) return
    const io = new IntersectionObserver(([entry]) => setFloating(!entry.isIntersecting), { rootMargin: '-80px 0px 0px 0px' })
    io.observe(sentinel.current)
    return () => io.disconnect()
  }, [show, inPage])

  useEffect(() => {
    if (open) input.current?.focus()
  }, [open])

  if (!show) return null

  const closeSearch = () => {
    setSearching(false)
    requestAnimationFrame(() => searchButton.current?.focus())
  }
  const clearSearch = () => {
    setQuery('')
    closeSearch()
  }

  const surface = inPage && floating ? 'bg-surface/90 shadow-lg shadow-ink/10 backdrop-blur' : 'bg-subtle'

  const bar = open ? (
    <form
      role="search"
      className={`relative flex w-full max-w-md items-center rounded-full border border-brand/50 p-1 motion-safe:animate-[modal-in_.2s_cubic-bezier(.16,1,.3,1)_both] ${inPage && floating ? 'bg-surface/95 shadow-lg shadow-ink/10 backdrop-blur' : 'bg-surface'}`}
      onSubmit={(e) => {
        e.preventDefault()
        closeSearch()
      }}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-white">{searchIcon}</span>
      <input
        ref={input}
        type="search"
        enterKeyHint="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && closeSearch()}
        placeholder="Search items by name or category"
        aria-label="Search items by name or category"
        className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted/70 [&::-webkit-search-cancel-button]:hidden"
      />
      <button
        type="button"
        onClick={clearSearch}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-subtle hover:text-ink"
        aria-label={query ? 'Clear search and close' : 'Close search'}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </form>
  ) : (
    <>
      <ul className={`relative flex gap-1 rounded-full border border-line p-1 transition-[background-color,box-shadow] duration-300 motion-safe:animate-[sheet-fade_.2s_ease-out_both] ${surface}`}>
        {pill && (
          <span
            aria-hidden
            className={`absolute inset-y-1 left-0 rounded-full bg-brand shadow-sm shadow-brand/30 ${
              animate ? 'transition-[transform,width] duration-300 ease-[cubic-bezier(.16,1,.3,1)] motion-reduce:transition-none' : ''
            }`}
            style={{ width: pill.width, transform: `translateX(${pill.left}px)` }}
          />
        )}
        {TABS.map((t, i) => (
          <li key={t.to} className="relative">
            <NavLink
              ref={(el) => {
                links.current[i] = el
              }}
              to={t.to}
              end
              className={`flex min-h-9 items-center whitespace-nowrap rounded-full px-3 text-sm transition-colors duration-300 sm:px-4 ${
                i === active ? 'font-medium text-white' : 'text-muted hover:text-ink'
              }`}
            >
              {t.short ? (
                <>
                  <span className="min-[360px]:hidden">{t.short}</span>
                  <span className="hidden min-[360px]:inline">{t.label}</span>
                </>
              ) : (
                t.label
              )}
            </NavLink>
          </li>
        ))}
      </ul>
      {/* Separate round button, Items tab only; a dot shows while a search is still filtering the list. */}
      {canSearch && (
      <button
        ref={searchButton}
        type="button"
        onClick={() => setSearching(true)}
        className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-white transition hover:bg-brand-dark active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
          inPage && floating ? 'shadow-lg shadow-brand/30' : 'shadow-sm shadow-brand/20'
        }`}
        aria-label={query ? `Search items (searching “${query}”)` : 'Search items'}
      >
        {searchIcon}
        {query && <span className="absolute right-0.5 top-0.5 h-3 w-3 rounded-full border-2 border-surface bg-amber-400" aria-hidden />}
      </button>
      )}
    </>
  )

  if (!inPage) {
    return (
      <nav aria-label="Admin sections" className="flex w-full items-center justify-center gap-2">
        {bar}
      </nav>
    )
  }

  return (
    <>
      <div ref={sentinel} aria-hidden />
      <nav aria-label="Admin sections" className="sticky top-[4.75rem] z-10 mb-6 flex items-center justify-center gap-2">
        {bar}
      </nav>
    </>
  )
}
