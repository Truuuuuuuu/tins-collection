import type { Condition } from '../lib/types'
import { CONDITION_LABEL } from '../lib/types'

const STYLE: Record<Condition, string> = {
  // Solid badges with white text. Dark green keeps 5.5:1 contrast (lighter greens fall below 4.5:1); brand pink 4.6:1.
  new: 'border-transparent bg-emerald-700 text-white',
  preloved: 'border-transparent bg-brand text-white',
}

export default function ConditionBadge({ condition, className = '' }: { condition: Condition; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${STYLE[condition]} ${className}`}>
      {CONDITION_LABEL[condition]}
    </span>
  )
}
