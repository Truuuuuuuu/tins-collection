/** A round dot showing a color. Custom colors without a swatch get a soft multi-color dot. */
export default function ColorSwatch({ hex, size = 16, className = '' }: { hex: string | null; size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 rounded-full ring-1 ring-inset ring-black/15 ${className}`}
      style={{
        width: size,
        height: size,
        background: hex ?? 'conic-gradient(#f2a7bd, #f2c94c, #8fd19e, #8ab4f8, #c3a6f0, #f2a7bd)',
      }}
    />
  )
}
