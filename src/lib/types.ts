export type Condition = 'new' | 'preloved'

export const CONDITION_LABEL: Record<Condition, string> = {
  new: 'Brand new',
  preloved: 'Pre-loved',
}

export interface Variant {
  id: string
  product_id: string
  size: string
  stock: number
  sort_order: number
}

export interface Product {
  id: string
  name: string
  description: string
  price: number
  category: string
  condition: Condition
  image_paths: string[]
  is_sold_out: boolean
  created_at: string
  updated_at: string
  product_variants: Variant[]
}

export interface VariantInput {
  id?: string
  size: string
  stock: number
}

export interface ProductInput {
  name: string
  description: string
  price: number
  category: string
  condition: Condition
  image_paths: string[]
  is_sold_out: boolean
  variants: VariantInput[]
}

export function totalStock(p: Product): number {
  return p.product_variants.reduce((sum, v) => sum + v.stock, 0)
}

/** Sold out when the admin flagged it, or every size is at 0. */
export function isSoldOut(p: Product): boolean {
  return p.is_sold_out || totalStock(p) === 0
}
