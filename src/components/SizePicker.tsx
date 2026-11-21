import type { Variant } from '../lib/types'

interface Props {
  variants: Variant[]
  selectedId: string | null
  onSelect: (v: Variant) => void
}

export default function SizePicker({ variants, selectedId, onSelect }: Props) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Size">
      {variants.map((v) => {
        const out = v.stock === 0
        const selected = v.id === selectedId
        return (
          <button
            key={v.id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={out}
            onClick={() => onSelect(v)}
            className={`min-w-12 rounded-lg border px-3 py-2 text-sm transition ${
              selected ? 'border-brand bg-brand text-white' : 'border-line bg-surface hover:border-brand'
            } ${out ? 'cursor-not-allowed text-muted line-through opacity-50 hover:border-line' : ''}`}
          >
            {v.size}
          </button>
        )
      })}
    </div>
  )
}
