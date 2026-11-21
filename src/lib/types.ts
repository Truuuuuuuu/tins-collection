export type Condition = 'new' | 'preloved'

export const CONDITION_LABEL: Record<Condition, string> = {
  new: 'Brand new',
  preloved: 'Pre-loved',
}

/**
 * Items without sizes (bags, jewelry…) still keep one stock row, stored under this name.
 * Shoppers never see it: there's no size picker, and carts and orders leave the size out.
 */
export const NO_SIZE = 'One size'

/** The size to show customers, or null for items without sizes. */
export function sizeLabel(size: string): string | null {
  return size === NO_SIZE ? null : size
}

export function hasSizes(variants: Pick<Variant, 'size'>[]): boolean {
  return !(variants.length === 1 && variants[0].size === NO_SIZE)
}

export type ItemType = 'clothing' | 'accessories'

export const ITEM_TYPE_LABEL: Record<ItemType, string> = {
  accessories: 'Accessories',
  clothing: 'Clothing',
}

/** Accessories are the items saved without sizes. */
export function itemType(p: Pick<Product, 'product_variants'>): ItemType {
  return hasSizes(p.product_variants) ? 'clothing' : 'accessories'
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
