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

/** Supabase errors are plain objects with a message, not Error instances. */
export function errorMessage(e: unknown, fallback: string): string {
  if (e && typeof e === 'object' && 'message' in e && typeof e.message === 'string' && e.message) return e.message
  return fallback
}
