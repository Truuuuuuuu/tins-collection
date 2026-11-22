import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useMediaQuery } from '../lib/useMediaQuery'

// Matches the drawer-out / sheet-fade-out animations.
const CLOSE_MS = 220

const SECTIONS = [
  { to: '/admin', label: 'Items' },
  { to: '/admin/sales', label: 'Sales' },
  { to: '/admin/trash', label: 'Recently deleted' },
]

/**
 * The burger button in the admin header.
 * - Large screens: a small dropdown under the button.
 * - Phones and tablets: a sidebar that slides in from the right.
 */
export default function AdminMenu({ email }: { email: string }) {
  const large = useMediaQuery('(min-width: 1024px)')
  // Remembers which screen size the menu was opened at, so resizing across the breakpoint closes it.
  const [openAt, setOpenAt] = useState<boolean | null>(null)
  const open = openAt === large
  const setOpen = (next: boolean | ((o: boolean) => boolean)) =>
    setOpenAt((typeof next === 'function' ? next(open) : next) ? large : null)
  const navigate = useNavigate()

  const signOut = async () => {
    setOpen(false)
    await supabase.auth.signOut()
    navigate('/admin/login', { replace: true })
  }

  const button = (
    <button
      type="button"
      className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface hover:border-brand"
      aria-label="Admin menu"
      aria-expanded={open}
      aria-haspopup={large ? 'menu' : 'dialog'}
      onClick={() => setOpen((o) => !o)}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
        {open && large ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
      </svg>
    </button>
  )

  return large ? (
    <Dropdown open={open} setOpen={setOpen} email={email} onSignOut={signOut}>
      {button}
    </Dropdown>
  ) : (
    <>
      {button}
      {open && <Sidebar email={email} onSignOut={signOut} onClose={() => setOpen(false)} />}
    </>
  )
}

function Dropdown({
  open,
  setOpen,
  email,
  onSignOut,
  children,
}: {
  open: boolean
  setOpen: (open: boolean) => void
  email: string
  onSignOut: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const { pathname } = useLocation()

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, setOpen])

  const item = 'block w-full px-4 py-2.5 text-left text-sm hover:bg-brand-soft'

  return (
    <div ref={ref} className="relative">
      {children}
      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-lg">
          <p className="truncate border-b border-line px-4 pb-2.5 pt-2 text-xs text-muted">Signed in as<br /><span className="text-sm text-ink">{email}</span></p>
          {SECTIONS.filter((s) => s.to !== pathname).map((s) => (
            <Link key={s.to} role="menuitem" to={s.to} className={item} onClick={() => setOpen(false)}>{s.label}</Link>
          ))}
          <Link role="menuitem" to="/" className={item} onClick={() => setOpen(false)}>View shop</Link>
          <button role="menuitem" type="button" className={`${item} border-t border-line text-red-700 hover:bg-red-50`} onClick={onSignOut}>
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}

/** Slides in from the right. Mount it to open it; it animates out before calling onClose. */
function Sidebar({ email, onSignOut, onClose }: { email: string; onSignOut: () => void; onClose: () => void }) {
  const [closing, setClosing] = useState(false)
  const panel = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<number | undefined>(undefined)
  const { pathname } = useLocation()
  const firstPath = useRef(pathname)

  const close = () => {
    if (closeTimer.current !== undefined) return
    setClosing(true)
    closeTimer.current = window.setTimeout(onClose, CLOSE_MS)
  }

  useEffect(() => () => window.clearTimeout(closeTimer.current), [])

  // Going to another page closes it.
  useEffect(() => {
    if (pathname !== firstPath.current) onClose()
  }, [pathname, onClose])

  // Escape closes; the page behind doesn't scroll; focus moves into the sidebar and back after.
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

  const link = (active: boolean) =>
    `flex min-h-11 items-center rounded-xl px-3 text-[15px] transition-colors ${
      active ? 'bg-brand-soft font-medium text-brand-ink' : 'text-ink hover:bg-subtle'
    }`

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        aria-hidden
        onClick={close}
        className={`absolute inset-0 bg-ink/40 ${
          closing ? 'animate-[sheet-fade-out_.22s_ease-in_both]' : 'animate-[sheet-fade_.2s_ease-out_both]'
        }`}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="Admin menu"
        tabIndex={-1}
        className={`absolute inset-y-0 right-0 flex w-[min(20rem,85vw)] flex-col bg-surface shadow-2xl outline-none motion-reduce:animate-none ${
          closing
            ? 'animate-[drawer-out_.22s_ease-in_both]'
            : 'animate-[drawer-in_.3s_cubic-bezier(.16,1,.3,1)_both]'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-line px-4">
          <div className="min-w-0">
            <p className="text-xs text-muted">Signed in as</p>
            <p className="truncate text-sm">{email}</p>
          </div>
          <button
            type="button"
            onClick={close}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted hover:bg-subtle hover:text-ink"
            aria-label="Close menu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <nav aria-label="Admin sections" className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-1">
            {SECTIONS.map((s) => (
              <li key={s.to}>
                <NavLink to={s.to} end className={({ isActive }) => link(isActive)} onClick={close}>
                  {s.label}
                </NavLink>
              </li>
            ))}
          </ul>
          <div className="my-3 border-t border-line" />
          <Link to="/" className={link(false)} onClick={close}>
            View shop
          </Link>
        </nav>

        <div className="border-t border-line p-3 pb-[max(.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onSignOut}
            className="flex min-h-11 w-full items-center rounded-xl px-3 text-[15px] text-red-700 hover:bg-red-50"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
