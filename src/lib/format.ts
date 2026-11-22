export const SHOP_NAME = "Tin's Collection"

const peso = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

export function formatPrice(amount: number): string {
  return peso.format(amount)
}

/** "₱240" when both ends match, otherwise "₱240 – ₱280". */
export function formatPriceRange({ min, max }: { min: number; max: number }): string {
  return min === max ? peso.format(min) : `${peso.format(min)} – ${peso.format(max)}`
}

/** Supabase errors are plain objects with a message, not Error instances. */
export function errorMessage(e: unknown, fallback: string): string {
  if (e && typeof e === 'object' && 'message' in e && typeof e.message === 'string' && e.message) return e.message
  return fallback
}
