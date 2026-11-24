// A magnifying glass searching over a tee, sunglasses and a price tag: shown when
// filters/search match nothing. Same visual language as EmptyRackIllustration.
export default function NoResultsIllustration({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 180"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      {/* soft backdrop */}
      <ellipse cx="120" cy="96" rx="96" ry="72" fill="var(--color-brand-soft)" />
      <ellipse cx="124" cy="160" rx="80" ry="6" fill="var(--color-blush-line)" />

      {/* price tag on a string, gently swinging */}
      <g className="origin-[66px_30px] motion-safe:animate-[sway_5s_ease-in-out_infinite]">
        <path
          d="M66 30c-2 6-4 10-8 16"
          stroke="var(--color-ink)"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.6"
        />
        <g transform="rotate(-20 64 58)">
          <path
            d="M56 46h20v24H56l-8-12 8-12Z"
            stroke="var(--color-brand)"
            strokeWidth="3"
            strokeLinejoin="round"
            fill="var(--color-surface)"
          />
          <circle cx="56" cy="58" r="2.5" fill="var(--color-brand)" />
          <path d="M63 54h8M63 62h6" stroke="var(--color-brand)" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
        </g>
      </g>

      {/* t-shirt */}
      <path
        d="M64 118 54 126l4 10 6-3v23h36v-23l6 3 4-10-10-8h-10a8 6 0 0 1-16 0H64Z"
        stroke="var(--color-ink)"
        strokeWidth="3"
        strokeLinejoin="round"
        fill="var(--color-surface)"
        opacity="0.85"
      />
      <path d="M72 140h20" stroke="var(--color-brand)" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />

      {/* sunglasses */}
      <g stroke="var(--color-ink)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.85">
        <circle cx="160" cy="146" r="9" fill="var(--color-blush-line)" />
        <circle cx="186" cy="146" r="9" fill="var(--color-blush-line)" />
        <path d="M169 144q4-4 8 0M151 143l-6-4M195 143l6-4" />
      </g>

      {/* magnifying glass, drifting as if searching */}
      <g className="origin-[128px_82px] motion-safe:animate-[search_5s_ease-in-out_infinite]">
        <path
          d="M146 100l18 18"
          stroke="var(--color-ink)"
          strokeWidth="7"
          strokeLinecap="round"
          opacity="0.85"
        />
        <circle
          cx="128"
          cy="82"
          r="24"
          stroke="var(--color-brand)"
          strokeWidth="4"
          fill="var(--color-surface)"
          fillOpacity="0.7"
        />
        {/* lens shine */}
        <path
          d="M114 76a15 15 0 0 1 10-9"
          stroke="var(--color-brand)"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.45"
        />
      </g>

      {/* sparkles */}
      <g fill="var(--color-brand)" opacity="0.6">
        <path d="M184 64l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z" />
        <path d="M40 98l1.5 3.5 3.5 1.5-3.5 1.5-1.5 3.5-1.5-3.5-3.5-1.5 3.5-1.5 1.5-3.5Z" />
        <circle cx="200" cy="108" r="2.5" />
        <circle cx="104" cy="44" r="2" />
      </g>
    </svg>
  );
}
