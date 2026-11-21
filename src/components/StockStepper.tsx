import { useEffect, useRef, useState } from 'react'
import CountStepper from './CountStepper'

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

  return (
    <div className={`flex items-center gap-2 rounded-full border py-1 pl-3 pr-1 ${out ? 'border-red-200 bg-red-50' : 'border-line bg-surface'}`}>
      <span className="min-w-6 text-sm font-medium">{size}</span>
      <CountStepper value={value} onChange={set} onBlur={flush} label={size === 'Stock' ? 'stock' : `size ${size}`} />
    </div>
  )
}
