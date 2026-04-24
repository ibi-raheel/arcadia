// Minimal vellum text field — bronze underline, italic-display text,
// focus flips the underline to lantern. Pairs with a Caveat label.

import type { InputHTMLAttributes, ReactNode } from 'react';

type VellumFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> & {
  readonly label?: ReactNode;
  readonly onDark?: boolean;
  readonly className?: string;
};

export function VellumField({ label, onDark, className, id, ...input }: VellumFieldProps) {
  const inputId = id ?? `field-${input.name ?? input.placeholder?.toString().slice(0, 8) ?? 'x'}`;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className={`field-label ${onDark ? 'on-dark' : ''}`.trim()}>
          {label}
        </label>
      )}
      <input id={inputId} className={`field ${onDark ? 'field-dark' : ''}`.trim()} {...input} />
    </div>
  );
}
