// Decorative ornaments — wax seals, bronze studs, drop caps, medallions,
// small bronze-ringed avatars. Purely presentational; behaviour lives
// in the call site.

import type { CSSProperties, ReactNode } from 'react';

type WaxSealProps = {
  readonly letter?: string;
  readonly className?: string;
  readonly style?: CSSProperties;
};

/** Oxblood-red wax seal disc, tilted ~-8°. Stamped onto corners of
 * published cards, signed lessons, etc. */
export function WaxSeal({ letter = 'A', className, style }: WaxSealProps) {
  return (
    <div className={`wax-seal ${className ?? ''}`.trim()} style={style}>
      {letter}
    </div>
  );
}

/** 12px bronze dot used to "pin" vellum to the desk. Decorative only. */
export function Stud({ className }: { readonly className?: string }) {
  return <span className={`stud ${className ?? ''}`.trim()} />;
}

type DropCapProps = {
  readonly letter: string;
  readonly variant?: 'blue' | 'wax' | 'verdigris';
  readonly size?: 'sm' | 'lg';
};

/** Illuminated first-letter on a coloured ground, gilt letterform. */
export function DropCap({ letter, variant = 'blue', size = 'lg' }: DropCapProps) {
  const dim = size === 'sm' ? 56 : 76;
  const fontSize = size === 'sm' ? 38 : 54;
  const background =
    variant === 'wax'
      ? 'radial-gradient(circle at 30% 25%, #c13340 0%, var(--wax) 55%, var(--wax-deep) 100%)'
      : variant === 'verdigris'
        ? 'radial-gradient(circle at 30% 25%, #88a080 0%, var(--verdigris) 50%, var(--verdigris-2))'
        : 'radial-gradient(circle at 30% 25%, var(--ink-blue) 0%, #183049 55%, #0e1e30 100%)';
  const color = variant === 'blue' ? 'var(--gilt)' : 'var(--vellum)';
  return (
    <div className="dropcap" style={{ width: dim, height: dim, fontSize, background, color }}>
      {letter}
    </div>
  );
}

type MedallionProps = {
  readonly emblem: ReactNode;
  readonly label?: ReactNode;
  readonly state?: 'earned' | 'aged' | 'locked';
  readonly className?: string;
};

/** Guild medallion — bronze / aged verdigris / locked-grey variants. */
export function Medallion({ emblem, label, state = 'earned', className }: MedallionProps) {
  const stateClass = state === 'aged' ? 'aged' : state === 'locked' ? 'locked' : '';
  return (
    <div className={`medallion ${stateClass} ${className ?? ''}`.trim()}>
      <span className="emblem">{emblem}</span>
      {label}
    </div>
  );
}

/** Small bronze-ringed letter avatar. Tight, 36px, flex-shrink 0. */
export function Avatar({
  letter = 'A',
  className,
}: {
  readonly letter?: string;
  readonly className?: string;
}) {
  return <div className={`avatar ${className ?? ''}`.trim()}>{letter}</div>;
}

/** Desk ornaments — quill, candle, open book, inkwell. All inline-SVG,
 *  decorative, absolute-positioned by a wrapper. Keep opacity ≤ 0.45 so
 *  they read as background props, not content. */
type OrnamentProps = {
  readonly size?: number;
  readonly className?: string;
  readonly style?: CSSProperties;
};

export function QuillOrnament({ size = 110, className, style }: OrnamentProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {/* inkwell */}
      <ellipse cx="32" cy="100" rx="22" ry="6" fill="#1e0e06" opacity="0.55" />
      <path
        d="M14 98 L14 82 Q14 76 20 76 L44 76 Q50 76 50 82 L50 98 Z"
        fill="#2a1208"
        stroke="#7a4f2a"
        strokeWidth="1.2"
      />
      <ellipse cx="32" cy="82" rx="18" ry="4" fill="#0a0502" />
      {/* quill */}
      <path
        d="M40 78 Q70 50 96 12 Q88 46 60 78 Z"
        fill="#e8d5a5"
        stroke="#8a6a3a"
        strokeWidth="1"
        opacity="0.85"
      />
      <path d="M96 12 Q82 42 52 74" stroke="#5a3f22" strokeWidth="1" fill="none" />
      <path d="M90 18 L72 36 M82 28 L66 44 M74 38 L58 52" stroke="#5a3f22" strokeWidth="0.6" />
      {/* ink drip */}
      <path d="M40 82 L38 88 L42 88 Z" fill="#0a0502" />
    </svg>
  );
}

export function CandleOrnament({ size = 90, className, style }: OrnamentProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 120"
      fill="none"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {/* saucer */}
      <ellipse cx="40" cy="108" rx="28" ry="5" fill="#5a3f22" opacity="0.7" />
      <path d="M14 104 Q14 96 40 96 Q66 96 66 104 Q66 110 40 110 Q14 110 14 104 Z" fill="#8a6a3a" />
      {/* candle body */}
      <rect x="30" y="52" width="20" height="50" rx="2" fill="#e8d5a5" />
      <rect x="30" y="52" width="6" height="50" fill="#c9a863" opacity="0.4" />
      {/* wax drip */}
      <path d="M30 80 Q28 84 30 88 L30 82 Z" fill="#c9a863" />
      <path d="M50 70 Q52 76 50 80 L50 72 Z" fill="#c9a863" />
      {/* wick */}
      <rect x="39" y="48" width="2" height="6" fill="#2a1208" />
      {/* flame */}
      <path d="M40 20 Q48 32 44 44 Q40 50 36 44 Q32 32 40 20 Z" fill="#ffb23a" />
      <path d="M40 28 Q44 36 42 42 Q40 46 38 42 Q36 36 40 28 Z" fill="#ffe27a" />
      <path d="M40 36 Q41 40 40 42 Q39 40 40 36 Z" fill="#fff" opacity="0.8" />
      {/* glow */}
      <circle cx="40" cy="30" r="16" fill="#ffb23a" opacity="0.18" />
    </svg>
  );
}

