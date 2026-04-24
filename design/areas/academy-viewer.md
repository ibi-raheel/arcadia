# Area: the academy (React course viewer)

**Route:** `/academy/[courseId]` (the React viewer — NOT the Phaser hall at `/academy`, which is game rendering)
**Lexicon name:** the academy; the course itself is a "course of study" or "volume"
**Reference:** not yet in `reference/`. Commit a starter mockup when the first viewer surface is designed.

## Scope boundary

**This file governs the React course viewer only.** The Phaser hall (`apps/web/components/game/scenes/academy/`) is game rendering and is governed by its own per-scene CLAUDE.md. Members enter the hall in Phaser, click a podium, and Phaser dispatches `ACADEMY_NAVIGATE_EVENT` which pushes to this React viewer.

## Purpose

Where a member reads / watches / works through a course. Long-form consumption. Must feel like opening a bound volume on the desk after crossing the hall.

## Mood (starter)

Quieter than the host. The lantern is lower; the desk is clearer; the member is alone with the book. **Scroll-heavy** for lesson content (long-form reading on a rolled scroll), **drop caps** on lesson intros to signal the start of a chapter, **journal** surface for progress tracking and notes.

The transition from Phaser hall → React viewer should feel like sitting down at the desk — a gentle fade, the lantern settles, the page opens.

## Signature surfaces (proposed)

- **Lesson body** — `scroll-card` at full content width. First paragraph gets a blue-ground drop cap (or wax for milestone lessons, verdigris for reflective/summary lessons).
- **Video embed** (YouTube unlisted per ADR 0006) — nested inside a `vellum-card.corded` with a leather cord across the top. Below the embed: transcript on the same vellum.
- **Progress sidebar** — `journal-card` (graph paper) running down the right. Lessons as grid cells; crossed-out hand-drawn lines for completed ones. Caveat marginalia for notes.
- **Navigation (prev / next lesson)** — vellum tags at the bottom. Prev rotates `-2°`, next rotates `+2°`. Tilted inward.
- **Completion medallion** — bronze `medallion` struck when the course finishes. Earned medallions age to verdigris in the member's profile.

## Components likely needed

- Scroll-card reader with drop cap and prose body (EB Garamond @ 17-19px, generous line-height).
- Video frame (16:9) inside vellum-card.corded.
- Progress sidebar with lesson checklist + ink-line strikethroughs.
- Prev/next vellum-tag nav.
- Course-completion medallion reveal (one-time orchestrated page event).
- "Seal this lesson" (mark as complete) — wax button.

## Copy voice

- Lesson headers: italic display h2.
- Section kickers: `· LESSON III · THE LOOM` in small caps or mono.
- Progress: "you've read 4 of 9 pages" — not "40% complete."
- Complete state: "this volume is closed. a medallion was struck for you." — not "Course complete! 🏆"
- Empty/locked lessons: iron-nail indicator + "not yet opened" in Caveat.

## Open questions (commit during first design pass)

- Drop cap on every lesson, or only the first lesson of a course? (Proposal: first lesson blue-ground; subsequent lessons plain but still scroll-surface.)
- Transcript below video vs. collapsible transcript sidebar?
- Does the sidebar show a mini-map of the academy hall (where other courses live)? Could be a beautiful hook, but complicates scope.
- How to surface "your note on page 4" — marginalia rendered in Caveat next to the paragraph it annotates?

## Code pointers

- `apps/web/app/academy/[courseId]/**` — the React viewer (distinct from `apps/web/app/academy/page.tsx`, which mounts Phaser).
- The Phaser scene dispatches here; see `apps/web/components/game/scenes/academy/CLAUDE.md`.

## Review log

*(To fill in as surfaces ship.)*
