interface Props {
  value: number
  onChange: (n: number) => void
  /** What's being counted, for screen readers, e.g. "size M" or "stock". */
  label: string
  /** Called when the typed-in number loses focus (or Enter is pressed). */
  onBlur?: () => void
}

const circle =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition active:scale-90 disabled:cursor-not-allowed disabled:opacity-30 disabled:active:scale-100'

/** Round − / + buttons around a number you can also type into. Never goes below 0. */
export default function CountStepper({ value, onChange, label, onBlur }: Props) {
  const set = (n: number) => onChange(Math.max(0, Math.floor(Number.isFinite(n) ? n : 0)))
  const out = value === 0

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        className={`${circle} border-line bg-surface text-ink hover:border-brand hover:text-brand-ink`}
        onClick={() => set(value - 1)}
        disabled={out}
        aria-label={`Remove one from ${label}`}
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
        aria-label={`Stock for ${label}`}
        className={`w-10 bg-transparent text-center text-sm font-semibold tabular-nums outline-none [appearance:textfield] focus:rounded focus:ring-2 focus:ring-brand/30 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${out ? 'text-red-700' : ''}`}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => set(Number(e.target.value))}
        onBlur={onBlur}
        onKeyDown={(e) => {
          // Enter confirms the number instead of submitting the surrounding form.
          if (e.key === 'Enter') {
            e.preventDefault()
            e.currentTarget.blur()
          }
        }}
      />
      <button
        type="button"
        className={`${circle} border-brand bg-brand text-white hover:bg-brand-dark`}
        onClick={() => set(value + 1)}
        aria-label={`Add one to ${label}`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </div>
  )
}
