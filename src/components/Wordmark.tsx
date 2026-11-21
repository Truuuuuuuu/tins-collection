import { SHOP_NAME } from '../lib/format'

/** "Tin's" in script, "Collection" in the display serif. */
export default function Wordmark() {
  return (
    <span aria-label={SHOP_NAME}>
      <span aria-hidden className="mr-[0.15em] font-script text-[1.3em] font-bold leading-none text-brand-ink">Tin's</span>
      <span aria-hidden>Collection</span>
    </span>
  )
}
