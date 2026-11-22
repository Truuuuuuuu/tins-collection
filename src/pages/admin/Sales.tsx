import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ConfirmSheet from '../../components/ConfirmSheet'
import CountStepper from '../../components/CountStepper'
import Pagination from '../../components/Pagination'
import { CategoryBars, RevenueChart } from '../../components/SalesCharts'
import { AdminListSkeleton, Bone } from '../../components/Skeletons'
import Toast from '../../components/Toast'
import { errorMessage, formatPrice } from '../../lib/format'
import { imageUrl } from '../../lib/images'
import { fetchSales, parseOrderCode, recordSale, saleTotal, startOfMonth, undoSale } from '../../lib/sales'
import type { Product, Sale } from '../../lib/types'
import { sizeLabel, sizePrice } from '../../lib/types'
import { usePagination } from '../../lib/usePagination'
import { useProducts } from '../../lib/useProducts'

type Period = 'month' | 'last-month' | 'all'
const PERIOD_LABEL: Record<Period, string> = { month: 'This month', 'last-month': 'Last month', all: 'All time' }

function periodRange(period: Period): [Date | null, Date | null] {
  const thisMonth = startOfMonth()
  if (period === 'month') return [thisMonth, null]
  if (period === 'last-month') return [new Date(thisMonth.getFullYear(), thisMonth.getMonth() - 1, 1), thisMonth]
  return [null, null]
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
const dayFormat = new Intl.DateTimeFormat('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
const timeFormat = new Intl.DateTimeFormat('en-PH', { hour: 'numeric', minute: '2-digit' })

export default function Sales() {
  const [sales, setSales] = useState<Sale[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [period, setPeriod] = useState<Period>('month')
  const [toast, setToast] = useState<string | null>(null)
  const [undoing, setUndoing] = useState<string | null>(null)
  const [confirmUndo, setConfirmUndo] = useState<Sale | null>(null)
  const [params, setParams] = useSearchParams()
  const recordOpen = params.get('record') === '1'
  const { products, reload: reloadProducts } = useProducts()

  const load = () =>
    fetchSales()
      .then((s) => {
        setSales(s)
        setLoadError(null)
      })
      .catch((e) => setLoadError(errorMessage(e, 'Could not load sales')))

  useEffect(() => {
    load()
  }, [])

  const [from, to] = periodRange(period)
  const inPeriod = useMemo(
    () => (sales ?? []).filter((s) => (!from || new Date(s.sold_at) >= from) && (!to || new Date(s.sold_at) < to)),
    [sales, from, to],
  )
  const pieces = inPeriod.reduce((n, s) => n + s.qty, 0)
  // A pasted order code ties lines into one order; lines without a code count as their own order.
  const orders = new Set(inPeriod.map((s) => s.order_code || s.id)).size

  const bestSellers = useMemo(() => {
    const byItem = new Map<string, { name: string; qty: number; total: number }>()
    for (const s of inPeriod) {
      const key = s.product_id ?? s.product_name
      const row = byItem.get(key) ?? { name: s.product_name, qty: 0, total: 0 }
      row.qty += s.qty
      row.total += s.qty * s.unit_price
      byItem.set(key, row)
    }
    return [...byItem.values()].sort((a, b) => b.qty - a.qty || b.total - a.total).slice(0, 5)
  }, [inPeriod])

  // 20 sales per page, grouped by day. A day's total always covers the whole day,
  // even when its sales are split across two pages.
  const pager = usePagination(inPeriod, 20, period)
  const historyTop = useRef<HTMLElement>(null)
  const dayTotals = useMemo(() => {
    const totals = new Map<string, number>()
    for (const s of inPeriod) {
      const day = dayFormat.format(new Date(s.sold_at))
      totals.set(day, (totals.get(day) ?? 0) + s.qty * s.unit_price)
    }
    return totals
  }, [inPeriod])
  const byDay = useMemo(() => {
    const days = new Map<string, Sale[]>()
    for (const s of pager.pageItems) {
      const day = dayFormat.format(new Date(s.sold_at))
      days.set(day, [...(days.get(day) ?? []), s])
    }
    return [...days.entries()]
  }, [pager.pageItems])

  // Runs while the confirm dialog stays open (showing "busy"), then closes it.
  const undo = async (sale: Sale) => {
    setUndoing(sale.id)
    try {
      await undoSale(sale.id)
      setSales((ss) => (ss ?? []).filter((s) => s.id !== sale.id))
      reloadProducts()
      setToast(`Undid the sale of ${sale.product_name}; stock put back`)
    } catch (e) {
      setToast(errorMessage(e, 'Could not undo the sale'))
    } finally {
      setUndoing(null)
    }
  }

  const setRecordOpen = (open: boolean) => setParams(open ? { record: '1' } : {}, { replace: true })

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">Sales</h1>
        {!recordOpen && (
          <button className="btn-primary" onClick={() => setRecordOpen(true)}>+ Record sale</button>
        )}
      </div>

      {recordOpen && (
        <RecordSale
          products={products}
          onCancel={() => setRecordOpen(false)}
          onSaved={(count) => {
            setRecordOpen(false)
            setToast(`Recorded ${plural(count, 'item')}; stock updated`)
            setPeriod('month')
            load()
            reloadProducts()
          }}
        />
      )}

      {loadError ? (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">Sales aren't set up in the database yet.</p>
          <p className="mt-1">
            Run <code className="rounded bg-white/70 px-1">supabase/schema.sql</code> again in Supabase → SQL Editor (see README), then reload this page.
          </p>
          <p className="mt-1 text-amber-800/80">Details: {loadError}</p>
        </div>
      ) : (
        <>
          <div className="mt-6 flex w-max gap-1 rounded-full border border-line bg-subtle p-1" role="group" aria-label="Period">
            {(Object.keys(PERIOD_LABEL) as Period[]).map((p) => (
              <button
                key={p}
                aria-pressed={period === p}
                onClick={() => setPeriod(p)}
                className={`min-h-9 rounded-full px-4 text-sm transition ${period === p ? 'bg-brand font-medium text-white shadow-sm shadow-brand/20' : 'text-muted hover:text-ink'}`}
              >
                {PERIOD_LABEL[p]}
              </button>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4">
            <Stat label="Revenue" value={sales ? formatPrice(Math.round(saleTotal(inPeriod))) : null} className="col-span-2 lg:col-span-1" />
            <Stat label="Pieces sold" value={sales ? pieces.toLocaleString() : null} positive={pieces > 0} />
            <Stat label="Orders" value={sales ? orders.toLocaleString() : null} />
          </div>

          {/* Charts follow the period buttons above, like every number on this page. */}
          {sales && inPeriod.length > 0 && (
            <div className="mt-4 grid gap-3 lg:grid-cols-3 lg:gap-4">
              <div className="min-w-0 lg:col-span-2">
                <RevenueChart sales={inPeriod} period={period} from={from} />
              </div>
              <CategoryBars sales={inPeriod} />
            </div>
          )}

          {sales && bestSellers.length > 0 && (
            <section className="mt-8" aria-labelledby="best-title">
              <h2 id="best-title" className="font-display text-2xl">Best sellers</h2>
              <ol className="mt-3 divide-y divide-line rounded-2xl border border-line bg-surface">
                {bestSellers.map((b, i) => (
                  <li key={b.name + i} className="flex items-center gap-3 px-4 py-3 text-sm">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-soft font-semibold text-brand-ink">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate font-medium">{b.name}</span>
                    <span className="shrink-0 text-muted">{plural(b.qty, 'piece')}</span>
                    <span className="w-24 shrink-0 text-right font-semibold tabular-nums">{formatPrice(b.total)}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section ref={historyTop} className="mt-8 scroll-mt-36" aria-labelledby="history-title">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="history-title" className="font-display text-2xl">History</h2>
              {inPeriod.length > 0 && <span className="text-sm text-muted tabular-nums">{pager.range}</span>}
            </div>
            {!sales ? (
              <AdminListSkeleton count={2} />
            ) : byDay.length === 0 ? (
              <p className="mt-3 rounded-2xl border border-dashed border-line p-8 text-center text-sm text-muted">
                No sales {period === 'all' ? 'yet' : `in ${PERIOD_LABEL[period].toLowerCase()}`}. After confirming an order in Messenger, tap <strong className="text-ink">Record sale</strong> and paste the message.
              </p>
            ) : (
              <div className="mt-3 space-y-5">
                {byDay.map(([day, daySales]) => (
                  <div key={day}>
                    <div className="flex items-baseline justify-between px-1">
                      <h3 className="text-sm font-medium">{day}</h3>
                      <span className="text-sm text-muted tabular-nums">{formatPrice(dayTotals.get(day) ?? saleTotal(daySales))}</span>
                    </div>
                    <ul className="mt-2 divide-y divide-line rounded-2xl border border-line bg-surface">
                      {daySales.map((s) => (
                        <li key={s.id} className={`flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm ${undoing === s.id ? 'opacity-60' : ''}`}>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">
                              {s.product_name}
                              {sizeLabel(s.size) && <span className="font-normal text-muted"> · {s.size}</span>}
                            </p>
                            <p className="text-xs text-muted">
                              {timeFormat.format(new Date(s.sold_at))} · {s.qty} × {formatPrice(s.unit_price)}
                              {s.order_code && <span className="font-mono"> · {s.order_code.slice(0, 14)}{s.order_code.length > 14 ? '…' : ''}</span>}
                            </p>
                          </div>
                          <span className="font-semibold tabular-nums">{formatPrice(s.qty * s.unit_price)}</span>
                          <button className="rounded-full px-3 py-1.5 text-xs text-muted hover:bg-subtle hover:text-ink" onClick={() => setConfirmUndo(s)} disabled={undoing === s.id}>
                            Undo
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                <Pagination
                  page={pager.page}
                  pageCount={pager.pageCount}
                  onChange={(n) => {
                    pager.setPage(n)
                    historyTop.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                  className="pt-3"
                />
              </div>
            )}
          </section>
        </>
      )}
      {confirmUndo && (
        <ConfirmSheet
          title="Undo this sale?"
          confirmLabel={undoing ? 'Undoing…' : 'Undo & restock'}
          danger
          busy={undoing === confirmUndo.id}
          onConfirm={async () => {
            await undo(confirmUndo)
            setConfirmUndo(null)
          }}
          onClose={() => setConfirmUndo(null)}
        >
          <p>
            <strong className="text-ink">
              {confirmUndo.product_name}
              {sizeLabel(confirmUndo.size) ? ` (${confirmUndo.size})` : ''}
            </strong>
            {' '}· {confirmUndo.qty} × {formatPrice(confirmUndo.unit_price)} = {formatPrice(confirmUndo.qty * confirmUndo.unit_price)}
          </p>
          <p className="mt-2">
            The sale is removed from your history and {plural(confirmUndo.qty, 'piece')} {confirmUndo.qty === 1 ? 'goes' : 'go'} back into stock.
            {!confirmUndo.variant_id && ' This size no longer exists, so no stock is put back.'}
          </p>
        </ConfirmSheet>
      )}
      <Toast message={toast} onDone={() => setToast(null)} />
    </>
  )
}

/** `positive` turns the number green, e.g. when pieces have sold. */
function Stat({ label, value, positive = false, className = '' }: { label: string; value: string | null; positive?: boolean; className?: string }) {
  return (
    <div className={`min-w-0 rounded-2xl border border-line bg-surface p-4 md:p-5 ${className}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      {value === null ? (
        <Bone className="mt-2 h-8 w-24" />
      ) : (
        <p className={`mt-1 font-display text-2xl leading-tight tabular-nums [overflow-wrap:anywhere] sm:text-3xl ${positive ? 'text-emerald-700' : ''}`}>{value}</p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------------------------

interface Line {
  product: Product
  variantId: string
  qty: number
  price: string
}

/** Fill in a sale by pasting the customer's Messenger order (or just its code), or add items by hand. */
function RecordSale({ products, onCancel, onSaved }: { products: Product[]; onCancel: () => void; onSaved: (count: number) => void }) {
  const [pasted, setPasted] = useState('')
  const [code, setCode] = useState('')
  const [lines, setLines] = useState<Line[]>([])
  const [notice, setNotice] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const root = useRef<HTMLElement>(null)

  useEffect(() => {
    root.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const variantOf = (l: Pick<Line, 'product' | 'variantId'>) => l.product.product_variants.find((v) => v.id === l.variantId)

  const addLine = (product: Product, variantId: string, qty: number) =>
    setLines((ls) => {
      const existing = ls.find((l) => l.variantId === variantId)
      if (existing) return ls.map((l) => (l.variantId === variantId ? { ...l, qty: l.qty + qty } : l))
      const v = product.product_variants.find((x) => x.id === variantId)
      return [...ls, { product, variantId, qty, price: String(v ? sizePrice(product, v) : product.price) }]
    })

  const applyPaste = (text: string) => {
    setPasted(text)
    const parsed = parseOrderCode(text, products)
    if (!parsed) {
      setNotice(text.trim() ? "No order code found. Add the items below instead." : null)
      return
    }
    setCode(parsed.code)
    setLines(
      parsed.lines.map((l) => {
        const v = l.product.product_variants.find((x) => x.id === l.variantId)
        return { product: l.product, variantId: l.variantId, qty: l.qty, price: String(v ? sizePrice(l.product, v) : l.product.price) }
      }),
    )
    setNotice(
      parsed.missing > 0
        ? `Filled in ${plural(parsed.lines.length, 'item')}. ${plural(parsed.missing, 'item')} from this order no longer ${parsed.missing === 1 ? 'exists' : 'exist'}.`
        : `Filled in ${plural(parsed.lines.length, 'item')} from the order.`,
    )
  }

  const problems = lines
    .map((l) => {
      const v = variantOf(l)
      const label = `${l.product.name}${v && sizeLabel(v.size) ? ` (${v.size})` : ''}`
      if (!v) return `${label} no longer exists`
      if (l.qty > v.stock) return `Only ${v.stock} left of ${label}`
      if (l.price === '' || Number.isNaN(Number(l.price)) || Number(l.price) < 0) return `Enter a valid price for ${label}`
      return null
    })
    .filter(Boolean) as string[]
  const total = lines.reduce((n, l) => n + l.qty * (Number(l.price) || 0), 0)

  const save = async () => {
    if (lines.length === 0 || problems.length > 0) return
    setSaving(true)
    setError(null)
    try {
      await recordSale(lines.map((l) => ({ variantId: l.variantId, qty: l.qty, unitPrice: Number(l.price) })), code)
      onSaved(lines.reduce((n, l) => n + l.qty, 0))
    } catch (e) {
      setError(errorMessage(e, 'Could not record the sale'))
      setSaving(false)
      setConfirming(false)
    }
  }
  const pieces = lines.reduce((n, l) => n + l.qty, 0)

  return (
    <section ref={root} className="mt-6 scroll-mt-36 rounded-2xl border border-brand/40 bg-surface p-4 shadow-sm sm:p-5" aria-labelledby="record-title">
      <h2 id="record-title" className="font-display text-xl">Record a sale</h2>
      <p className="mt-1 text-sm text-muted">Stock goes down automatically when you save.</p>

      <label className="label mt-4" htmlFor="paste-order">Paste the Messenger order (or just its code)</label>
      <textarea
        id="paste-order"
        rows={3}
        className="input font-mono text-xs"
        placeholder={"Hi Tin's Collection! I'd like to order: …\nOrder code: TC-…"}
        value={pasted}
        onChange={(e) => applyPaste(e.target.value)}
      />
      {notice && <p className="mt-1.5 text-xs text-muted">{notice}</p>}

      <label className="label mt-4" htmlFor="add-item">Or add an item</label>
      <ItemPicker
        products={products}
        inSale={Object.fromEntries(lines.map((l) => [l.variantId, l.qty]))}
        onAdd={(product, variantId) => addLine(product, variantId, 1)}
      />

      {lines.length > 0 && (
        <ul className="mt-5 divide-y divide-line border-y border-line">
          {lines.map((l, i) => {
            const v = variantOf(l)
            return (
              <li key={l.variantId} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1 basis-full sm:basis-auto">
                  <p className="truncate text-sm font-medium">{l.product.name}</p>
                  <p className="text-xs text-muted">
                    {v && sizeLabel(v.size) ? `Size ${v.size} · ` : ''}
                    {v ? `${v.stock} in stock` : 'No longer exists'}
                  </p>
                </div>
                <CountStepper value={l.qty} onChange={(qty) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, qty: Math.max(1, qty) } : x)))} label={l.product.name} />
                <label className="flex items-center gap-1 text-sm">
                  <span className="text-muted">₱</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    className="input h-9 w-24"
                    aria-label={`Price each for ${l.product.name}`}
                    value={l.price}
                    onChange={(e) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))}
                  />
                </label>
                <button
                  type="button"
                  className="h-9 w-9 shrink-0 rounded-lg text-muted hover:bg-red-50 hover:text-red-700"
                  aria-label={`Remove ${l.product.name}`}
                  onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}
                >
                  ✕
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {problems.length > 0 && (
        <ul className="mt-3 space-y-1 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          {problems.map((p) => <li key={p}>{p}</li>)}
        </ul>
      )}
      {error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {/* Stays on screen at the bottom while scrolling a long sale, so Save is always in reach. */}
      <div className="sticky bottom-0 z-10 -mx-4 mt-5 flex flex-wrap items-center gap-3 rounded-b-2xl border-t border-line bg-surface/95 px-4 py-3 pb-[max(.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:-mx-5 sm:px-5">
        <p className="mr-auto text-lg">
          Total <span className="font-semibold tabular-nums">{formatPrice(total)}</span>
        </p>
        <button type="button" className="btn-ghost" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="button" className="btn-primary" onClick={() => setConfirming(true)} disabled={saving || lines.length === 0 || problems.length > 0}>
          Save sale
        </button>
      </div>
      {confirming && (
        <ConfirmSheet
          title="Save this sale?"
          confirmLabel={saving ? 'Saving…' : `Save · ${formatPrice(total)}`}
          busy={saving}
          onConfirm={save}
          onClose={() => setConfirming(false)}
        >
          <ul className="divide-y divide-line rounded-xl border border-line">
            {lines.map((l) => {
              const v = variantOf(l)
              return (
                <li key={l.variantId} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="min-w-0 truncate text-ink">
                    {l.product.name}
                    {v && sizeLabel(v.size) ? <span className="text-muted"> · {v.size}</span> : null}
                  </span>
                  <span className="shrink-0 tabular-nums">{l.qty} × {formatPrice(Number(l.price))}</span>
                </li>
              )
            })}
          </ul>
          <p className="mt-3">
            Stock goes down by {plural(pieces, 'piece')}. You can undo this later from the history.
          </p>
        </ConfirmSheet>
      )}
    </section>
  )
}

/**
 * Search box for adding items to a sale by hand. Type part of a name or category; each matching item
 * shows its sizes in stock as buttons, and tapping one adds it. Stays open so several can be added in a row.
 */
function ItemPicker({
  products,
  inSale,
  onAdd,
}: {
  products: Product[]
  inSale: Record<string, number>
  onAdd: (product: Product, variantId: string) => void
}) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const inStock = useMemo(() => products.filter((p) => p.product_variants.some((v) => v.stock > 0)), [products])
  const results = q
    ? inStock.filter((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.product_variants.some((v) => v.size.toLowerCase() === q))
    : []
  const shown = results.slice(0, 30)

  return (
    <div>
      <div className="relative">
        <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          id="add-item"
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          className="input pl-9 pr-10 [&::-webkit-search-cancel-button]:hidden"
          placeholder={`Search ${inStock.length} items in stock by name or category`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && setQuery('')}
          aria-controls="add-item-results"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-subtle hover:text-ink"
            aria-label="Clear search"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {q && (
        <div id="add-item-results" aria-live="polite" className="mt-2 max-h-80 overflow-y-auto overscroll-contain rounded-xl border border-line">
          {results.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-muted">No items in stock match “{query.trim()}”.</p>
          ) : (
            <ul className="divide-y divide-line">
              {shown.map((p) => (
                <li key={p.id} className="flex gap-3 p-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-subtle">
                    {p.image_paths[0] && <img src={imageUrl(p.image_paths[0])} alt="" loading="lazy" className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    {p.category && <p className="truncate text-xs text-muted">{p.category}</p>}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {p.product_variants
                        .filter((v) => v.stock > 0)
                        .map((v) => {
                          const added = inSale[v.id] ?? 0
                          const full = added >= v.stock
                          const size = sizeLabel(v.size)
                          return (
                            <button
                              key={v.id}
                              type="button"
                              disabled={full}
                              onClick={() => onAdd(p, v.id)}
                              aria-label={`Add ${p.name}${size ? `, size ${v.size}` : ''}, ${formatPrice(sizePrice(p, v))}, ${v.stock} left${added ? `, ${added} in this sale` : ''}`}
                              className={`flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
                                added ? 'border-brand bg-brand-soft text-brand-ink' : 'border-line hover:border-brand'
                              }`}
                            >
                              <span className="font-medium">{size ? v.size : 'Add'}</span>
                              <span className="tabular-nums text-muted">{formatPrice(sizePrice(p, v))}</span>
                              <span className="tabular-nums text-muted">· {full ? 'all added' : `${v.stock - added} left`}</span>
                            </button>
                          )
                        })}
                    </div>
                  </div>
                </li>
              ))}
              {results.length > shown.length && (
                <li className="px-3 py-2.5 text-center text-xs text-muted">
                  Showing {shown.length} of {results.length}. Type more to narrow it down.
                </li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
