import { deleteImages } from './images'
import { supabase } from './supabase'
import type { Product, ProductInput } from './types'

const SELECT = '*, product_variants(*)'

function normalize(p: Product): Product {
  return {
    ...p,
    price: Number(p.price),
    // Rows saved before the condition column existed count as brand new.
    condition: p.condition === 'preloved' ? 'preloved' : 'new',
    deleted_at: p.deleted_at ?? null,
    product_variants: [...p.product_variants]
      .map((v) => ({ ...v, measurements: v.measurements ?? '' }))
      .sort((a, b) => a.sort_order - b.sort_order),
  }
}

/** Items on sale (not in "Recently deleted"), newest first. */
export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select(SELECT)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as Product[]).map(normalize)
}

export async function fetchProduct(id: string): Promise<Product | null> {
  const { data, error } = await supabase.from('products').select(SELECT).eq('id', id).is('deleted_at', null).maybeSingle()
  if (error) throw error
  return data ? normalize(data as Product) : null
}

/** Days an item stays in "Recently deleted" before it's removed for good. */
export const TRASH_DAYS = 7

/** Admin only: items in "Recently deleted", most recently deleted first. */
export async function fetchDeletedProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select(SELECT)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })
  if (error) throw error
  return (data as Product[]).map(normalize)
}

async function syncVariants(productId: string, input: ProductInput): Promise<void> {
  const { data: existing, error: readErr } = await supabase
    .from('product_variants')
    .select('id')
    .eq('product_id', productId)
  if (readErr) throw readErr

  const keep = new Set(input.variants.filter((v) => v.id).map((v) => v.id))
  const removed = (existing ?? []).map((v) => v.id as string).filter((id) => !keep.has(id))
  if (removed.length) {
    const { error } = await supabase.from('product_variants').delete().in('id', removed)
    if (error) throw error
  }

  const rows = input.variants.map((v, i) => ({
    ...(v.id ? { id: v.id } : {}),
    product_id: productId,
    size: v.size.trim(),
    stock: v.stock,
    measurements: (v.measurements ?? '').trim(),
    sort_order: i,
  }))
  const updates = rows.filter((r) => 'id' in r)
  const inserts = rows.filter((r) => !('id' in r))
  if (updates.length) {
    const { error } = await supabase.from('product_variants').upsert(updates)
    if (error) throw error
  }
  if (inserts.length) {
    const { error } = await supabase.from('product_variants').insert(inserts)
    if (error) throw error
  }
}

function productRow(input: ProductInput) {
  return {
    name: input.name.trim(),
    description: input.description.trim(),
    price: input.price,
    category: input.category.trim(),
    condition: input.condition,
    image_paths: input.image_paths,
    is_sold_out: input.is_sold_out,
  }
}

export async function createProduct(input: ProductInput): Promise<string> {
  const { data, error } = await supabase.from('products').insert(productRow(input)).select('id').single()
  if (error) throw error
  await syncVariants(data.id, input)
  return data.id
}

export async function updateProduct(id: string, input: ProductInput): Promise<void> {
  const { error } = await supabase.from('products').update(productRow(input)).eq('id', id)
  if (error) throw error
  await syncVariants(id, input)
}

/** Moves items to "Recently deleted". Nothing is removed yet, so they can be restored. */
export async function trashProducts(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const { error } = await supabase.from('products').update({ deleted_at: new Date().toISOString() }).in('id', ids)
  if (error) throw error
}

export async function restoreProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products').update({ deleted_at: null }).eq('id', id)
  if (error) throw error
}

/** Deletes for good: the photos from storage first, then the row (sizes go with it via cascade). */
export async function deleteProductForever(product: Product): Promise<void> {
  await deleteImages(product.image_paths)
  const { error } = await supabase.from('products').delete().eq('id', product.id)
  if (error) throw error
}

/** Removes items that have been in "Recently deleted" longer than TRASH_DAYS. Returns how many. */
export async function purgeExpiredTrash(): Promise<number> {
  const cutoff = new Date(Date.now() - TRASH_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase.from('products').select(SELECT).lt('deleted_at', cutoff)
  if (error) throw error
  const expired = (data as Product[]).map(normalize)
  for (const p of expired) await deleteProductForever(p)
  return expired.length
}

export async function updateStock(variantId: string, stock: number): Promise<void> {
  const { error } = await supabase
    .from('product_variants')
    .update({ stock: Math.max(0, Math.floor(stock)) })
    .eq('id', variantId)
  if (error) throw error
}

export async function setSoldOut(productIds: string | string[], soldOut: boolean): Promise<void> {
  const ids = Array.isArray(productIds) ? productIds : [productIds]
  const { error } = await supabase.from('products').update({ is_sold_out: soldOut }).in('id', ids)
  if (error) throw error
}

/** Rewrites the category of one or more items, e.g. to tidy up spellings ("pAnts" → "Pants"). */
export async function updateCategory(productIds: string | string[], category: string): Promise<void> {
  const ids = Array.isArray(productIds) ? productIds : [productIds]
  const { error } = await supabase.from('products').update({ category: category.trim() }).in('id', ids)
  if (error) throw error
}
