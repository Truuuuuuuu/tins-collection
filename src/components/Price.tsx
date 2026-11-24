// Shop prices always show cents ("₱240.00"), with the ".00" smaller so the peso amount stands out.

const peso = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** One price: "₱240" at full size, ".00" smaller. */
export default function Price({ amount }: { amount: number }) {
  const parts = peso.formatToParts(amount)
  const cut = parts.findIndex((p) => p.type === 'decimal')
  const whole = parts.slice(0, cut === -1 ? parts.length : cut).map((p) => p.value).join('')
  const cents = cut === -1 ? '' : parts.slice(cut).map((p) => p.value).join('')
  return (
    // Screen readers hear the full price once, not "240" then ".00".
    <span aria-label={peso.format(amount)} className="whitespace-nowrap">
      <span aria-hidden>{whole}</span>
      {cents && <span aria-hidden className="text-[0.65em]">{cents}</span>}
    </span>
  )
}

/** "₱240.00" when both ends match, otherwise "₱240.00 – ₱280.00". */
export function PriceRange({ min, max }: { min: number; max: number }) {
  if (min === max) return <Price amount={min} />
  return (
    <>
      <Price amount={min} /> – <Price amount={max} />
    </>
  )
}
