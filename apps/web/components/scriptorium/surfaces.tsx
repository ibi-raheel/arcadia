// Paper surface primitives. Six grains: vellum (flat, neutral), scroll
// (rolled ends, hero), ledger (ruled rows, records), envelope (dark
// leather, gated / heavy), journal (graph paper, charts), map (weathered,
// places). Pick per `system/surfaces.md`. All accept a `rotate` prop so
// the caller can tilt the card off the pixel grid like hand-placed paper.

import type { CSSProperties, ReactNode } from 'react';

type SurfaceProps = {
  readonly children?: ReactNode;
  readonly className?: string;
  /** Degrees. Positive = clockwise. Default 0. */
  readonly rotate?: number;
  readonly style?: CSSProperties;
};

function compose(base: string, { children, className, rotate, style }: SurfaceProps) {
  const tilt = rotate !== undefined ? { transform: `rotate(${rotate}deg)` } : undefined;
  const merged: CSSProperties = { ...(tilt ?? {}), ...(style ?? {}) };
  return (
    <div className={`${base} ${className ?? ''}`.trim()} style={merged}>
      {children}
    </div>
  );
}

export function VellumCard(props: SurfaceProps) {
  return compose('vellum-card', props);
}
export function ScrollCard(props: SurfaceProps) {
  return compose('scroll-card', props);
}
export function LedgerCard(props: SurfaceProps) {
  return compose('ledger-card', props);
}
export function EnvelopeCard(props: SurfaceProps) {
  return compose('envelope-card', props);
}

// Journal (graph-paper) and Map aren't in _shared.css yet — provide
// minimal variants here so surfaces that need them don't fall through.
// If they get promoted to the kit later, drop these helpers in favour
// of the class from scriptorium.css.
export function JournalCard({ children, className, rotate, style }: SurfaceProps) {
  const tilt = rotate !== undefined ? { transform: `rotate(${rotate}deg)` } : undefined;
  const merged: CSSProperties = {
    background:
      'repeating-linear-gradient(0deg, transparent 0 26px, rgba(30,14,6,0.14) 26px 27px),' +
      'repeating-linear-gradient(90deg, transparent 0 26px, rgba(30,14,6,0.14) 26px 27px),' +
      'linear-gradient(180deg, var(--parchment) 0%, var(--parchment-2) 100%)',
    padding: '26px 28px',
    boxShadow: '0 18px 34px rgba(0,0,0,0.55), inset 0 0 60px rgba(140,100,40,0.15)',
    borderLeft: '2px solid rgba(168, 54, 74, 0.6)',
    borderRadius: '2px',
    color: 'var(--ink)',
    position: 'relative',
    ...(tilt ?? {}),
    ...(style ?? {}),
  };
  return (
    <div className={className} style={merged}>
      {children}
    </div>
  );
}

export function MapCard({ children, className, rotate, style }: SurfaceProps) {
  const tilt = rotate !== undefined ? { transform: `rotate(${rotate}deg)` } : undefined;
  const merged: CSSProperties = {
    background:
      'radial-gradient(at 30% 20%, var(--scroll) 0%, var(--vellum-2) 55%, var(--vellum-3) 100%)',
    padding: '28px 26px',
    boxShadow: '0 18px 34px rgba(0,0,0,0.6), inset 0 0 60px rgba(140,100,40,0.2)',
    borderRadius: '2px',
    color: 'var(--ink)',
    position: 'relative',
    ...(tilt ?? {}),
    ...(style ?? {}),
  };
  return (
    <div className={className} style={merged}>
      {children}
    </div>
  );
}
