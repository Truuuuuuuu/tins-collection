// An empty clothes rack with a lone hanger: shown when the shop has no items yet.
export default function EmptyRackIllustration({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 180"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      {/* soft backdrop */}
      <ellipse cx="120" cy="96" rx="96" ry="72" fill="var(--color-brand-soft)" />
      <ellipse cx="120" cy="160" rx="70" ry="6" fill="var(--color-blush-line)" />

      {/* rack */}
      <g stroke="var(--color-ink)" strokeWidth="3" strokeLinecap="round" opacity="0.85">
        <path d="M56 158V44M184 158V44M50 44h140" />
        <path d="M44 158h24M172 158h24" />
      </g>

      {/* lone hanger, gently swinging */}
      <g className="origin-[120px_44px] motion-safe:animate-[sway_4s_ease-in-out_infinite]">
        <path
          d="M120 56v-8a5 5 0 1 1 5-5"
          stroke="var(--color-brand)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M120 56 88 78a3 3 0 0 0 1.7 5.5h60.6A3 3 0 0 0 152 78l-32-22Z"
          stroke="var(--color-brand)"
          strokeWidth="3"
          strokeLinejoin="round"
          fill="var(--color-surface)"
        />
      </g>

      {/* sparkles */}
      <g fill="var(--color-brand)" opacity="0.6">
        <path d="M78 104l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z" />
        <path d="M164 100l1.5 3.5 3.5 1.5-3.5 1.5-1.5 3.5-1.5-3.5-3.5-1.5 3.5-1.5 1.5-3.5Z" />
        <circle cx="146" cy="128" r="2.5" />
        <circle cx="98" cy="134" r="2" />
      </g>
    </svg>
  );
}
