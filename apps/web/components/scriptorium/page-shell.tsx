// Page-level containers. Pair `<NightRoom>` + `<Desk>` as the outermost
// wrappers for every scriptorium-styled React surface.

import type { ReactNode } from 'react';

type WithChildren = { readonly children?: ReactNode; readonly className?: string };

/** The dark page — black vignette, lantern-coloured radial glow from the top. */
export function NightRoom({ children, className }: WithChildren) {
  return <div className={`arcadia-night ${className ?? ''}`}>{children}</div>;
}

/** The stained-oak desk surface — bronze corner bosses baked in. */
export function Desk({ children, className }: WithChildren) {
  return <div className={`desk-surface ${className ?? ''}`}>{children}</div>;
}
