import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import BackButton from '../components/BackButton'
import QtyStepper from '../components/QtyStepper'
import Toast from '../components/Toast'
import { formatPrice } from '../lib/format'
import { imageUrl } from '../lib/images'
import { buildOrderMessage, copyToClipboard, messengerUrl } from '../lib/messenger'
import { fetchProducts } from '../lib/products'
import type { Product } from '../lib/types'
import { cartTotal, useCart } from '../store/cart'

export default function Cart() {
  const { lines, setQty, remove, clear, reconcile } = useCart()
  const [products, setProducts] = useState<Product[] | null>(null)
  const [notices, setNotices] = useState<string[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const [fallbackText, setFallbackText] = useState<string | null>(null)

  // Check the saved cart against live stock whenever the page opens.
  useEffect(() => {
    fetchProducts()
      .then((ps) => {
        setProducts(ps)
        setNotices(reconcile(ps))
      })
      .catch(() => setProducts([]))
  }, [reconcile])

  const stockFor = (variantId: string) =>
    products?.flatMap((p) => p.product_variants).find((v) => v.id === variantId)?.stock ?? 1

  const order = async () => {
    const message = buildOrderMessage(lines)
    const copied = await copyToClipboard(message)
    if (copied) {
      setToast('Order copied! Paste it in Messenger.')
      // Some browsers (mostly Safari) block pop-ups after an async step; fall back to a tap-to-open link.
      const win = window.open(messengerUrl(), '_blank')
      if (!win) window.location.href = messengerUrl()
    } else {
      setFallbackText(message)
    }
  }

  if (lines.length === 0)
    return (
      <div className="py-20 text-center">
        <h1 className="font-display text-3xl">Your cart is empty</h1>
        {notices.length > 0 && <ul className="mt-3 text-sm text-muted">{notices.map((n) => <li key={n}>{n}</li>)}</ul>}
        <Link to="/" className="btn-primary mt-6">Browse items</Link>
      </div>
    )

  return (
    <div className="mx-auto max-w-3xl">
      <BackButton historyBack />
      <h1 className="mt-4 font-display text-3xl sm:text-4xl">Your cart</h1>

      {notices.length > 0 && (
        <ul className="mt-4 space-y-1 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {notices.map((n) => <li key={n}>{n}</li>)}
        </ul>
      )}

      <ul className="mt-6 divide-y divide-line border-y border-line">
        {lines.map((l) => (
          <li key={l.variantId} className="flex gap-4 py-4">
            <Link to={`/product/${l.productId}`} className="h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-subtle">
              {l.image && <img src={imageUrl(l.image)} alt="" className="h-full w-full object-cover" />}
            </Link>
            <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
              <div className="flex justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{l.name}</p>
                  <p className="text-sm text-muted">
                    {l.size}{l.condition === 'preloved' && ' · Pre-loved'} · {formatPrice(l.price)}
                  </p>
                </div>
                <p className="shrink-0 font-semibold">{formatPrice(l.price * l.qty)}</p>
              </div>
              <div className="flex items-center justify-between">
                <QtyStepper value={l.qty} max={stockFor(l.variantId)} onChange={(n) => setQty(l.variantId, n)} />
                <button className="text-sm text-muted underline-offset-2 hover:text-red-700 hover:underline" onClick={() => remove(l.variantId)}>
                  Remove
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-center justify-between text-lg">
        <span>Total</span>
        <span className="font-semibold">{formatPrice(cartTotal(lines))}</span>
      </div>

      <div className="mt-6 rounded-2xl border border-line bg-surface p-5">
        <p className="text-sm text-muted">
          We take orders through Facebook Messenger. Tapping the button copies your order and opens our page. Just
          <strong className="text-ink"> paste and send</strong>.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <button className="btn-accent flex-1 py-3" onClick={order}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.19 5.44 3.14 7.17.16.14.26.35.27.57l.05 1.78a.8.8 0 0 0 1.12.71l1.99-.88a.8.8 0 0 1 .53-.04c.91.25 1.88.39 2.9.39 5.64 0 10-4.13 10-9.7S17.64 2 12 2Zm6 7.46-2.94 4.66a1.5 1.5 0 0 1-2.17.4l-2.34-1.75a.6.6 0 0 0-.72 0l-3.16 2.4c-.42.32-.97-.18-.69-.63l2.94-4.66a1.5 1.5 0 0 1 2.17-.4l2.34 1.75a.6.6 0 0 0 .72 0l3.16-2.4c.42-.32.97.18.69.63Z" />
            </svg>
            Order via Messenger
          </button>
          <button className="btn-ghost" onClick={clear}>Clear cart</button>
        </div>
      </div>

      {fallbackText && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 sm:items-center" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl bg-surface p-5">
            <h2 className="font-display text-xl">Copy your order</h2>
            <p className="mt-1 text-sm text-muted">Your browser blocked automatic copying. Select the text below, copy it, then open Messenger.</p>
            <textarea readOnly value={fallbackText} rows={8} className="input mt-3 font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
            <div className="mt-4 flex gap-3">
              <a href={messengerUrl()} target="_blank" rel="noopener noreferrer" className="btn-accent flex-1">Open Messenger</a>
              <button className="btn-ghost" onClick={() => setFallbackText(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  )
}
