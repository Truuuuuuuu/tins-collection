import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AdminMenu({ email }: { email: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
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
  }, [open])

  const signOut = async () => {
    setOpen(false)
    await supabase.auth.signOut()
    navigate('/admin/login', { replace: true })
  }

  const item = 'block w-full px-4 py-2.5 text-left text-sm hover:bg-brand-soft'

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface hover:border-brand"
        aria-label="Admin menu"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>

      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-lg">
          <p className="truncate border-b border-line px-4 pb-2.5 pt-2 text-xs text-muted">Signed in as<br /><span className="text-sm text-ink">{email}</span></p>
          {pathname !== '/admin' && <Link role="menuitem" to="/admin" className={item} onClick={() => setOpen(false)}>Items</Link>}
          <Link role="menuitem" to="/" className={item} onClick={() => setOpen(false)}>View shop</Link>
          <button role="menuitem" type="button" className={`${item} border-t border-line text-red-700 hover:bg-red-50`} onClick={signOut}>
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
