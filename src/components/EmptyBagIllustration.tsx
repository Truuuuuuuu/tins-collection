// An empty shopping bag: shown when the cart has nothing in it.
// Same visual language as EmptyRackIllustration.
export default function EmptyBagIllustration({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 180"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      {/* soft backdrop */}
      <ellipse cx="120" cy="96" rx="96" ry="72" fill="var(--color-brand-soft)" />
      <ellipse cx="120" cy="160" rx="56" ry="6" fill="var(--color-blush-line)" />

      {/* bag, gently bobbing */}
      <g className="motion-safe:animate-[bob_4s_ease-in-out_infinite]">
        {/* handle */}
        <path
          d="M102 70V58a18 18 0 0 1 36 0v12"
          stroke="var(--color-ink)"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.85"
        />
        {/* body */}
        <path
          d="M80 66h80l-6 88H86l-6-88Z"
          stroke="var(--color-brand)"
          strokeWidth="3"
          strokeLinejoin="round"
          fill="var(--color-surface)"
        />
        {/* handle rivets */}
        <circle cx="102" cy="78" r="3" fill="var(--color-brand)" />
        <circle cx="138" cy="78" r="3" fill="var(--color-brand)" />
        {/* shop label, styled like the Wordmark */}
        <text
          x="120"
          y="110"
          textAnchor="middle"
          fill="var(--color-brand-ink)"
          fontFamily="var(--font-script)"
          fontWeight="700"
          fontSize="22"
        >
          Tin's
        </text>
        <text
          x="120"
          y="126"
          textAnchor="middle"
          fill="var(--color-ink)"
          fontFamily="var(--font-display)"
          fontSize="11"
          letterSpacing="0.5"
        >
          Collection
        </text>
      </g>

      {/* sparkles */}
      <g fill="var(--color-brand)" opacity="0.6">
        <path d="M58 92l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z" />
        <path d="M180 76l1.5 3.5 3.5 1.5-3.5 1.5-1.5 3.5-1.5-3.5-3.5-1.5 3.5-1.5 1.5-3.5Z" />
        <circle cx="174" cy="124" r="2.5" />
        <circle cx="64" cy="130" r="2" />
      </g>
    </svg>
  );
}
