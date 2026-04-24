// Pure geometry for the Donut chart. Converts a list of segments into
// stroke-dasharray + stroke-dashoffset pairs so a chain of <circle>s
// can render a proportional ring. Isolated from React so it's unit-
// testable; component wrapper lives in components/scriptorium/charts.tsx.
//
// Matches the kit's `Donut` in `ui_kits/dashboard/charts.jsx` — gilt-
// edged ring with a transparent centre, bronze base track.

export type DonutSegment = {
  /** Any positive number; the component normalises against the total. */
  readonly share: number;
  /** Any valid CSS color (`var(--…)` accepted by SVG stroke). */
  readonly color: string;
  /** Optional — used for accessible titles + legend rendering by the caller. */
  readonly label?: string;
};

export type DonutGeometry = {
  /** Ring radius (where the stroke is centred). */
  readonly r: number;
  /** Circle centre (size / 2). */
  readonly cx: number;
  /** Circumference — used as the stride for stroke-dasharray. */
  readonly circumference: number;
  /** One entry per input segment, in order. */
  readonly slices: readonly DonutSlice[];
};

export type DonutSlice = {
  readonly color: string;
  readonly label?: string;
  readonly length: number;
  readonly offset: number;
};

/**
 * `size` is the svg box (width=height); `thickness` is the stroke width.
 * We inset the radius by `thickness/2 + 2` so the stroke doesn't clip
 * the svg edges when drop-shadows are applied at the call site.
 */
export function buildDonut(
  segments: readonly DonutSegment[],
  { size, thickness }: { readonly size: number; readonly thickness: number },
): DonutGeometry {
  const r = size / 2 - thickness / 2 - 2;
  const cx = size / 2;
  const circumference = 2 * Math.PI * r;
  const total = segments.reduce((acc, s) => acc + Math.max(0, s.share), 0);
  const safeTotal = total > 0 ? total : 1;

  let accumulated = 0;
  const slices: DonutSlice[] = segments.map((s) => {
    const share = Math.max(0, s.share);
    const length = (share / safeTotal) * circumference;
    const offset = (accumulated / safeTotal) * circumference;
    accumulated += share;
    return {
      color: s.color,
      label: s.label,
      length,
      offset,
    };
  });

  return { r, cx, circumference, slices };
}
