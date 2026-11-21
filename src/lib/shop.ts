import { pageUsername } from './messenger'

/** The shop's Facebook page. Uses VITE_FB_PAGE_URL, or falls back to facebook.com/<Messenger username>. */
export function facebookUrl(): string | null {
  const url = (import.meta.env.VITE_FB_PAGE_URL || '').trim()
  if (url) return /^https?:\/\//i.test(url) ? url : `https://${url}`
  const username = pageUsername()
  return username ? `https://www.facebook.com/${encodeURIComponent(username)}` : null
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
