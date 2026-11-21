import { formatPrice, SHOP_NAME } from './format'
import type { CartLine } from '../store/cart'
import { sizeLabel } from './types'

export function buildOrderMessage(lines: CartLine[]): string {
  const items = lines.map(
    (l, i) => {
      const details = [sizeLabel(l.size), l.condition === 'preloved' ? 'pre-loved' : null].filter(Boolean)
      const suffix = details.length ? ` (${details.join(', ')})` : ''
      return `${i + 1}. ${l.name}${suffix} × ${l.qty} — ${formatPrice(l.price * l.qty)}`
    },
  )
  const total = lines.reduce((sum, l) => sum + l.price * l.qty, 0)
  return [`Hi ${SHOP_NAME}! I'd like to order:`, ...items, '', `Total: ${formatPrice(total)}`].join('\n')
}

/**
 * The page username, or its ID number when it has no username. Accepts a bare value or a pasted
 * link like https://m.me/name, https://facebook.com/name or https://facebook.com/profile.php?id=123
 */
export function pageUsername(): string {
  const raw = (import.meta.env.VITE_FB_PAGE_USERNAME || '').trim()
  const id = raw.match(/profile\.php\?(?:.*&)?id=(\d+)/i)
  if (id) return id[1]
  return raw
    .replace(/^https?:\/\/(www\.|m\.)?(m\.me|facebook\.com|fb\.com)\//i, '')
    .replace(/[/?#].*$/, '')
}

export function messengerUrl(): string {
  return `https://m.me/${encodeURIComponent(pageUsername())}`
}

/** Returns true when the message landed on the clipboard. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
