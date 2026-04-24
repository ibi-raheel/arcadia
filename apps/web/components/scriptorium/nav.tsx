// Top-level nav primitives: the bronze brand mark, the wordmark block,
// and the shipping-label vellum tags used across scriptorium surfaces.

import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';

type BrandMarkProps = { readonly letter?: string; readonly className?: string };

/** 48px bronze circle with the single-letter brand seal inside. */
export function BrandMark({ letter = 'A', className }: BrandMarkProps) {
  return <div className={`brand-mark ${className ?? ''}`.trim()}>{letter}</div>;
}

type BrandProps = {
  readonly wordmark?: string;
  readonly tagline?: ReactNode;
  readonly letter?: string;
};

/** Bronze mark + "Arcadia" wordmark + optional Caveat tagline. */
export function Brand({ wordmark = 'Arcadia', tagline, letter = 'A' }: BrandProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <BrandMark letter={letter} />
      <div>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: 24,
            color: 'var(--vellum)',
            lineHeight: 1,
          }}
        >
          {wordmark}
        </div>
        {tagline && (
          <div className="hand on-dark" style={{ fontSize: 14 }}>
            {tagline}
          </div>
        )}
      </div>
    </div>
  );
}

type VTagProps = {
  readonly href: string;
  readonly label: string;
  readonly active?: boolean;
  readonly rotate?: number;
};

/** Single vellum shipping-label nav tag. */
export function VTag({ href, label, active = false, rotate }: VTagProps) {
  const style: CSSProperties | undefined =
    rotate !== undefined ? { transform: `rotate(${rotate}deg)` } : undefined;
  return (
    <Link href={href} className={`vtag ${active ? 'active' : ''}`.trim()} style={style}>
      {label}
    </Link>
  );
}

type TagNavProps = {
  readonly items: ReadonlyArray<{
    readonly key: string;
    readonly label: string;
    readonly href: string;
  }>;
  readonly active?: string;
};

/** Row of vellum tags, alternating tilt like a tacked-up shipping board. */
export function TagNav({ items, active }: TagNavProps) {
  return (
    <nav style={{ display: 'flex', gap: 8 }}>
      {items.map((it, i) => (
        <VTag
          key={it.key}
          href={it.href}
          label={it.label}
          active={active === it.key}
          rotate={i % 2 === 0 ? -1.5 : 1.5}
        />
      ))}
    </nav>
  );
}
