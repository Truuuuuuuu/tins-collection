import { useEffect, useRef, useState } from 'react'

interface Props {
  size: string
  stock: number
  onCommit: (stock: number) => void
}

const SAVE_DELAY = 600

/**
 * Round − / + buttons around an editable count. Taps update the number right away and are saved
 * once the admin pauses, so tapping + five times sends one save instead of five.
 */
export default function StockStepper({ size, stock, onCommit }: Props) {
  const [value, setValue] = useState(stock)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const pending = useRef<number | null>(null)
  const commit = useRef(onCommit)
  useEffect(() => {
    commit.current = onCommit
  })

  // Follow outside changes (e.g. a reload after a failed save) unless a save is waiting.
  useEffect(() => {
    if (pending.current === null) setValue(stock)
  }, [stock])

  const flush = () => {
    clearTimeout(timer.current)
    if (pending.current !== null && pending.current !== stock) commit.current(pending.current)
    pending.current = null
  }

  // Save anything still waiting if the admin leaves the page mid-edit.
  useEffect(() => () => {
    clearTimeout(timer.current)
    if (pending.current !== null) commit.current(pending.current)
  }, [])

  const set = (n: number) => {
    const next = Math.max(0, Math.floor(Number.isFinite(n) ? n : 0))
    setValue(next)
    pending.current = next
    clearTimeout(timer.current)
    timer.current = setTimeout(flush, SAVE_DELAY)
  }

  const out = value === 0
  const circle =
    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition active:scale-90 disabled:cursor-not-allowed disabled:opacity-30 disabled:active:scale-100'

  return (
    <div className={`flex items-center gap-2 rounded-full border py-1 pl-3 pr-1 ${out ? 'border-red-200 bg-red-50' : 'border-line bg-surface'}`}>
      <span className="min-w-6 text-sm font-medium">{size}</span>
      <button
        type="button"
        className={`${circle} border-line bg-surface text-ink hover:border-brand hover:text-brand-ink`}
        onClick={() => set(value - 1)}
        disabled={out}
        aria-label={`Remove one from size ${size}`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
          <path d="M5 12h14" />
        </svg>
      </button>
      <input
        type="number"
        min={0}
        inputMode="numeric"
        value={value}
        aria-label={`Stock for size ${size}`}
        className={`w-10 bg-transparent text-center text-sm font-semibold tabular-nums outline-none [appearance:textfield] focus:rounded focus:ring-2 focus:ring-brand/30 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${out ? 'text-red-700' : ''}`}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => set(Number(e.target.value))}
        onBlur={flush}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      />
      <button
        type="button"
        className={`${circle} border-brand bg-brand text-white hover:bg-brand-dark`}
        onClick={() => set(value + 1)}
        aria-label={`Add one to size ${size}`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </div>
  )
}
