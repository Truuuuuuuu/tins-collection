interface Props {
  value: number
  max: number
  onChange: (n: number) => void
}

export default function QtyStepper({ value, max, onChange }: Props) {
  return (
    <div className="inline-flex items-center rounded-full border border-line bg-surface">
      <button type="button" className="h-9 w-9 text-lg disabled:opacity-30" onClick={() => onChange(value - 1)} disabled={value <= 1} aria-label="Decrease quantity">−</button>
      <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">{value}</span>
      <button type="button" className="h-9 w-9 text-lg disabled:opacity-30" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Increase quantity">+</button>
    </div>
  )
}
