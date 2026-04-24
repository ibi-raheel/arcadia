// Typography primitives: kicker (small-caps mono with a bronze dot),
// hand-scrawled marginalia, and the chapter divider (roman-numeral
// chapter strip between sections).

import type { ReactNode } from 'react';

type Props = {
  readonly children: ReactNode;
  readonly className?: string;
  readonly onDark?: boolean;
};

/** Tiny all-caps mono label with a bronze lantern-dot prefix. */
export function Kicker({ children, className, onDark }: Props) {
  return (
    <div className={`kicker ${onDark ? 'on-dark' : ''} ${className ?? ''}`.trim()}>{children}</div>
  );
}

/** Caveat-cursive marginalia. Oxblood on vellum, lantern on dark. */
export function Hand({ children, className, onDark }: Props) {
  return (
    <span className={`hand ${onDark ? 'on-dark' : ''} ${className ?? ''}`.trim()}>{children}</span>
  );
}

type ChapterDividerProps = {
  readonly chapter: string;
  readonly ornament?: string;
};

/** "III. surfaces ✦" style section break. */
export function ChapterDivider({ chapter, ornament = '✦' }: ChapterDividerProps) {
  return (
    <div className="chapter-divider">
      <span className="chap">{chapter}</span>
      <span className="line" />
      <span className="orn">{ornament}</span>
      <span className="line" />
    </div>
  );
}
