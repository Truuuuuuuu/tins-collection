import { pageUsername } from './messenger'

/** The shop's Facebook page. Uses VITE_FB_PAGE_URL, or falls back to facebook.com/<Messenger username>. */
export function facebookUrl(): string | null {
  const url = (import.meta.env.VITE_FB_PAGE_URL || '').trim()
  if (url) return /^https?:\/\//i.test(url) ? url : `https://${url}`
  const username = pageUsername()
  if (!username) return null
  // Pages without a username only resolve through profile.php; facebook.com/<id> is a dead link.
  return /^\d+$/.test(username)
    ? `https://www.facebook.com/profile.php?id=${username}`
    : `https://www.facebook.com/${encodeURIComponent(username)}`
}

/** True inside Facebook's or Messenger's built-in browser (the site opened from a link in the app). */
export function inFacebookApp(): boolean {
  return typeof navigator !== 'undefined' && /FBAN|FBAV|FB_IAB|FBIOS|MessengerForiOS/i.test(navigator.userAgent)
}

/**
 * Link to the Facebook page for the current browser. Facebook's built-in browser can't open
 * links in a new tab and ignores fb:// links, so there it opens the page in the same tab.
 */
export function facebookLink(): { href: string; newTab: boolean } | null {
  const url = facebookUrl()
  if (!url) return null
  return { href: url, newTab: !inFacebookApp() }
}

export const storeAddress = (import.meta.env.VITE_STORE_ADDRESS || '').trim()

/**
 * Exact map pin as "lat, lng". Google Maps can't place puroks precisely from the address text,
 * so when this is set, directions use it while customers still read the address.
 */
const storeCoords = (() => {
  const m = (import.meta.env.VITE_STORE_COORDS || '').match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/)
  return m ? `${m[1]},${m[2]}` : null
})()

/** Opens the store in Google Maps (the app on phones), at the exact coordinates when set. */
export function mapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(storeCoords ?? address)}`
}
