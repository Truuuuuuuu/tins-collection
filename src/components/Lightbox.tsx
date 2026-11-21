import { useEffect, useRef } from 'react'

interface Props {
  images: string[]
  index: number
  alt: string
  onIndexChange: (i: number) => void
  onClose: () => void
}

/** Full-screen photo viewer: shows the whole image, uncropped. */
export default function Lightbox({ images, index, alt, onIndexChange, onClose }: Props) {
  const touchX = useRef<number | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const many = images.length > 1
  const prev = () => onIndexChange((index - 1 + images.length) % images.length)
  const next = () => onIndexChange((index + 1) % images.length)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (many && e.key === 'ArrowLeft') prev()
      if (many && e.key === 'ArrowRight') next()
    }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  })

  const arrow = 'absolute top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow hover:bg-white sm:flex'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${alt}, photo ${index + 1} of ${images.length}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
      onClick={onClose}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null || !many) return
        const dx = e.changedTouches[0].clientX - touchX.current
        if (Math.abs(dx) > 50) (dx > 0 ? prev : next)()
        touchX.current = null
      }}
    >
      <img
        src={images[index]}
        alt={alt}
        className="max-h-[calc(100dvh-6rem)] max-w-[calc(100vw-2rem)] select-none object-contain sm:max-w-[calc(100vw-8rem)]"
        onClick={(e) => e.stopPropagation()}
        draggable={false}
      />

      <button
        ref={closeRef}
        type="button"
        aria-label="Close"
        className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-ink shadow hover:bg-white"
        onClick={onClose}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      {many && (
        <>
          <button type="button" aria-label="Previous photo" className={`${arrow} left-4`} onClick={(e) => { e.stopPropagation(); prev() }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M15 6l-6 6 6 6" /></svg>
          </button>
          <button type="button" aria-label="Next photo" className={`${arrow} right-4`} onClick={(e) => { e.stopPropagation(); next() }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M9 6l6 6-6 6" /></svg>
          </button>
          <p className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-ink tabular-nums">
            {index + 1} / {images.length}
          </p>
        </>
      )}
    </div>
  )
}
