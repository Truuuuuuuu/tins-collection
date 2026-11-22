import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'

const TABS = [
  { to: '/admin', label: 'Items' },
  { to: '/admin/sales', label: 'Sales' },
  { to: '/admin/trash', label: 'Recently deleted' },
]

/**
 * Tabs for the admin sections. Rendered once in App (not per page), so the pink pill can slide
 * from the old tab to the new one. Centered on phones. It sticks just under the header while
 * scrolling, and gets a shadow once it's floating over the content.
 */
export default function AdminNav() {
  const { pathname } = useLocation()
  const auth = useAuth()
  const active = TABS.findIndex((t) => t.to === pathname)
  const links = useRef<(HTMLAnchorElement | null)[]>([])
  const sentinel = useRef<HTMLDivElement>(null)
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null)
  // No slide on the very first placement, only when switching tabs.
  const [animate, setAnimate] = useState(false)
  const [floating, setFloating] = useState(false)
  const show = active !== -1 && auth.status === 'signed-in' && auth.isAdmin

  // Measure the active tab and move the pill under it; re-measure when the window resizes.
  useLayoutEffect(() => {
    if (!show) return
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
  }, [active, show])

  useEffect(() => {
    if (!pill || animate) return
    const id = requestAnimationFrame(() => setAnimate(true))
    return () => cancelAnimationFrame(id)
  }, [pill, animate])

  // A zero-height marker just above the tabs: once it scrolls under the header, the tabs are floating.
  useEffect(() => {
    if (!show || !sentinel.current) return
    const io = new IntersectionObserver(([entry]) => setFloating(!entry.isIntersecting), { rootMargin: '-80px 0px 0px 0px' })
    io.observe(sentinel.current)
    return () => io.disconnect()
  }, [show])

  if (!show) return null

  return (
    <>
      <div ref={sentinel} aria-hidden />
      <nav aria-label="Admin sections" className="sticky top-[4.75rem] z-10 mb-6 flex justify-center sm:justify-start">
        <ul
          className={`relative flex gap-1 rounded-full border border-line p-1 transition-[background-color,box-shadow] duration-300 ${
            floating ? 'bg-surface/90 shadow-lg shadow-ink/10 backdrop-blur' : 'bg-subtle'
          }`}
        >
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
                className={`flex min-h-9 items-center whitespace-nowrap rounded-full px-4 text-sm transition-colors duration-300 ${
                  i === active ? 'font-medium text-white' : 'text-muted hover:text-ink'
                }`}
              >
                {t.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </>
  )
}
