import type { ReactNode } from 'react'

// Placeholder shapes shown while a screen loads. Each skeleton mirrors the layout of the
// screen it stands in for, so nothing jumps when the real content arrives.

/** One grey placeholder block. Size and shape come from className. */
export function Bone({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-subtle ${className}`} />
}

/** Announces "Loading" to screen readers and hides the placeholder shapes from them. */
function Loading({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div role="status" aria-busy="true" className={className}>
      <span className="sr-only">Loading…</span>
      <div aria-hidden>{children}</div>
    </div>
  )
}

/** Matches ProductCard. */
function ProductCardSkeleton() {
  return (
    <div>
      <Bone className="aspect-[4/5] rounded-2xl" />
      <Bone className="mt-3 h-4 w-3/4" />
      <Bone className="mt-2 h-6 w-1/3" />
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex gap-1">
          <Bone className="h-5 w-7" />
          <Bone className="h-5 w-7" />
        </div>
        <Bone className="h-3 w-14" />
      </div>
    </div>
  )
}

/** Homepage product grid. */
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <Loading className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </Loading>
  )
}

/** Product page: photo + thumbnails on one side, details on the other. */
export function ProductDetailSkeleton() {
  return (
    <Loading>
      <Bone className="h-5 w-16" />
      <div className="mt-4 grid gap-8 md:grid-cols-2 md:gap-12">
        <div>
          <Bone className="aspect-[4/5] rounded-2xl" />
          <div className="mt-3 flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Bone key={i} className="h-20 w-16 rounded-lg" />
            ))}
          </div>
        </div>
        <div>
          <div className="flex gap-3">
            <Bone className="h-6 w-20 rounded-full" />
            <Bone className="h-6 w-24" />
          </div>
          <Bone className="mt-4 h-9 w-4/5" />
          <Bone className="mt-4 h-7 w-28" />
          <div className="mt-6 space-y-2">
            <Bone className="h-4 w-full" />
            <Bone className="h-4 w-11/12" />
            <Bone className="h-4 w-2/3" />
          </div>
          <Bone className="mt-8 h-3 w-12" />
          <div className="mt-2 flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Bone key={i} className="h-10 w-12 rounded-full" />
            ))}
          </div>
          <Bone className="mt-6 h-3 w-16" />
          <Bone className="mt-2 h-10 w-32 rounded-full" />
          <Bone className="mt-6 h-12 w-full rounded-full sm:w-48" />
        </div>
      </div>
    </Loading>
  )
}

/** Admin item list rows. */
export function AdminListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <Loading className="mt-6 space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-line bg-surface p-4">
          <div className="flex gap-4">
            <Bone className="h-20 w-16 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1">
              <Bone className="h-5 w-1/2" />
              <Bone className="mt-2 h-4 w-3/4" />
              <div className="mt-3 flex gap-2">
                <Bone className="h-9 w-28 rounded-lg" />
                <Bone className="h-9 w-28 rounded-lg" />
              </div>
            </div>
          </div>
          <div className="mt-4 flex gap-2 border-t border-line pt-3">
            <Bone className="h-8 w-28 rounded-full" />
            <Bone className="h-8 w-16 rounded-full" />
            <Bone className="ml-auto h-8 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </Loading>
  )
}

/** Admin add/edit item form. */
export function ProductFormSkeleton() {
  const field = (w = 'w-full') => (
    <div>
      <Bone className="mb-2 h-3 w-16" />
      <Bone className={`h-10 rounded-lg ${w}`} />
    </div>
  )
  return (
    <Loading className="mx-auto max-w-2xl space-y-8">
      <div>
        <Bone className="h-4 w-14" />
        <Bone className="mt-3 h-9 w-40" />
      </div>
      <section className="space-y-4 rounded-2xl border border-line bg-surface p-5">
        {field()}
        <div className="grid gap-4 sm:grid-cols-2">
          {field()}
          {field()}
        </div>
        {field()}
        <div>
          <Bone className="mb-2 h-3 w-20" />
          <Bone className="h-24 rounded-lg" />
        </div>
      </section>
      <section className="rounded-2xl border border-line bg-surface p-5">
        <Bone className="h-5 w-28" />
        <Bone className="mt-3 h-12 rounded-xl" />
        <div className="mt-4 flex flex-wrap gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Bone key={i} className="h-10 w-14 rounded-full" />
          ))}
        </div>
      </section>
      <section className="rounded-2xl border border-line bg-surface p-5">
        <Bone className="h-5 w-48" />
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Bone key={i} className="aspect-[4/5] rounded-lg" />
          ))}
        </div>
      </section>
    </Loading>
  )
}

/** Generic page placeholder for code-split pages and the admin access check. */
export function PageSkeleton() {
  return (
    <Loading>
      <Bone className="h-9 w-40" />
      <Bone className="mt-3 h-4 w-64 max-w-full" />
      <div className="mt-8 space-y-3">
        <Bone className="h-24 rounded-2xl" />
        <Bone className="h-24 rounded-2xl" />
        <Bone className="h-24 rounded-2xl" />
      </div>
    </Loading>
  )
}
