import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'

interface Props {
  /** The in-page toolbar. The floating bar appears once this has scrolled up out of view. */
  anchor: RefObject<HTMLElement | null>
  value: string
  onChange: (value: string) => void
  /** Called on Enter, e.g. to scroll back up to the results. */
  onSubmit: () => void
}

export default function FloatingSearch({ anchor, value, onChange, onSubmit }: Props) {
  const [scrolledPast, setScrolledPast] = useState(false)
  const [focused, setFocused] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const el = anchor.current
    if (!el) return
    // Only "past" when the toolbar is above the screen, not when it's still below it.
    // The top margin skips the sticky header (h-16), which covers the toolbar before it leaves the screen.
    const observer = new IntersectionObserver(
      ([entry]) => setScrolledPast(!entry.isIntersecting && entry.boundingClientRect.bottom < 64),
      { rootMargin: '-64px 0px 0px 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [anchor])

  // Stay put while typing, even if fewer results make the page short enough to show the toolbar again.
  const visible = scrolledPast || focused

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] transition duration-300 ease-out ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-full opacity-0'
      }`}
      aria-hidden={!visible}
    >
      <form
        role="search"
        className="flex w-full max-w-md items-center gap-2 rounded-full border border-line bg-surface/95 py-1.5 pl-5 pr-1.5 shadow-lg shadow-ink/10 backdrop-blur"
        onSubmit={(e) => {
          e.preventDefault()
          input.current?.blur()
          onSubmit()
        }}
      >
        <input
          ref={input}
          type="search"
          enterKeyHint="search"
          value={value}
          tabIndex={visible ? 0 : -1}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Search items"
          aria-label="Search items"
          className="h-9 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted/70 sm:text-sm [&::-webkit-search-cancel-button]:hidden"
        />
        {value && (
          <button
            type="button"
            tabIndex={visible ? 0 : -1}
            onClick={() => onChange('')}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-subtle hover:text-ink"
            aria-label="Clear search"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
        <button
          type="submit"
          tabIndex={visible ? 0 : -1}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-white hover:bg-brand-dark"
          aria-label="Search"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </button>
      </form>
    </div>
  )
}
