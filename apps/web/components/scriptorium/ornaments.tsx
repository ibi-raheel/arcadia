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
