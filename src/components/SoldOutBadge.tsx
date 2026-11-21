export default function SoldOutBadge({ className = '' }: { className?: string }) {
  return (
    <span className={`rounded-full bg-ink px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-white ${className}`}>
      Sold out
    </span>
  )
}
