// Mono all-caps role / category chips. Four variants — bronze, wax,
// verdigris, gilt — from scriptorium.css.

import type { ReactNode } from 'react';

type ChipProps = {
  readonly children: ReactNode;
  readonly variant?: 'bronze' | 'wax' | 'verdigris' | 'gilt';
  readonly onDark?: boolean;
  readonly className?: string;
};

const VARIANT_CLASS: Record<NonNullable<ChipProps['variant']>, string> = {
  bronze: '',
  wax: 'chip-wax',
  verdigris: 'chip-verd',
  gilt: 'chip-gilt',
};

export function Chip({ children, variant = 'bronze', onDark, className }: ChipProps) {
  const classes =
    `chip ${VARIANT_CLASS[variant]} ${onDark ? 'chip-on-dark' : ''} ${className ?? ''}`.trim();
  return <span className={classes}>{children}</span>;
}
