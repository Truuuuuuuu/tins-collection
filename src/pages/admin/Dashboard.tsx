import { useState } from 'react'
import { Link } from 'react-router-dom'
import SoldOutBadge from '../../components/SoldOutBadge'
import StockStepper from '../../components/StockStepper'
import Toast from '../../components/Toast'
import { errorMessage, formatPrice } from '../../lib/format'
import { imageUrl } from '../../lib/images'
import { deleteProduct, setSoldOut, updateStock } from '../../lib/products'
import type { Product } from '../../lib/types'
import { CONDITION_LABEL, isSoldOut, sizeLabel, totalStock } from '../../lib/types'
import { useProducts } from '../../lib/useProducts'

export default function Dashboard() {
  const { products, setProducts, loading, error, reload } = useProducts()
  const [query, setQuery] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<Product | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const patch = (id: string, fn: (p: Product) => Product) =>
    setProducts((ps) => ps.map((p) => (p.id === id ? fn(p) : p)))

  const run = async (id: string, action: () => Promise<void>, success: string) => {
    setBusyId(id)
    try {
      await action()
      setToast(success)
    } catch (e) {
      setToast(errorMessage(e, 'Something went wrong'))
      reload()
    } finally {
      setBusyId(null)
    }
  }

  const changeStock = (p: Product, variantId: string, stock: number) => {
    const value = Math.max(0, Math.floor(stock || 0))
    patch(p.id, (x) => ({ ...x, product_variants: x.product_variants.map((v) => (v.id === variantId ? { ...v, stock: value } : v)) }))
    run(p.id, () => updateStock(variantId, value), 'Stock updated')
  }

  const toggleSoldOut = (p: Product) => {
    patch(p.id, (x) => ({ ...x, is_sold_out: !x.is_sold_out }))
    run(p.id, () => setSoldOut(p.id, !p.is_sold_out), p.is_sold_out ? 'Marked available' : 'Marked sold out')
  }

  const confirmDelete = async () => {
    if (!confirming) return
    const p = confirming
    setConfirming(null)
    await run(p.id, async () => {
      await deleteProduct(p)
      setProducts((ps) => ps.filter((x) => x.id !== p.id))
    }, `Deleted ${p.name} and its photos`)
  }

  const q = query.trim().toLowerCase()
  const visible = products.filter((p) => !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
  const imageCount = products.reduce((n, p) => n + p.image_paths.length, 0)

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Items</h1>
          <p className="mt-1 text-sm text-muted">
            {products.length} items · {products.filter(isSoldOut).length} sold out · {imageCount} photos stored
          </p>
        </div>
        <Link to="/admin/new" className="btn-primary">+ Add item</Link>
      </div>

      <input type="search" placeholder="Search by name or category" className="input mt-6 sm:max-w-xs" value={query} onChange={(e) => setQuery(e.target.value)} />

      {error && <p className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {loading ? (
        <p className="py-16 text-center text-muted">Loading…</p>
      ) : visible.length === 0 ? (
        <p className="py-16 text-center text-muted">{products.length ? 'No matches.' : 'No items yet. Add your first one!'}</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {visible.map((p) => (
            <li key={p.id} className={`rounded-2xl border border-line bg-surface p-4 ${busyId === p.id ? 'opacity-70' : ''}`}>
              <div className="flex gap-4">
                <div className="h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-subtle">
                  {p.image_paths[0] && <img src={imageUrl(p.image_paths[0])} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate font-medium">{p.name}</h2>
                    {isSoldOut(p) && <SoldOutBadge />}
                  </div>
                  <p className="text-sm text-muted">
                    {formatPrice(p.price)} · {CONDITION_LABEL[p.condition]}{p.category && ` · ${p.category}`} · {totalStock(p)} in stock
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {p.product_variants.map((v) => (
                      <StockStepper key={v.id} size={sizeLabel(v.size) ?? 'Stock'} stock={v.stock} onCommit={(n) => changeStock(p, v.id, n)} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-3">
                <button className="btn-ghost px-4 py-1.5" onClick={() => toggleSoldOut(p)} disabled={busyId === p.id}>
                  {p.is_sold_out ? 'Mark available' : 'Mark sold out'}
                </button>
                <Link to={`/admin/edit/${p.id}`} className="btn-ghost px-4 py-1.5">Edit</Link>
                <button className="btn-danger ml-auto px-4 py-1.5" onClick={() => setConfirming(p)} disabled={busyId === p.id}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {confirming && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 sm:items-center" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl bg-surface p-5">
            <h2 className="font-display text-xl">Delete “{confirming.name}”?</h2>
            <p className="mt-2 text-sm text-muted">
              This permanently removes the item, its sizes and {confirming.image_paths.length} photo(s) to free up space. It can't be undone.
            </p>
            <div className="mt-5 flex gap-3">
              <button className="btn flex-1 bg-red-700 text-white hover:bg-red-800" onClick={confirmDelete}>Delete</button>
              <button className="btn-ghost flex-1" onClick={() => setConfirming(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      <Toast message={toast} onDone={() => setToast(null)} />
    </>
  )
}
