import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { categoryKey, categoryOptions } from '../lib/categories'
import { formatPrice } from '../lib/format'
import type { Sale } from '../lib/types'

// Chart look (dataviz spec): one series in the brand pink (validated: passes contrast and
// chroma checks on the white card), bars <= 24px with a 4px rounded top and square base,
// hairline solid gridlines, text always in ink/muted (never the data color).
const BAR = 'var(--color-brand)'
const GRID = 'var(--color-line)'
const MAX_BAR = 24
const PLOT_H = 180
const AXIS_H = 22
const LEFT = 44
const TOP = 18

const peso = (n: number) => formatPrice(Math.round(n))
const pesoCompact = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', notation: 'compact', maximumFractionDigits: 1 })
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

export type ChartPeriod = 'month' | 'last-month' | 'all'

interface Bucket {
  key: string
  /** Short axis label, e.g. "12" or "Nov". */
  tick: string
  /** Full label for the tooltip and table, e.g. "Nov 12, 2026". */
  label: string
  revenue: number
  pieces: number
}

/** Days of the month for a one-month period; months (first sale → now) for all time. */
function buildBuckets(sales: Sale[], period: ChartPeriod, from: Date | null): Bucket[] {
  if (period !== 'all') {
    const start = from ?? new Date()
    const y = start.getFullYear()
    const m = start.getMonth()
    const days = new Date(y, m + 1, 0).getDate()
    const buckets: Bucket[] = Array.from({ length: days }, (_, i) => {
      const d = new Date(y, m, i + 1)
      return {
        key: String(i + 1),
        tick: String(i + 1),
        label: d.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' }),
        revenue: 0,
        pieces: 0,
      }
    })
    for (const s of sales) {
      const b = buckets[new Date(s.sold_at).getDate() - 1]
      if (!b) continue
      b.revenue += s.qty * s.unit_price
      b.pieces += s.qty
    }
    return buckets
  }
  const now = new Date()
  const first = sales.reduce((min, s) => Math.min(min, new Date(s.sold_at).getTime()), now.getTime())
  const f = new Date(first)
  const startIndex = f.getFullYear() * 12 + f.getMonth()
  const endIndex = now.getFullYear() * 12 + now.getMonth()
  const buckets: Bucket[] = []
  for (let i = startIndex; i <= endIndex; i++) {
    const d = new Date(Math.floor(i / 12), i % 12, 1)
    buckets.push({
      key: String(i),
      tick: d.toLocaleDateString('en-PH', { month: 'short' }),
      label: d.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' }),
      revenue: 0,
      pieces: 0,
    })
  }
  for (const s of sales) {
    const d = new Date(s.sold_at)
    const b = buckets[d.getFullYear() * 12 + d.getMonth() - startIndex]
    if (!b) continue
    b.revenue += s.qty * s.unit_price
    b.pieces += s.qty
  }
  return buckets
}

/** A clean top for the y-axis (1, 2 or 5 × a power of ten per step) and its 4 steps. */
function niceTicks(max: number): number[] {
  if (max <= 0) return [0]
  const rough = max / 4
  const pow = 10 ** Math.floor(Math.log10(rough))
  const step = [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= rough) ?? 10 * pow
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => i * step)
}

/** 4px rounded top corners, square at the baseline. */
function barPath(x: number, y: number, w: number, h: number) {
  const r = Math.min(4, w / 2, h)
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(600)
  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}

