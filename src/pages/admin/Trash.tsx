import { useEffect, useRef, useState } from 'react'
import Pagination from '../../components/Pagination'
import { AdminListSkeleton } from '../../components/Skeletons'
import Toast from '../../components/Toast'
import { errorMessage, formatPrice } from '../../lib/format'
import { imageUrl } from '../../lib/images'
import { deleteProductForever, fetchDeletedProducts, purgeExpiredTrash, restoreProduct, TRASH_DAYS } from '../../lib/products'
import type { Product } from '../../lib/types'
import { usePagination } from '../../lib/usePagination'

const DAY = 24 * 60 * 60 * 1000

/** Whole days left before an item is removed for good (at least 0). */
function daysLeft(p: Product, now: number): number {
  if (!p.deleted_at) return TRASH_DAYS
  return Math.max(0, Math.ceil((new Date(p.deleted_at).getTime() + TRASH_DAYS * DAY - now) / DAY))
}

export default function Trash() {
  const [items, setItems] = useState<Product[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [now] = useState(() => Date.now())
  const pager = usePagination(items ?? [], 10)
  const top = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    // Clear out anything past the limit first, so the list only shows restorable items.
    purgeExpiredTrash()
      .catch(() => 0)
      .then(fetchDeletedProducts)
      .then(setItems)
      .catch((e) => setError(errorMessage(e, 'Could not load recently deleted items')))
  }, [])

  const act = async (p: Product, action: () => Promise<void>, success: string) => {
    setConfirmId(null)
    setBusyId(p.id)
    try {
      await action()
      setItems((xs) => (xs ?? []).filter((x) => x.id !== p.id))
      setToast(success)
    } catch (e) {
      setToast(errorMessage(e, 'Something went wrong'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <h1 ref={top} className="scroll-mt-36 font-display text-3xl">Recently deleted</h1>
      <p className="mt-1 text-sm text-muted">
        Deleted items stay here for {TRASH_DAYS} days, hidden from the shop. After that they're removed for good, photos included.
      </p>

      {error && <p className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {!items && !error ? (
        <AdminListSkeleton count={2} />
      ) : items && items.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-line p-10 text-center text-sm text-muted">Nothing here. Deleted items show up here.</p>
      ) : (
        <>
        <p className="mt-6 text-right text-sm text-muted tabular-nums">{pager.range}</p>
        <ul className="mt-2 space-y-3">
          {pager.pageItems.map((p) => {
            const left = daysLeft(p, now)
            return (
              <li key={p.id} className={`flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface p-4 ${busyId === p.id ? 'opacity-60' : ''}`}>
                <div className="h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-subtle">
                  {p.image_paths[0] && <img src={imageUrl(p.image_paths[0])} alt="" className="h-full w-full object-cover grayscale-[50%]" />}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-medium">{p.name}</h2>
                  <p className="text-sm text-muted">{formatPrice(p.price)}{p.category && ` · ${p.category}`}</p>
                  <p className={`mt-1 text-xs ${left <= 1 ? 'font-medium text-red-700' : 'text-muted'}`}>
                    {left === 0 ? 'Removed for good today' : `Removed for good in ${left} day${left === 1 ? '' : 's'}`}
                  </p>
                </div>
                <div className="flex w-full gap-2 sm:w-auto">
                  <button className="btn-primary flex-1 px-4 py-1.5 sm:flex-none" disabled={busyId === p.id} onClick={() => act(p, () => restoreProduct(p.id), `Restored ${p.name}`)}>
                    Restore
                  </button>
                  {confirmId === p.id ? (
                    <button
                      className="btn flex-1 bg-red-700 px-4 py-1.5 text-white hover:bg-red-800 sm:flex-none"
                      onClick={() => act(p, () => deleteProductForever(p), `Deleted ${p.name} for good`)}
                    >
                      Confirm delete
                    </button>
                  ) : (
                    <button className="btn-danger flex-1 px-4 py-1.5 sm:flex-none" disabled={busyId === p.id} onClick={() => setConfirmId(p.id)}>
                      Delete forever
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
        <Pagination
          page={pager.page}
          pageCount={pager.pageCount}
          onChange={(n) => {
            pager.setPage(n)
            top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }}
          className="mt-8"
        />
        </>
      )}
      <Toast message={toast} onDone={() => setToast(null)} />
    </>
  )
}
