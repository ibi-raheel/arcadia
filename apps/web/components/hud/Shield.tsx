// Heraldic shield with the player's level number centred.
//
// Inline SVG (not an image asset) per ADR 0018: themeable via CSS
// variables, crisp at every zoom, no asset-license bookkeeping.

'use client';

type Props = {
  readonly level: number;
  readonly size?: number;
};

export function Shield({ level, size = 44 }: Props): React.JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 44"
      role="img"
      aria-label={`level ${level}`}
      style={{ flexShrink: 0, filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.6))' }}
    >
      {/* Shield silhouette: flat top, scalloped sides curving to a centred point. */}
      <path
        d="M2 3 L38 3 L38 22 C38 32 32 39 20 43 C8 39 2 32 2 22 Z"
        fill="var(--ink-deep, #0a1020)"
        stroke="var(--bronze, #c08552)"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {/* Inner gilt rim — gives the shield depth without a real bevel. */}
      <path
        d="M5 6 L35 6 L35 22 C35 30 30 36 20 39.5 C10 36 5 30 5 22 Z"
        fill="none"
        stroke="var(--gilt, #e7c66c)"
        strokeWidth={0.6}
        opacity={0.55}
      />
      {/* Level number, mono so digits align tabularly across 1..MAX_LEVEL. */}
      <text
        x="20"
        y="27"
        textAnchor="middle"
        fontFamily="var(--font-mono, JetBrains Mono, monospace)"
        fontSize="16"
        fontWeight={700}
        fill="var(--gilt, #e7c66c)"
        letterSpacing="-0.02em"
      >
        {level}
      </text>
    </svg>
  );
}
