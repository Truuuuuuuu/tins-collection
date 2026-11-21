import type { Condition } from '../lib/types'
import { CONDITION_LABEL } from '../lib/types'

const STYLE: Record<Condition, string> = {
  // Green text on pale green: 5.5:1 contrast. Pink text on pale pink: 4.9:1.
  new: 'border-emerald-600/30 bg-emerald-50 text-emerald-700',
  preloved: 'border-brand/30 bg-brand-soft text-brand-ink',
}

export default function ConditionBadge({ condition, className = '' }: { condition: Condition; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${STYLE[condition]} ${className}`}>
      {CONDITION_LABEL[condition]}
    </span>
  )
}
