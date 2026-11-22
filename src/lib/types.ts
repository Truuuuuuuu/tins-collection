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
  /** Free text, e.g. "Chest 36in, Length 26in". Empty when not given. */
  measurements: string
  /** This size's own price, or null to use the item's price. */
  price: number | null
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
  /** Set when the item is in "Recently deleted". */
  deleted_at: string | null
  product_variants: Variant[]
}

export interface VariantInput {
  id?: string
  size: string
  stock: number
  measurements?: string
  /** Leave out (or null) to use the item's price. */
  price?: number | null
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

export type StockStatus = 'in-stock' | 'low' | 'sold-out'

export const STOCK_STATUS_LABEL: Record<StockStatus, string> = {
  'in-stock': 'In stock',
  low: 'Running low',
  'sold-out': 'Sold out',
}

/** Running low means 3 or fewer left, the point where shoppers see "Only N left". */
export function stockStatus(p: Product): StockStatus {
  if (isSoldOut(p)) return 'sold-out'
  return totalStock(p) <= 3 ? 'low' : 'in-stock'
}

export interface Sale {
  id: string
  sold_at: string
  order_code: string
  product_id: string | null
  variant_id: string | null
  product_name: string
  size: string
  category: string
  qty: number
  unit_price: number
}

/** What one size costs: its own price if it has one, otherwise the item's price. */
export function sizePrice(p: Pick<Product, 'price'>, v: Pick<Variant, 'price'>): number {
  return v.price ?? p.price
}

/** True when the item's sizes don't all cost the same. */
export function hasSizePrices(p: Product): boolean {
  return new Set(p.product_variants.map((v) => sizePrice(p, v))).size > 1
}

/**
 * Lowest and highest price. By default over sizes a shopper can still buy (every size when the
 * item is sold out); pass `allSizes` for the admin, who sees out-of-stock sizes too.
 */
export function priceRange(p: Product, allSizes = false): { min: number; max: number } {
  const inStock = p.product_variants.filter((v) => v.stock > 0)
  const sizes = !allSizes && inStock.length > 0 ? inStock : p.product_variants
  const prices = sizes.length > 0 ? sizes.map((v) => sizePrice(p, v)) : [p.price]
  return { min: Math.min(...prices), max: Math.max(...prices) }
}
