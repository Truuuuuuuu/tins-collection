import { supabase } from './supabase'
import type { Product, Sale } from './types'

export interface SaleLineInput {
  variantId: string
  qty: number
  unitPrice: number
}

/** Saves the sale and lowers stock in one step (see record_sale in schema.sql). */
export async function recordSale(lines: SaleLineInput[], orderCode = ''): Promise<void> {
  const items = lines.map((l) => ({ variant_id: l.variantId, qty: l.qty, unit_price: l.unitPrice }))
  const { error } = await supabase.rpc('record_sale', { items, code: orderCode })
  if (error) throw error
}

/** Removes a sale and puts its stock back. */
export async function undoSale(saleId: string): Promise<void> {
  const { error } = await supabase.rpc('undo_sale', { sale_id: saleId })
  if (error) throw error
}

export async function fetchSales(since?: Date): Promise<Sale[]> {
  let q = supabase.from('sales').select('*').order('sold_at', { ascending: false })
  if (since) q = q.gte('sold_at', since.toISOString())
  const { data, error } = await q
  if (error) throw error
  return (data as Sale[]).map((s) => ({ ...s, unit_price: Number(s.unit_price) }))
}

export const saleTotal = (sales: Pick<Sale, 'qty' | 'unit_price'>[]) =>
  sales.reduce((n, s) => n + s.qty * s.unit_price, 0)

export const startOfMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1)

// ---------- Order codes ----------
// The cart adds a short code to the Messenger message, e.g. "TC-3f9a1b2c.2-8e7d6f5a.1":
// each part is the first 8 characters of a size's ID plus the quantity. Pasting it (or the whole
// message) into "Record sale" fills in the items, so nothing has to be picked by hand.

const CODE_PREFIX = 'TC'
const ID_CHARS = 8

export function buildOrderCode(lines: { variantId: string; qty: number }[]): string {
  return [CODE_PREFIX, ...lines.map((l) => `${l.variantId.replace(/-/g, '').slice(0, ID_CHARS)}.${l.qty}`)].join('-')
}

export interface ParsedOrderLine {
  product: Product
  variantId: string
  qty: number
}

/**
 * Finds an order code anywhere in the pasted text and matches it against current items.
 * Returns null when there's no code; `missing` counts parts whose item no longer exists.
 */
export function parseOrderCode(text: string, products: Product[]): { code: string; lines: ParsedOrderLine[]; missing: number } | null {
  const match = text.match(new RegExp(`${CODE_PREFIX}(?:-[0-9a-f]{${ID_CHARS}}\\.\\d+)+`, 'i'))
  if (!match) return null
  const code = match[0]
  const lines: ParsedOrderLine[] = []
  let missing = 0
  for (const part of code.split('-').slice(1)) {
    const [prefix, qtyText] = part.toLowerCase().split('.')
    const qty = Math.max(1, Number(qtyText) || 1)
    const product = products.find((p) => p.product_variants.some((v) => v.id.replace(/-/g, '').startsWith(prefix)))
    const variant = product?.product_variants.find((v) => v.id.replace(/-/g, '').startsWith(prefix))
    if (!product || !variant) missing++
    else lines.push({ product, variantId: variant.id, qty })
  }
  return { code, lines, missing }
}
