import type { MouseEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

interface Props {
  /** Where to go, or the fallback when `historyBack` has no earlier page in this app. */
  to?: string
  /** Go to the previous page instead of always to `to`. */
  historyBack?: boolean
  label?: string
}

/** A big tappable pill on phones, a quiet text link on larger screens. */
export default function BackButton({ to = '/', historyBack = false, label = 'Back' }: Props) {
  const navigate = useNavigate()
  // 'default' means this is the first page opened in the tab, so there's nothing in the app to go back to.
  const canGoBack = useLocation().key !== 'default'

  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!historyBack || !canGoBack) return
    e.preventDefault()
    navigate(-1)
  }

  return (
    <Link
      to={to}
      onClick={onClick}
      className="-ml-1 inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface py-2 pl-3 pr-5 text-base font-medium text-ink shadow-sm active:scale-[0.98] sm:ml-0 sm:min-h-0 sm:border-0 sm:bg-transparent sm:p-0 sm:text-sm sm:font-normal sm:text-muted sm:shadow-none sm:hover:text-brand-ink"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:h-3.5 sm:w-3.5" aria-hidden>
        <path d="M15 18l-6-6 6-6" />
      </svg>
      {label}
    </Link>
  )
}
