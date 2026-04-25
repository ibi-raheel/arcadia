// Two-sided flip card. Click / Enter / Space toggles a Y-axis flip
// using CSS 3D transforms. Each face accepts arbitrary children, so
// the caller decides which surface (VellumCard, ScrollCard, etc.) goes
// on the front and back. The wrapper provides only the perspective +
// flip mechanics + accessibility plumbing.

'use client';

import { useCallback, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';

type Props = {
  readonly front: ReactNode;
  readonly back: ReactNode;
  /** Accessible label for the flip control (e.g. "Academy card"). */
  readonly ariaLabel: string;
  /** Min-height for both faces, so flips don't reflow. Default 220px. */
  readonly minHeight?: number;
  readonly className?: string;
  readonly style?: CSSProperties;
};

export function FlipCard({
  front,
  back,
  ariaLabel,
  minHeight = 220,
  className,
  style,
}: Props): React.JSX.Element {
  const [flipped, setFlipped] = useState(false);

  const toggle = useCallback(() => setFlipped((v) => !v), []);
  const onKey = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    },
    [toggle],
  );

  const wrapperStyle: CSSProperties = {
    perspective: '1200px',
    cursor: 'pointer',
    minHeight,
    ...style,
  };

  const innerStyle: CSSProperties = {
    position: 'relative',
    width: '100%',
    minHeight,
    transformStyle: 'preserve-3d',
    transition: 'transform 600ms cubic-bezier(0.22, 1, 0.36, 1)',
    transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
  };

  const faceStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    minHeight,
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
    display: 'flex',
  };

  const backFaceStyle: CSSProperties = {
    ...faceStyle,
    transform: 'rotateY(180deg)',
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-pressed={flipped}
      onClick={toggle}
      onKeyDown={onKey}
      className={className}
      style={wrapperStyle}
    >
      <div style={innerStyle}>
        <div style={faceStyle} aria-hidden={flipped}>
          {front}
        </div>
        <div style={backFaceStyle} aria-hidden={!flipped}>
          {back}
        </div>
      </div>
    </div>
  );
}
