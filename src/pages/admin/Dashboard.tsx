import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import FilterMenu from '../../components/FilterMenu'
import { AdminListSkeleton, Bone } from '../../components/Skeletons'
import SoldOutBadge from '../../components/SoldOutBadge'
import StockStepper from '../../components/StockStepper'
import Toast from '../../components/Toast'
import { errorMessage, formatPrice } from '../../lib/format'
import { imageUrl } from '../../lib/images'
import { deleteProduct, setSoldOut, updateCategory, updateStock } from '../../lib/products'
import { categoryKey, categoryOptions, matchCategory } from '../../lib/categories'
import type { Condition, ItemType, Product, StockStatus } from '../../lib/types'
import { CONDITION_LABEL, ITEM_TYPE_LABEL, STOCK_STATUS_LABEL, isSoldOut, itemType, sizeLabel, stockStatus, totalStock } from '../../lib/types'
import { useMediaQuery } from '../../lib/useMediaQuery'
import { useProducts } from '../../lib/useProducts'
import { useAdminSearch } from '../../store/search'

export default function Dashboard() {
  const { products, setProducts, loading, error, reload } = useProducts()
  const { query, setQuery } = useAdminSearch()
  // On large screens the search lives in the header, centered in the top bar.
  const searchInHeader = useMediaQuery('(min-width: 1024px)')
  const [toast, setToast] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<Product | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [types, setTypes] = useState<ItemType[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [conditions, setConditions] = useState<Condition[]>([])
  const [stock, setStock] = useState<StockStatus[]>([])
  const [tidying, setTidying] = useState(false)

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
  const allCategories = useMemo(() => categoryOptions(products.map((p) => p.category)), [products])
  const visible = products
    .filter((p) => types.length === 0 || types.includes(itemType(p)))
    .filter((p) => categories.length === 0 || categories.includes(categoryKey(p.category)))
    .filter((p) => conditions.length === 0 || conditions.includes(p.condition))
    .filter((p) => stock.length === 0 || stock.includes(stockStatus(p)))
    .filter((p) => !q || p.name.toLowerCase().includes(q) || categoryKey(p.category).includes(q))
  const activeFilters = [
    ...types.map((t) => ({ key: `type-${t}`, label: ITEM_TYPE_LABEL[t], remove: () => setTypes((xs) => xs.filter((x) => x !== t)) })),
    ...conditions.map((c) => ({ key: `condition-${c}`, label: CONDITION_LABEL[c], remove: () => setConditions((xs) => xs.filter((x) => x !== c)) })),
    ...categories.map((c) => ({ key: `category-${c}`, label: allCategories.find((o) => o.key === c)?.label ?? c, remove: () => setCategories((xs) => xs.filter((x) => x !== c)) })),
    ...stock.map((s) => ({ key: `stock-${s}`, label: STOCK_STATUS_LABEL[s], remove: () => setStock((xs) => xs.filter((x) => x !== s)) })),
  ]
  // Items saved with a different spelling of an existing category ("pAnts" when "Pants" exists).
  const mismatched = products.filter((p) => p.category && matchCategory(p.category, allCategories) !== p.category)
  const tidyCategories = async () => {
    setTidying(true)
    try {
      for (const p of mismatched) {
        const category = matchCategory(p.category, allCategories)
        await updateCategory(p.id, category)
        patch(p.id, (x) => ({ ...x, category }))
      }
      setToast(`Tidied ${plural(mismatched.length, 'category name')}`)
    } catch (e) {
      setToast(errorMessage(e, 'Could not tidy categories'))
      reload()
    } finally {
      setTidying(false)
    }
  }

  const clearFilters = () => {
    setTypes([])
    setCategories([])
    setConditions([])
    setStock([])
  }
  const soldOutCount = products.filter(isSoldOut).length
  const available = products.filter((p) => !isSoldOut(p))
  // Only stock that can actually be bought: items marked sold out don't count.
  const unitsInStock = available.reduce((n, p) => n + totalStock(p), 0)
  // What everything still for sale is worth at its listed price (price × units in stock).
  const inventoryValue = available.reduce((n, p) => n + p.price * totalStock(p), 0)
  // Same "Only N left" threshold shoppers see on product cards.
  const runningLow = available.filter((p) => totalStock(p) <= 3).length
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

  return (
    <>
      <section aria-labelledby="overview-title">
        <h1 id="overview-title" className="font-display text-3xl">Overview</h1>
        {/* Phones: the money card spans the full width, the two counts sit side by side below it. */}
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
          <StatCard
            loading={loading}
            label="Inventory value"
            value={formatPrice(Math.round(inventoryValue))}
            className="col-span-2 md:col-span-1"
            note={`Across ${plural(products.length, 'item')} listed`}
          />
          <StatCard
            loading={loading}
            label="Sold out"
            value={soldOutCount}
            highlight={soldOutCount > 0}
            note={
              products.length === 0
                ? 'Nothing listed yet'
                : soldOutCount === 0
                  ? 'Everything is available'
                  : `${Math.round((soldOutCount / products.length) * 100)}% of your items`
            }
          />
          <StatCard
            loading={loading}
            label="Units in stock"
            value={unitsInStock}
            note={runningLow > 0 ? `${plural(runningLow, 'item')} running low` : 'Ready to sell'}
          />
        </div>
      </section>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-display text-2xl">Items</h2>
        <Link to="/admin/new" className="btn-primary">+ Add item</Link>
      </div>

      <div className="mt-6 flex gap-2 sm:max-w-md">
        {!searchInHeader && (
          <input type="search" placeholder="Search by name or category" aria-label="Search by name or category" className="input h-10 border-brand/50" value={query} onChange={(e) => setQuery(e.target.value)} />
        )}
        <FilterMenu
          types={types}
          onTypesChange={setTypes}
          categories={allCategories}
          selected={categories}
          onChange={setCategories}
          conditions={conditions}
          onConditionsChange={setConditions}
          stock={stock}
          onStockChange={setStock}
          resultCount={visible.length}
        />
      </div>

      {activeFilters.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {activeFilters.map((f) => (
            <button
              key={f.key}
              onClick={f.remove}
              className="flex items-center gap-1.5 rounded-full bg-brand-soft py-1 pl-3 pr-2 text-sm text-brand-ink hover:bg-brand/15"
              aria-label={`Remove ${f.label} filter`}
            >
              {f.label}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          ))}
          <button onClick={clearFilters} className="px-1 text-sm text-muted hover:text-brand-ink">
            Clear all
          </button>
          <span className="ml-auto text-sm text-muted">
            Showing {visible.length} of {products.length}
          </span>
        </div>
      )}

      {!loading && mismatched.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p>
            {plural(mismatched.length, 'item')} {mismatched.length === 1 ? 'uses' : 'use'} a different spelling of an existing category
            {' '}(e.g. “{mismatched[0].category}” → “{matchCategory(mismatched[0].category, allCategories)}”).
          </p>
          <button className="btn-ghost px-4 py-1.5" onClick={tidyCategories} disabled={tidying}>
            {tidying ? 'Tidying…' : 'Tidy up'}
          </button>
        </div>
      )}

      {error && <p className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {loading ? (
        <AdminListSkeleton />
      ) : visible.length === 0 ? (
        <p className="py-16 text-center text-muted">{products.length ? 'No items match your search or filters.' : 'No items yet. Add your first one!'}</p>
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
                    <h3 className="truncate font-medium">{p.name}</h3>
                    {isSoldOut(p) && <SoldOutBadge />}
                  </div>
                  <p className="text-sm text-muted">
                    {formatPrice(p.price)} · {CONDITION_LABEL[p.condition]}{p.category && ` · ${matchCategory(p.category, allCategories)}`} · {totalStock(p)} in stock
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

/** One number on the Overview row. */
function StatCard({ label, value, note, loading, highlight = false, className = '' }: {
  label: string
  value: number | string
  note: string
  loading: boolean
  highlight?: boolean
  className?: string
}) {
  const shown = typeof value === 'number' ? value.toLocaleString() : value
  return (
    <div className={`min-w-0 rounded-2xl border border-line bg-surface p-4 md:p-5 ${className}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      {loading ? (
        <>
          <Bone className="mt-2 h-9 w-20" />
          <Bone className="mt-2 h-3 w-4/5" />
        </>
      ) : (
        <>
          {/* Long amounts wrap instead of spilling out of the card. */}
          <p className={`mt-1 font-display text-3xl leading-tight tabular-nums [overflow-wrap:anywhere] md:text-2xl lg:text-3xl xl:text-4xl ${highlight ? 'text-brand-ink' : ''}`}>
            {shown}
          </p>
          <p className="mt-1 text-xs leading-snug text-muted">{note}</p>
        </>
      )}
    </div>
  )
}
