// Small SVG chart primitives — quill-drawn, not d3. Match the kit's
// shape (`ui_kits/dashboard/charts.jsx`): proportional rings, stat
// blocks with italic display numbers + mono deltas, horizontal progress
// bars with lantern-glow. Geometry helpers live in `lib/charts/` so
// they stay unit-testable; this file is the React skin.

import type { CSSProperties, ReactNode } from 'react';

import { buildDonut, type DonutSegment } from '@/lib/charts/donut';

type DonutProps = {
  readonly segments: readonly DonutSegment[];
  /** Pixel size of the square svg. Default 160. */
  readonly size?: number;
  /** Ring thickness (stroke width). Default 22. */
  readonly thickness?: number;
  /** Optional inner label (rendered horizontally at the centre). */
  readonly label?: ReactNode;
  readonly className?: string;
  readonly style?: CSSProperties;
};

/** Proportional ring. Bronze-dark base track + one colored arc per
 *  segment. Centre is transparent so the caller can layer a label or
 *  medallion on top. */
export function Donut({
  segments,
  size = 160,
  thickness = 22,
  label,
  className,
  style,
}: DonutProps) {
  const g = buildDonut(segments, { size, thickness });
  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: size,
        height: size,
        flexShrink: 0,
        ...(style ?? {}),
      }}
    >
      <svg
        width={size}
        height={size}
        style={{ transform: 'rotate(-90deg)', display: 'block' }}
        aria-hidden={label ? undefined : true}
        role={label ? 'img' : undefined}
      >
        <circle
          cx={g.cx}
          cy={g.cx}
          r={g.r}
          fill="none"
          stroke="rgba(90,63,34,0.22)"
          strokeWidth={thickness}
        />
        {g.slices.map((s, i) => (
          <circle
            key={i}
            cx={g.cx}
            cy={g.cx}
            r={g.r}
            fill="none"
            stroke={s.color}
            strokeWidth={thickness}
            strokeDasharray={`${s.length} ${g.circumference}`}
            strokeDashoffset={-s.offset}
            strokeLinecap="butt"
          >
            {s.label && <title>{`${s.label}`}</title>}
          </circle>
        ))}
      </svg>
      {label && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            pointerEvents: 'none',
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
}

type BarProgressProps = {
  /** 0–100. Values outside are clamped. */
  readonly pct: number;
  /** Any CSS color; `var(--…)` accepted. Default lantern. */
  readonly color?: string;
  /** Bar thickness in px. Default 6. */
  readonly height?: number;
  /** If true, adds the lantern drop-shadow the kit uses on tier bars. Default true. */
  readonly glow?: boolean;
  readonly className?: string;
  readonly style?: CSSProperties;
  /** Accessibility — mirrored on the outer div. */
  readonly ariaLabel?: string;
};

/** Thin horizontal progress pill. Bronze-dark track, colored fill with
 *  optional drop-shadow. Matches the kit's inline `BarProgress`. */
export function BarProgress({
  pct,
  color = 'var(--lantern)',
  height = 6,
  glow = true,
  className,
  style,
  ariaLabel,
}: BarProgressProps) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div
      className={className}
      style={{
        height,
        background: 'rgba(90, 63, 34, 0.18)',
        borderRadius: Math.max(2, Math.floor(height / 2)),
        overflow: 'hidden',
        ...(style ?? {}),
      }}
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
    >
      <div
        style={{
          width: `${clamped}%`,
          height: '100%',
          background: color,
          boxShadow: glow ? `0 0 10px ${color}` : 'none',
          transition: 'width 240ms ease',
        }}
      />
    </div>
  );
}

type StatProps = {
  readonly label: ReactNode;
  readonly value: ReactNode;
  /** Optional +/- percentage; verdigris / wax / faint based on sign. */
  readonly delta?: number;
  readonly prefix?: string;
  readonly suffix?: string;
  /** Larger headline variant used by heroes. */
  readonly big?: boolean;
  readonly className?: string;
  readonly style?: CSSProperties;
};

/** Big italic number + kicker label + optional delta line. Oldstyle
 *  figures so numbers sit like handwritten ledger entries. */
export function Stat({
  label,
  value,
  delta,
  prefix = '',
  suffix = '',
  big = false,
  className,
  style,
}: StatProps) {
  const positive = delta !== undefined && delta > 0;
  const negative = delta !== undefined && delta < 0;
  const deltaColor = positive ? 'var(--verdigris)' : negative ? 'var(--wax)' : 'var(--ink-faint)';
  const arrow = positive ? '▲' : negative ? '▼' : '·';

  const rendered =
    typeof value === 'number'
      ? `${prefix}${value.toLocaleString()}${suffix}`
      : typeof value === 'string'
        ? `${prefix}${value}${suffix}`
        : value;

  return (
    <div className={className} style={style}>
      <div className="kicker">{label}</div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontSize: big ? 56 : 32,
          color: 'var(--ink)',
          lineHeight: 1,
          marginTop: 4,
          fontVariantNumeric: 'oldstyle-nums',
        }}
      >
        {rendered}
      </div>
      {delta !== undefined && (
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: 1.3,
            color: deltaColor,
            marginTop: 6,
            textTransform: 'uppercase',
          }}
        >
          {arrow} {Math.abs(delta).toFixed(1)}%{' '}
          <span style={{ color: 'var(--ink-faint)' }}>vs prev</span>
        </div>
      )}
    </div>
  );
}

type StackedSegment = {
  readonly value: number;
  readonly color: string;
  readonly label?: string;
};

type StackedBarProps = {
  readonly segments: readonly StackedSegment[];
  /** Totals fall back to the sum of values. */
  readonly total?: number;
  /** Bar thickness in px. Default 10. */
  readonly height?: number;
  readonly className?: string;
  readonly style?: CSSProperties;
};

/** Horizontal bar split into colored segments. Used by the lesson-
 *  performance table (watched / rewatched / dropped) and the tier-
 *  composition strip on the MRR block. */
export function StackedBar({ segments, total, height = 10, className, style }: StackedBarProps) {
  const sum = segments.reduce((a, s) => a + Math.max(0, s.value), 0);
  const safeTotal = total ?? (sum > 0 ? sum : 1);
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        height,
        background: 'rgba(90, 63, 34, 0.2)',
        borderRadius: 3,
        overflow: 'hidden',
        ...(style ?? {}),
      }}
    >
      {segments.map((s, i) => (
        <div
          key={i}
          title={s.label ? `${s.label}: ${s.value}` : undefined}
          style={{
            width: `${(Math.max(0, s.value) / safeTotal) * 100}%`,
            background: s.color,
            boxShadow: 'inset 0 -1px 2px rgba(0,0,0,0.25)',
          }}
        />
      ))}
    </div>
  );
}
