/** The header cart icon marks itself with this attribute so animations can find it. */
export const CART_TARGET_ATTR = 'data-cart-target'

const DURATION = 750

/** True when the element's centre is on screen. */
function isOnScreen(el: HTMLElement) {
  const r = el.getBoundingClientRect()
  const cy = r.top + r.height / 2
  return cy > 0 && cy < window.innerHeight
}

/**
 * Sends a small copy of the product photo into the header cart icon, then gives the icon a little
 * bounce. It starts from the first element in `sources` that's on screen (the photo, or the button
 * when the photo is scrolled away). Skipped for people who prefer reduced motion.
 */
export function flyToCart(sources: (HTMLElement | null)[], imageSrc: string | undefined) {
  const target = document.querySelector<HTMLElement>(`[${CART_TARGET_ATTR}]`)
  const from = sources.find((el): el is HTMLElement => el !== null && isOnScreen(el))
  if (!from || !target || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const start = from.getBoundingClientRect()
  const end = target.getBoundingClientRect()

  // Start as a thumbnail centred on the photo, end as a dot on the cart.
  const size = Math.min(140, start.width * 0.45, Math.max(56, start.height * 1.2))
  const x0 = start.left + start.width / 2 - size / 2
  const y0 = start.top + start.height / 2 - size / 2
  const dx = end.left + end.width / 2 - (x0 + size / 2)
  const dy = end.top + end.height / 2 - (y0 + size / 2)

  const ghost = document.createElement(imageSrc ? 'img' : 'div')
  if (ghost instanceof HTMLImageElement && imageSrc) ghost.src = imageSrc
  ghost.setAttribute('aria-hidden', 'true')
  Object.assign(ghost.style, {
    position: 'fixed',
    left: `${x0}px`,
    top: `${y0}px`,
    width: `${size}px`,
    height: `${size}px`,
    objectFit: 'cover',
    borderRadius: '9999px',
    background: 'var(--color-brand)',
    boxShadow: '0 10px 30px rgb(0 0 0 / 0.2)',
    border: '3px solid white',
    zIndex: '60',
    pointerEvents: 'none',
  })
  document.body.appendChild(ghost)

  // A lifted midpoint makes the path arc up and over instead of a straight line.
  const lift = Math.min(120, Math.abs(dy) * 0.35 + 40)
  const flight = ghost.animate(
    [
      { transform: 'translate(0, 0) scale(1)', opacity: 1 },
      { transform: `translate(${dx * 0.45}px, ${dy * 0.45 - lift}px) scale(0.6)`, opacity: 1, offset: 0.45 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.12)`, opacity: 0.6 },
    ],
    { duration: DURATION, easing: 'cubic-bezier(0.5, 0, 0.3, 1)' },
  )

  flight.onfinish = flight.oncancel = () => {
    ghost.remove()
    target.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(0.95)' }, { transform: 'scale(1)' }],
      { duration: 400, easing: 'ease-out' },
    )
  }
}
