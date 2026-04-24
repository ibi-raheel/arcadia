// Hand-drawn SVG sparkline — pure path-string generator. No dependency
// on Recharts / Chart.js / Nivo per the design/areas/analytics.md rule
// "no default chart libraries." Returns an SVG <path d="..."> string
// plus a matching fill-area path; caller renders them inside its own
// <svg> viewport.
//
// Usage:
//   const { line, area, viewBox } = buildSparkline(values, { width: 300, height: 60 });
//   <svg viewBox={viewBox}><path d={area} fill="..." /><path d={line} stroke="..." /></svg>

export type SparklineOptions = {
  /** SVG viewBox width. Default 300. */
  readonly width?: number;
  /** SVG viewBox height. Default 60. */
  readonly height?: number;
  /** Padding on each side of the viewBox so strokes don't clip. Default 4. */
  readonly padding?: number;
};

export type SparklineResult = {
  /** `d` attribute for the stroke line. */
  readonly line: string;
  /** `d` attribute for the filled area underneath. */
  readonly area: string;
  /** `viewBox` string for the parent <svg>. */
  readonly viewBox: string;
  /** Last data point's x/y in the viewBox coord system — for dots / callouts. */
  readonly last: { readonly x: number; readonly y: number };
};

/**
 * Build sparkline path strings from a numeric series.
 *
 * `values` of length < 2 returns an empty line — caller should show an
 * empty state instead of an SVG. For length === 1 we render a flat line
 * at that value (not particularly useful; consider the empty case).
 */
export function buildSparkline(
  values: readonly number[],
  opts: SparklineOptions = {},
): SparklineResult {
  const width = opts.width ?? 300;
  const height = opts.height ?? 60;
  const padding = opts.padding ?? 4;

  if (values.length < 2) {
    const mid = height / 2;
    const flat = `M${padding},${mid} L${width - padding},${mid}`;
    return {
      line: flat,
      area: `${flat} L${width - padding},${height - padding} L${padding},${height - padding} Z`,
      viewBox: `0 0 ${width} ${height}`,
      last: { x: width - padding, y: mid },
    };
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const step = innerW / (values.length - 1);

  const points = values.map((v, i) => {
    const x = padding + step * i;
    // Invert y because SVG y grows downward.
    const y = padding + innerH - ((v - min) / range) * innerH;
    return { x, y };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');

  // Safe unwraps — we've already early-returned for values.length < 2.
  const first = points[0]!;
  const last = points[points.length - 1]!;
  const areaPath =
    linePath +
    ` L${last.x.toFixed(1)},${(height - padding).toFixed(1)}` +
    ` L${first.x.toFixed(1)},${(height - padding).toFixed(1)} Z`;

  return {
    line: linePath,
    area: areaPath,
    viewBox: `0 0 ${width} ${height}`,
    last,
  };
}

/**
 * Bucket a sorted list of ISO timestamps into `bucketCount` equal
 * time bins. Useful for turning an activity list into a sparkline
 * series of "events per day" or similar.
 */
export function bucketTimestamps(
  timestamps: readonly string[],
  startIso: string,
  endIso: string,
  bucketCount: number,
): number[] {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  const span = Math.max(end - start, 1);
  const bucketSize = span / bucketCount;
  const buckets = new Array<number>(bucketCount).fill(0);
  for (const iso of timestamps) {
    const t = new Date(iso).getTime();
    if (t < start || t > end) continue;
    const idx = Math.min(Math.floor((t - start) / bucketSize), bucketCount - 1);
    buckets[idx]!++;
  }
  return buckets;
}
