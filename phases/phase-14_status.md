# Phase 14 — Status

Source plan: `phase-14_plan.md`. Entries chronological, newest on top.

## 2026-04-25 — Phase 14 opened (14.0 · plan + ADR + asset ingest)

Branch `feature/player-hud` cut from `main`. Plan + status files in
place. ADR 0018 captures the three rendering choices (Kenney 9-slice
panels, CSS-token fill, SVG shield over PNG asset) + the alternative
considered (adding `xp` to AvatarState — rejected for now since no
other client reads it). Subset of Kenney's "Fantasy UI Borders" v1.0
(CC0) checked in at `apps/web/public/hud/kenney/` — 4 PNGs + license
+ attribution. `apps/web/public/CLAUDE.md` updated to register the
new `hud/` category per its drift rules. Sub-phase ritual from
CLAUDE.md applies; this feature opted into autonomous mode (no per-
sub-phase review, commits + log entries continue).
