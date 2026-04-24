// Buttons — bronze (primary), wax (seal / commit / destructive),
// ghost (outlined, "set aside"). All share the `.btn` base class from
// scriptorium.css with italic-display type + 30 px pill radius.
//
// GhostButton defaults to ink-on-transparent with a bronze-deep border —
// that's the common on-vellum case (cards, modals, editors). Pass
// `onDark` when the button sits on a night-room / desk surface so the
// label stays legible.

import type { ButtonHTMLAttributes, ReactNode } from 'react';

type BtnProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> & {
  readonly children: ReactNode;
  readonly className?: string;
  readonly size?: 'md' | 'sm';
};

type GhostProps = BtnProps & { readonly onDark?: boolean };

function makeButton(variantClass: string) {
  return function Button({ children, className, size = 'md', ...rest }: BtnProps) {
    const composed =
      `btn ${variantClass} ${size === 'sm' ? 'btn-sm' : ''} ${className ?? ''}`.trim();
    return (
      <button {...rest} className={composed}>
        {children}
      </button>
    );
  };
}

export const BronzeButton = makeButton('btn-primary');
export const WaxButton = makeButton('btn-wax');

export function GhostButton({
  children,
  className,
  size = 'md',
  onDark = false,
  ...rest
}: GhostProps) {
  const composed =
    `btn btn-ghost ${onDark ? 'on-dark' : ''} ${size === 'sm' ? 'btn-sm' : ''} ${className ?? ''}`.trim();
  return (
    <button {...rest} className={composed}>
      {children}
    </button>
  );
}
