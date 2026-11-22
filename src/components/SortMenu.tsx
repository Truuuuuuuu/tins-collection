import type { SortOrder } from '../lib/sort'
import { SORT_LABEL } from '../lib/sort'

/**
 * Looks like the Filters button; an invisible native <select> sits on top, so phones get their
 * own picker. Phones show just the icon to save room.
 */
export default function SortMenu({ value, onChange }: { value: SortOrder; onChange: (v: SortOrder) => void }) {
  const active = value !== 'newest'
  return (
    <div
      className={`relative flex h-10 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand ${
        active ? 'border-brand text-brand-ink' : 'border-line bg-surface text-ink hover:border-brand'
      }`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4" />
      </svg>
      <span className="hidden whitespace-nowrap sm:inline">{SORT_LABEL[value]}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortOrder)}
        aria-label="Sort by"
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {(Object.keys(SORT_LABEL) as SortOrder[]).map((s) => (
          <option key={s} value={s}>
            {SORT_LABEL[s]}
          </option>
        ))}
      </select>
    </div>
  )
}
