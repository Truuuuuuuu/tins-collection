import { useEffect, useState } from 'react'
import { SHOP_NAME } from '../lib/format'

const SEEN_KEY = 'tins:intro-seen'
const WORD = 'Collection'

/** Plays once per browser session, on the first page load (not on in-app navigation). */
function shouldPlay(): boolean {
  if (typeof window === 'undefined') return false
  if (window.location.pathname.startsWith('/admin')) return false
  try {
    if (sessionStorage.getItem(SEEN_KEY)) return false
    sessionStorage.setItem(SEEN_KEY, '1')
  } catch {
    // Storage blocked (private mode etc.): still play, it just may replay on reload.
  }
  return true
}

// Decided once at module load, so StrictMode's double render can't flip it.
const PLAY_ON_LOAD = shouldPlay()

/**
 * Brand intro: "Tin's" writes itself in, "Collection" rises letter by letter,
 * a pink hairline draws underneath, then the whole panel wipes up to reveal the shop.
 */
export default function SplashIntro() {
  const [phase, setPhase] = useState<'off' | 'wait' | 'play' | 'exit'>(PLAY_ON_LOAD ? 'wait' : 'off')

  // Hold the animation until the brand fonts are ready (capped) so the wordmark doesn't swap mid-reveal.
  useEffect(() => {
    if (phase !== 'wait') return
    let started = false
    const start = () => {
      if (started) return
      started = true
      setPhase('play')
    }
    const cap = window.setTimeout(start, 700)
    document.fonts?.ready.then(start, start)
    return () => window.clearTimeout(cap)
  }, [phase])

  useEffect(() => {
    if (phase !== 'play') return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const t = window.setTimeout(() => setPhase('exit'), reduced ? 600 : 1900)
    return () => window.clearTimeout(t)
  }, [phase])

  // Lock page scroll while the intro covers it.
  useEffect(() => {
    if (phase === 'off') return
    const html = document.documentElement
    const prev = html.style.overflow
    html.style.overflow = 'hidden'
    return () => {
      html.style.overflow = prev
    }
  }, [phase])

  if (phase === 'off') return null

  return (
    <div
      aria-hidden
      data-phase={phase}
      className="splash fixed inset-0 z-[100] grid place-items-center bg-canvas"
      onClick={() => phase === 'play' && setPhase('exit')}
      onAnimationEnd={(e) => {
        if (e.target === e.currentTarget && phase === 'exit') setPhase('off')
      }}
    >
      <div className="splash-glow pointer-events-none absolute inset-0" />
      <div className="splash-mark relative flex flex-col items-center font-display text-5xl font-semibold tracking-tight sm:text-7xl">
        <span className="sr-only">{SHOP_NAME}</span>
        <span className="splash-script font-script text-[1.35em] font-bold leading-none text-brand-ink">Tin's</span>
        <span className="mt-1 flex overflow-hidden pb-[0.08em] leading-tight">
          {WORD.split('').map((ch, i) => (
            <span key={i} className="splash-letter inline-block" style={{ '--i': i } as React.CSSProperties}>
              {ch}
            </span>
          ))}
        </span>
        <span className="splash-line mt-4 h-px w-24 bg-brand sm:w-32" />
      </div>
    </div>
  )
}
