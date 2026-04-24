# Area: the host (creator dashboard)

**Route:** `/dashboard` (and `/dashboard/courses/[id]`, `/dashboard/courses/[id]/analytics`)
**Lexicon name:** the host
**Reference:** `reference/2026-04-23_v4.5-scriptorium-01-design-system.html` top-nav tag (`host`). A v4.5 host HTML mockup (`03-creator-dashboard.html`) is anticipated but not yet in `reference/`. When it lands, this file gets a committed direction section.

## Purpose

The creator's keeper-room. Where they record courses, sign lessons, track membership, and host their community. The creator is NOT a merchant; they are a keeper of a small school/tavern/scriptorium.

## Mood (starter — commit during first design pass)

Lantern-lit keeper's desk. Heavy on **ledgers** (course rows, lesson rows, member rows) with **wax seals** for status (published / draft / locked). A **journal** page on the side for at-a-glance metrics before the deeper analytics surface. No envelopes here — the host opens envelopes, they don't work inside them.

Overall tone: late-evening, long hours, the work is steady. Warmer than the academy (which is quieter).

## Signature surfaces (proposed)

- **Primary content area** — `ledger-card` rows. Each course is one ledger line. Each lesson inside a course is a sub-row. Wax seal at the right: crimson for published, verdigris for signed-long-ago, unearned-gray for draft.
- **New-course CTA** — `scroll-card` with a wax button "seal it" — committing to a new course is a ceremonial act.
- **Stats strip** (top of page) — a row of small `envelope-card`s with big numbers: active members, missives sent, medallions struck this week.
- **Activity side panel** — `vellum-card.corded` with handwritten Caveat entries: "~ 4 new scribes this morning ~".

## Components likely needed

- Ledger row component (course list item, lesson list item).
- Wax-seal status badge (published / draft / private / archived).
- "Seal it" primary action (publish confirm).
- "Set aside" ghost action (save draft, cancel).
- Ink-line hand-drawn chart on journal surface (for the quick-glance metric).
- Role chip (scribe / keeper / wanderer) on member lists.

## Copy voice

- Page title: italic display (h2) — something warmer than "Creator Dashboard." Candidate: "your keep." To be decided.
- Section kickers in JetBrains Mono: `· I. COURSES` / `· II. MEMBERS` / `· III. MISSIVES`.
- Action buttons: `seal it`, `set aside`, `step inside` (enter a course), `strike a medallion`.
- Empty states: warm, not chipper. "no courses yet. light the lantern and write the first." NOT "Ready to create your first course? 🎉"

## Open questions (commit during first design pass)

- What lives above-the-fold on landing? (likely: brand + a single missive-style welcome scroll + stats strip)
- How do sections/lessons render — nested ledger or separate vellum panels?
- Where does analytics live? Link out to `dashboard/courses/[id]/analytics` or embed a mini-journal here?
- How are unpublished drafts visually different from published live courses? (proposed: draft has no wax seal, just an iron nail; published has crimson wax)

## Code pointers

- `apps/web/app/dashboard/**` — the React surface.
- `apps/web/app/dashboard/courses/[id]/actions.ts` — server actions (the data layer, not this workspace's concern).
- Per root CLAUDE.md: invoke `frontend-design:frontend-design` skill; run `/review` before merging UI changes.

## Review log

- **2026-04-23** — First design-only `/host` page shipped as part of Phase D of the frontend build-out. Reference used: `reference/2026-04-23_v4.5-scriptorium-03-creator-dashboard.html`. The wired creator dashboard at `/dashboard` remains untouched; this is a parallel surface for the aesthetic. Committed direction: hero drop-cap "W" on wax ground, four-card KPI row (scroll / candle / ledger / ink) ordered intentionally — arrivals before warmth before quests before response, because that is the shape of a good evening. Journal chart uses two hand-drawn ink lines (arrivals → wax, lingered → ink-blue) with Caveat annotations above the peak. Stats envelope sits beside the chart as a 5–7 split. Map card + people grid (6 faces) close out the page with `~ who's here tonight ~` byline.
- **2026-04-23** — motion pass shipped for `/host`:
  - **Grid-wide stagger** — `.grid-12 .stagger` reveals each row with 0.1s cadence via `settle-card`.
  - **Tally marks scratch in** — 7 groups (6 crossed + 1 single) wipe in left-to-right via `tally-scratch` clip-path, 150ms cadence from 1.1s.
  - **Journal chart ink lines draw** — both SVG paths use `pathLength="1"` + `stroke-dashoffset` + `draw-path`. Primary (wax) line 2.2s at 1.2s start; secondary (ink-blue) line 2.4s at 1.8s start. Data points fade in along the path on a `1.5s + i*0.3s` schedule.
  - **People cards pin** — 6 corded-vellum slips land via `note-land` at 70ms cadence from 1.8s, each pinned by the same bronze stud used on notes/slips.
  - **Wax seal on the stats envelope** stamps down via the shared `stamp` keyframe at t=0.9s.
  - Shared arrival elements (lantern drop, drop-cap illumination, page-head reveal, paper breath, cursor lantern) apply via `NightRoom` + globals. See `system/motion.md` §3 for the canonical choreography.

