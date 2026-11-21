import { useEffect } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { CART_TARGET_ATTR } from '../lib/flyToCart'
import { SHOP_NAME } from '../lib/format'
import { cartCount, useCart } from '../store/cart'
import AdminMenu from './AdminMenu'
import Wordmark from './Wordmark'

export default function Header() {
  const count = useCart((s) => cartCount(s.lines))
  const inAdmin = useLocation().pathname.startsWith('/admin')
  const auth = useAuth()

  useEffect(() => {
    document.title = inAdmin ? `${SHOP_NAME} | Admin` : SHOP_NAME
  }, [inAdmin])

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to={inAdmin ? '/admin' : '/'} className="font-display text-2xl font-semibold tracking-tight">
          <Wordmark />
          {inAdmin && <span className="ml-2 align-middle text-xs font-sans font-medium uppercase tracking-widest text-brand-ink">Admin</span>}
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          {inAdmin ? (
            auth.status === 'signed-in' && auth.isAdmin ? (
              <AdminMenu email={auth.session.user.email ?? ''} />
            ) : (
              <Link to="/" className="btn-ghost">View shop</Link>
            )
          ) : (
            <NavLink to="/cart" {...{ [CART_TARGET_ATTR]: '' }} className="relative flex h-10 w-10 items-center justify-center rounded-full transition hover:text-brand-ink" aria-label={`Cart, ${count} items`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M2.5 3.5h2.2l2.4 11.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.1L20.5 7.5H5.6" />
                <circle cx="9.5" cy="19.75" r="1.25" />
                <circle cx="17" cy="19.75" r="1.25" />
              </svg>
              {count > 0 && (
                <span className="absolute right-0 top-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-semibold leading-none text-white">
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </NavLink>
          )}
        </nav>
      </div>
    </header>
  )
}