/** Revenue per day (one month) or per month (all time), as columns with a hover/focus tooltip. */
export function RevenueChart({ sales, period, from }: { sales: Sale[]; period: ChartPeriod; from: Date | null }) {
  const [wrap, width] = useWidth<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)
  const buckets = useMemo(() => buildBuckets(sales, period, from), [sales, period, from])
  const max = Math.max(0, ...buckets.map((b) => b.revenue))
  const ticks = niceTicks(max)
  const top = ticks[ticks.length - 1] || 1
  const plotW = Math.max(120, width - LEFT)
  const band = plotW / buckets.length
  const barW = Math.max(2, Math.min(MAX_BAR, band * 0.62))
  const y = (v: number) => TOP + PLOT_H - (v / top) * PLOT_H
  const best = buckets.reduce((bi, b, i) => (b.revenue > (buckets[bi]?.revenue ?? 0) ? i : bi), 0)
  // Label every k-th tick so axis text never collides (about 34px per label).
  const every = Math.max(1, Math.ceil(buckets.length / Math.max(1, Math.floor(plotW / 34))))
  const title = period === 'all' ? 'Revenue by month' : 'Revenue by day'

  const pick = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const i = Math.floor((e.clientX - rect.left - LEFT) / band)
    setActive(i >= 0 && i < buckets.length ? i : null)
  }
  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    setActive((a) => Math.min(buckets.length - 1, Math.max(0, (a ?? best) + (e.key === 'ArrowLeft' ? -1 : 1))))
  }

  const a = active !== null ? buckets[active] : null
  const tipX = active !== null ? LEFT + band * active + band / 2 : 0

  return (
    <figure className="min-w-0 rounded-2xl border border-line bg-surface p-4 md:p-5">
      <figcaption className="flex items-baseline justify-between gap-3">
        <h3 className="font-medium">{title}</h3>
        <span className="text-xs text-muted">Hover or tap a column</span>
      </figcaption>

      <div ref={wrap} className="relative mt-3" onPointerLeave={() => setActive(null)}>
        <svg
          width={width}
          height={TOP + PLOT_H + AXIS_H}
          className="block touch-pan-y outline-none focus-visible:rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          role="img"
          aria-label={`${title}. Use the left and right arrow keys to read each ${period === 'all' ? 'month' : 'day'}.`}
          tabIndex={0}
          onPointerMove={pick}
          onPointerDown={pick}
          onFocus={() => setActive((x) => x ?? best)}
          onBlur={() => setActive(null)}
          onKeyDown={onKey}
        >
          {/* Gridlines + y-axis values */}
          {ticks.map((t) => (
            <g key={t}>
              <line x1={LEFT} x2={LEFT + plotW} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} shapeRendering="crispEdges" />
              <text x={LEFT - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted text-[10px] tabular-nums">
                {t === 0 ? '₱0' : pesoCompact.format(t)}
              </text>
            </g>
          ))}

          {/* Columns (a period with no sales draws nothing) */}
          {buckets.map((b, i) => {
            if (b.revenue <= 0) return null
            const h = Math.max(1, TOP + PLOT_H - y(b.revenue))
            const x = LEFT + band * i + (band - barW) / 2
            return (
              <path
                key={b.key}
                d={barPath(x, y(b.revenue), barW, h)}
                fill={BAR}
                opacity={active === null || active === i ? 1 : 0.45}
                className="transition-opacity duration-150"
              />
            )
          })}

          {/* One direct label: the best period */}
          {max > 0 && active === null && (
            <text
              x={LEFT + band * best + band / 2}
              y={y(buckets[best].revenue) - 6}
              textAnchor="middle"
              className="fill-ink text-[10px] font-semibold"
            >
              {pesoCompact.format(buckets[best].revenue)}
            </text>
          )}

          {/* x-axis labels */}
          {buckets.map((b, i) =>
            i % every === 0 ? (
              <text key={b.key} x={LEFT + band * i + band / 2} y={TOP + PLOT_H + 15} textAnchor="middle" className="fill-muted text-[10px] tabular-nums">
                {b.tick}
              </text>
            ) : null,
          )}

        </svg>

        {a && (
          <div
            role="status"
            className="pointer-events-none absolute top-0 z-10 w-max max-w-[12rem] -translate-x-1/2 rounded-xl border border-line bg-surface px-3 py-2 text-left shadow-lg"
            style={{ left: Math.min(Math.max(tipX, 70), width - 70) }}
          >
            <p className="text-sm font-semibold">{peso(a.revenue)}</p>
            <p className="text-xs text-muted">
              {a.label} · {plural(a.pieces, 'piece')}
            </p>
          </div>
        )}
      </div>

      {/* Table twin: every value readable without hovering */}
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-xs text-muted hover:text-ink">View as table</summary>
        <table className="mt-2 w-full text-xs">
          <thead className="text-muted">
            <tr>
              <th className="py-1 text-left font-medium">{period === 'all' ? 'Month' : 'Day'}</th>
              <th className="py-1 text-right font-medium">Pieces</th>
              <th className="py-1 text-right font-medium">Revenue</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {buckets
              .filter((b) => b.revenue > 0)
              .map((b) => (
                <tr key={b.key} className="border-t border-line">
                  <td className="py-1">{b.label}</td>
                  <td className="py-1 text-right">{b.pieces}</td>
                  <td className="py-1 text-right">{peso(b.revenue)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}

/** Revenue per category as ranked bars (largest first, one hue); the top 5 plus "Other". */
export function CategoryBars({ sales }: { sales: Sale[] }) {
  const rows = useMemo(() => {
    const labels = categoryOptions(sales.map((s) => s.category))
    const totals = new Map<string, number>()
    for (const s of sales) {
      const key = categoryKey(s.category) || '—'
      totals.set(key, (totals.get(key) ?? 0) + s.qty * s.unit_price)
    }
    const ranked = [...totals.entries()]
      .map(([key, revenue]) => ({ key, label: key === '—' ? 'No category' : labels.find((o) => o.key === key)?.label ?? key, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
    if (ranked.length <= 6) return ranked
    const rest = ranked.slice(5).reduce((n, r) => n + r.revenue, 0)
    return [...ranked.slice(0, 5), { key: 'other', label: 'Other', revenue: rest }]
  }, [sales])
  const total = rows.reduce((n, r) => n + r.revenue, 0)
  const max = Math.max(0, ...rows.map((r) => r.revenue))

  return (
    <figure className="min-w-0 rounded-2xl border border-line bg-surface p-4 md:p-5">
      <figcaption>
        <h3 className="font-medium">Revenue by category</h3>
      </figcaption>
      <ul className="mt-4 space-y-3.5">
        {rows.map((r) => (
          <li key={r.key}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">{r.label}</span>
              <span className="shrink-0 text-muted">
                <span className="font-medium text-ink">{peso(r.revenue)}</span> · {total > 0 ? Math.round((r.revenue / total) * 100) : 0}%
              </span>
            </div>
            <div className="mt-1.5 h-3" aria-hidden>
              <div
                className="h-full rounded-r-[4px] bg-brand transition-[width] duration-500"
                style={{ width: `${max > 0 ? Math.max(1.5, (r.revenue / max) * 100) : 0}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </figure>
  )
}
