# Area: the market (React StallView modal)

**Route:** `/market` (Phaser hall) → `StallView` React modal on stall click
**Lexicon name:** the market; a creator's presence there is a "stall"
**Reference:** not yet in `reference/`. Commit a starter mockup when the first StallView surface is designed.

## Scope boundary

**This file governs the React `StallView` modal only.** The Phaser stall hall (`apps/web/components/game/scenes/market/`) is game rendering — governed by its own per-scene CLAUDE.md. The catalogue page outside the hall (if it exists) is also covered here. Clicking a stall in Phaser opens the StallView modal.

## Purpose

Where a prospective member meets a creator's offering. It is NOT a product detail page — it is a visit to a stall. Read the stall-keeper's shingle, see the volumes on offer, decide whether to step inside (enrol).

## Mood (starter)

Daytime-ish compared to the academy (which is late evening). Still on the same desk, still lantern-lit, but the envelope and map primitives come out — because a stall is about place, goods, and a ledger of what's sold.

Hand-drawn signage feel. The modal arrives with a slight "dropped onto the desk" motion — a gentle scale-in + shadow bloom. Not sliding, not fading, not a spring.

## Signature surfaces (proposed)

- **Modal frame** — the modal IS a `map-card` with the desk still visible through a backdrop wash. Map-card because a stall is a place on the market, not just a record.
- **Stall header** — scribe's name + bronze medallion (their guild mark) + a Caveat one-line hand-written "what this stall is about."
- **Courses on offer** — a row of `envelope-card`s. Each envelope has a wax seal stamped with the first letter of the course title. Hovering the envelope does NOT lift it (not an interactive card until clicked — the click opens the course preview).
- **Enrol CTA** — wax button: "seal the pact" or "step inside" depending on whether payment is involved.
- **Ledger of "sold" or "enroled"** — small journal strip at the bottom: `31 scribes have visited · 12 stepped inside`.

## Components likely needed

- Modal wrapper with desk-backdrop (not a standard semi-transparent black overlay — use night + vignette).
- Map-card modal body.
- Envelope-card course-tile component.
- Wax-seal letter variant (first letter of course title).
- Host-guild medallion (specific creator's bronze).
- "Step inside" / "Seal the pact" CTA with appropriate variants.

## Copy voice

- Modal title: scribe's name in italic display. Tagline in Caveat below.
- Course tile labels: small-caps title, mono price/duration chip.
- Enrol confirmation: "welcome in. your scroll has been signed." — not "Enrollment successful ✓"
- Empty stall: "this stall is still being set out. check again by lamplight." — NOT "No courses yet"

## Open questions (commit during first design pass)

- Close affordance: X button, or "set aside" wax tag at the top? (Leaning wax tag — more in voice.)
- When the stall is empty, do we still allow visiting, or 404-equivalent? Probably visitable with "still being set out" empty state.
- Price display — mono chip, or a tiny wax-seal with a number? Proposal: small `envelope-card`-top wax seal with the price printed in Caveat beside it ("three silver").
- How does a preview of a course inside the stall look — opens ANOTHER modal on top, or navigates to a new route?

## Code pointers

- `apps/web/components/game/scenes/market/` — Phaser hall (NOT this file's scope).
- `StallView` React modal — current location TBD; check `apps/web/app/market/`.

## Review log

*(To fill in as surfaces ship.)*
