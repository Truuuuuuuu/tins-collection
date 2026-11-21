import type { Condition } from '../lib/types'
import { CONDITION_LABEL } from '../lib/types'

const STYLE: Record<Condition, string> = {
  new: 'border-brand/30 bg-brand-soft text-brand-ink',
  preloved: 'border-line bg-surface text-ink',
}

export default function ConditionBadge({ condition, className = '' }: { condition: Condition; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${STYLE[condition]} ${className}`}>
      {CONDITION_LABEL[condition]}
    </span>
  )
}
