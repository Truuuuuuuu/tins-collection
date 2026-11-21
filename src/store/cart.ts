import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Condition, Product } from '../lib/types'
import { isSoldOut, sizeLabel } from '../lib/types'

export interface CartLine {
  productId: string
  variantId: string
  name: string
  size: string
  /** Optional because carts saved before conditions existed don't have it. */
  condition?: Condition
  price: number
  qty: number
  image?: string
}

interface CartState {
  lines: CartLine[]
  add: (line: CartLine, maxStock: number) => void
  setQty: (variantId: string, qty: number) => void
  remove: (variantId: string) => void
  clear: () => void
  /** Caps or drops lines against current stock. Returns names of items that changed. */
  reconcile: (products: Product[]) => string[]
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      add: (line, maxStock) =>
        set((s) => {
          const existing = s.lines.find((l) => l.variantId === line.variantId)
          if (existing) {
            return {
              lines: s.lines.map((l) =>
                l.variantId === line.variantId ? { ...l, qty: Math.min(maxStock, l.qty + line.qty) } : l,
              ),
            }
          }
          return { lines: [...s.lines, { ...line, qty: Math.min(maxStock, line.qty) }] }
        }),
      setQty: (variantId, qty) =>
        set((s) => ({ lines: s.lines.map((l) => (l.variantId === variantId ? { ...l, qty: Math.max(1, qty) } : l)) })),
      remove: (variantId) => set((s) => ({ lines: s.lines.filter((l) => l.variantId !== variantId) })),
      clear: () => set({ lines: [] }),
      reconcile: (products) => {
        const changed: string[] = []
        const next: CartLine[] = []
        for (const line of get().lines) {
          const product = products.find((p) => p.id === line.productId)
          const variant = product?.product_variants.find((v) => v.id === line.variantId)
          const label = sizeLabel(line.size) ? `${line.name} (${line.size})` : line.name
          if (!product || !variant || isSoldOut(product) || variant.stock === 0) {
            changed.push(`${label} is no longer available`)
            continue
          }
          let updated = { ...line, price: product.price, name: product.name, size: variant.size }
          if (line.qty > variant.stock) {
            changed.push(`${label} reduced to ${variant.stock}, the stock left`)
            updated = { ...updated, qty: variant.stock }
          }
          next.push(updated)
        }
        set({ lines: next })
        return changed
      },
    }),
    { name: 'tins-cart' },
  ),
)

export const cartCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.qty, 0)
export const cartTotal = (lines: CartLine[]) => lines.reduce((n, l) => n + l.qty * l.price, 0)
