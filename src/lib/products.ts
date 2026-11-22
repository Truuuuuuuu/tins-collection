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
    product_variants: [...p.product_variants].sort((a, b) => a.sort_order - b.sort_order),
  }
}

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select(SELECT)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as Product[]).map(normalize)
}

export async function fetchProduct(id: string): Promise<Product | null> {
  const { data, error } = await supabase.from('products').select(SELECT).eq('id', id).maybeSingle()
  if (error) throw error
  return data ? normalize(data as Product) : null
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

/** Removes the photos from storage first, then the row (sizes go with it via cascade). */
export async function deleteProduct(product: Product): Promise<void> {
  await deleteImages(product.image_paths)
  const { error } = await supabase.from('products').delete().eq('id', product.id)
  if (error) throw error
}

export async function updateStock(variantId: string, stock: number): Promise<void> {
  const { error } = await supabase
    .from('product_variants')
    .update({ stock: Math.max(0, Math.floor(stock)) })
    .eq('id', variantId)
  if (error) throw error
}

export async function setSoldOut(productId: string, soldOut: boolean): Promise<void> {
  const { error } = await supabase.from('products').update({ is_sold_out: soldOut }).eq('id', productId)
  if (error) throw error
}

/** Rewrites one item's category, used to tidy up mismatched spellings ("pAnts" → "Pants"). */
export async function updateCategory(productId: string, category: string): Promise<void> {
  const { error } = await supabase.from('products').update({ category }).eq('id', productId)
  if (error) throw error
}