export function BookOrnament({ size = 130, className, style }: OrnamentProps) {
  return (
    <svg
      width={size}
      height={size * 0.6}
      viewBox="0 0 160 96"
      fill="none"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {/* back pages */}
      <path d="M8 80 L80 74 L152 80 L152 86 L80 92 L8 86 Z" fill="#d4b878" />
      <path d="M12 78 L80 72 L148 78 L148 82 L80 88 L12 82 Z" fill="#e8d5a5" />
      {/* book body */}
      <path
        d="M8 80 Q40 62 80 64 Q120 62 152 80 L152 82 Q120 64 80 66 Q40 64 8 82 Z"
        fill="#8a6a3a"
      />
      {/* spine fold */}
      <path d="M78 64 L78 86 L82 86 L82 64 Z" fill="#5a3f22" />
      {/* left page */}
      <path d="M10 78 Q40 62 78 64 L78 84 Q40 64 10 82 Z" fill="#e8d5a5" />
      {/* right page */}
      <path d="M150 78 Q120 62 82 64 L82 84 Q120 64 150 82 Z" fill="#e8d5a5" />
      {/* text lines */}
      <g stroke="#5a3f22" strokeWidth="0.5" opacity="0.55">
        <line x1="22" y1="70" x2="72" y2="68" />
        <line x1="22" y1="73" x2="68" y2="71" />
        <line x1="22" y1="76" x2="72" y2="74" />
        <line x1="22" y1="79" x2="64" y2="77" />
        <line x1="88" y1="68" x2="138" y2="70" />
        <line x1="88" y1="71" x2="134" y2="73" />
        <line x1="88" y1="74" x2="138" y2="76" />
        <line x1="88" y1="77" x2="130" y2="79" />
      </g>
      {/* red ribbon bookmark */}
      <path d="M100 64 L100 94 L104 90 L108 94 L108 64 Z" fill="#8f2530" opacity="0.9" />
    </svg>
  );
}

export function ScrollOrnament({ size = 110, className, style }: OrnamentProps) {
  return (
    <svg
      width={size}
      height={size * 0.5}
      viewBox="0 0 140 72"
      fill="none"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {/* left roll */}
      <ellipse cx="18" cy="36" rx="10" ry="18" fill="#e8d5a5" stroke="#8a6a3a" strokeWidth="1" />
      <ellipse cx="18" cy="36" rx="5" ry="10" fill="#c9a863" />
      {/* body */}
      <path d="M18 18 L122 18 L122 54 L18 54 Z" fill="#e8d5a5" />
      <path d="M18 18 L122 18 L122 54 L18 54 Z" fill="none" stroke="#8a6a3a" strokeWidth="0.6" />
      {/* right roll */}
      <ellipse cx="122" cy="36" rx="10" ry="18" fill="#e8d5a5" stroke="#8a6a3a" strokeWidth="1" />
      <ellipse cx="122" cy="36" rx="5" ry="10" fill="#c9a863" />
      {/* text lines */}
      <g stroke="#5a3f22" strokeWidth="0.6" opacity="0.55">
        <line x1="32" y1="28" x2="108" y2="28" />
        <line x1="32" y1="34" x2="100" y2="34" />
        <line x1="32" y1="40" x2="108" y2="40" />
        <line x1="32" y1="46" x2="92" y2="46" />
      </g>
      {/* wax seal */}
      <circle cx="94" cy="46" r="7" fill="#8f2530" />
      <circle cx="94" cy="46" r="7" fill="none" stroke="#5a1620" strokeWidth="0.6" />
      <text
        x="94"
        y="49"
        textAnchor="middle"
        fontSize="7"
        fontFamily="serif"
        fontStyle="italic"
        fill="#e8d5a5"
      >
        A
      </text>
    </svg>
  );
}

/** Scatters ornaments around the desk as decorative background. Renders
 *  pointer-events:none wrapper so it doesn't steal clicks from real
 *  content. Place as a sibling to the main content inside `<Desk>`. */
export function DeskOrnaments() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 0,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 110,
          left: 34,
          opacity: 0.32,
          transform: 'rotate(-6deg)',
        }}
      >
        <CandleOrnament size={96} />
      </div>
      <div
        style={{
          position: 'absolute',
          top: 130,
          right: 42,
          opacity: 0.28,
          transform: 'rotate(8deg)',
        }}
      >
        <BookOrnament size={150} />
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 80,
          left: 46,
          opacity: 0.3,
          transform: 'rotate(-10deg)',
        }}
      >
        <QuillOrnament size={130} />
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 120,
          right: 48,
          opacity: 0.32,
          transform: 'rotate(-4deg)',
        }}
      >
        <ScrollOrnament size={130} />
      </div>
    </div>
  );
}
