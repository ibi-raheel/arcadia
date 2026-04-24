# Area: creator analytics

**Route:** `/dashboard/courses/[id]/analytics`
**Lexicon name:** the keeper's tally; the ledger of comings and goings
**Reference:** not yet in `reference/`. Commit a starter mockup when the first analytics surface is designed.

## Purpose

The creator's look at who has passed through, what was read, what was sealed, what went silent. NOT a performance dashboard in the "growth hacker" sense — it is a keeper's weekly review of a small school.

Creator-only surface (404 for non-owners; enforced in `fetch.ts` via service-role owner check).

## Mood (starter)

Evening, after the room has gone quiet. The journal is open. An inkwell is uncapped nearby. Graph paper and ledger lines dominate — this is numerical work, but it is not cold numerical work.

No bright gradients, no pie charts, no trendy data-viz tricks. **Hand-drawn ink lines on graph paper.** This is a signature move for Arcadia.

## Signature surfaces (proposed)

- **KPI strip** (top) — four `envelope-card`s: active scribes, lessons sealed this week, missives sent, medallions struck. Big italic-display numbers on dark leather; tiny mono label below.
- **Main chart panel** — `journal-card` (graph paper). Hand-drawn SVG ink line(s) over the 26px grid. Caveat annotations in the margin ("~ a quiet tuesday ~").
- **Lesson-by-lesson table** — `ledger-card` with ruled rows. Columns: title (display), attempts (mono), completions (mono), average time (mono), last sealed (Caveat date). Stitched-spine left border.
- **Member activity list** — `vellum-card.corded` with rows of "scribe-name · last-seen · progress." Caveat note next to the most recent arrival.

## Data-viz rules (binding)

1. **No default chart libraries.** Recharts, Chart.js, Nivo — skip. The aesthetic depends on hand-drawn ink lines on the journal grid. Either build the plots as SVG (with a tiny helper), or use a minimal library we can style end-to-end.
2. **Line charts only** for the main panel. Bar charts are acceptable only on the ledger-card (thin ruled bars fitting within a single row).
3. **No pie charts.** Ever.
4. **Grid is part of the chart.** The journal-card's 26px graph bleed IS the axis grid — don't draw a second one over it.
5. **Colors from the palette only:** primary line `--wax`; secondary line `--ink-blue`; a third line only if truly needed, in `--verdigris`. No purple, no magenta, no hot yellow.
6. **Ink-line style:** 2–2.5px stroke, slight tremor (subtly imperfect path), end caps rounded. Give it a bit of a hand-drawn SVG filter if performance allows.
7. **No animations on chart data.** Draw once, stay still. (The lantern sways above the desk; the numbers hold still.)

## Components likely needed

- Envelope KPI card (big italic display number + mono label + optional wax seal).
- Journal plot (SVG line chart with graph-paper grid already baked into the surface).
- Ledger table (ruled rows, stitched spine, mono columns).
- Hand-drawn sparkline component (for inline tiny metrics in ledger rows).

## Copy voice

- Page title: italic display — "a keeper's tally" or similar. Committed during first design pass.
- Metric labels: small-caps (LESSONS SEALED · THIS WEEK).
- Deltas: plain up/down words, never "↑ 42%" in green/red. Candidate: `four more than last week.`
- Empty state: "the ink is still drying on this page — come back in a day or two."
- Loading: no spinner. A single Caveat line: `~ counting ~` that fades when data arrives.

## Open questions (commit during first design pass)

- Date-range picker — does it sit as a stack of vellum-tags across the top (7 days / 30 days / this quarter / custom), styled like the main nav tags?
- Member activity list — paginated or scroll-infinite? Leaning paginated with a vellum-tag pager at the bottom.
- Export — PDF export as a formal "ledger folio." Low priority. Could be a future feature.
- Real-time or cached? Probably cached to a reasonable TTL — no live-ticking numbers; it's a reflective surface.

## Code pointers

- `apps/web/app/dashboard/courses/[id]/analytics/**` — the React surface.
- `fetch.ts` — owner-verified service-role reads (data layer, not this workspace's concern).
- `aggregate.ts` — pure helper, Vitest-testable.

## Review log

*(To fill in as surfaces ship.)*
