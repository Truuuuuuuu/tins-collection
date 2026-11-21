import { useLayoutEffect } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

/**
 * Opens each new page at the top. The app switches pages without reloading, so the browser would
 * otherwise keep the old scroll position (e.g. landing halfway down the cart). Back/forward (POP)
 * is left alone so returning to the shop keeps your place.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation()
  const navigationType = useNavigationType()

  useLayoutEffect(() => {
    if (navigationType !== 'POP') window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname, navigationType])

  return null
}
