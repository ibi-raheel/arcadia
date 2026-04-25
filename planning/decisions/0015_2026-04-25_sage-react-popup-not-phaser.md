# ADR 0015 — Sage chat surface: React popup, not Phaser bubble

**Date:** 2026-04-25
**Status:** Accepted
**Related:** ADR 0014 (sage knowledge base), Phase 11 plan, ADR 0009
(design system / Phaser-not-styled separation)

## Context

The current sage interaction is a Phaser-rendered speech bubble
with a hardcoded white-on-blue look (see `SquareScene.createNpc-
Bubble`). It clashes with the scriptorium aesthetic, doesn't
support multi-line conversations, can't host an input field, and
doesn't survive the conversation across visits.

We need a chat surface for multi-turn Q&A.

## Decision

**Render the sage's dialogue as a React popup, not a Phaser
overlay.** Phaser keeps the proximity detection (player walks
within 380 px → ENTER prompt appears). On ENTER, Phaser emits
`SQUARE_OPEN_SAGE_EVENT` on the `game.events` bus. A new
`SageFeatures.tsx` mounted by `GameSquare.tsx` listens on the bus
and opens the popup.

This is the same React-overlay-driven-by-Phaser-events pattern
already used by:

- Tavern feed (`TavernFeatures.tsx` listens for `tavern:open-feed`)
- Academy ledger (`LedgerScroll` listens for `academy:open-ledger`)
- Market catalog (`CatalogScroll` listens for `market:open-catalog`)

## Rationale

**React owns the design system.** Per ADR 0009, scriptorium
primitives (ScrollCard, DropCap, WaxButton, VellumField) only live
in React. Trying to recreate them in Phaser graphics is wasted
effort — they'd drift from the React versions and the bundler can't
share styles.

**Chat needs an input field.** Phaser has no native text input;
implementing one on top of `Phaser.GameObjects.Container` is a
well-known pain (focus management, IME handling, mobile keyboard,
clipboard). The browser already does all of that for `<input>`.

**Conversation history is non-trivial.** A scrollable transcript,
auto-scroll-on-new-message, role-styled bubbles — all trivial in
React, all custom in Phaser.

**Pattern consistency.** Five other features in the app use the
same Phaser-emits → React-listens pattern. Adding a sixth is
muscle memory; inventing a Phaser-native surface would be the
outlier.

## Consequences

**Good:**

- Reuses every scriptorium primitive — looks right by construction.
- `<input>` + browser focus + clipboard + IME work for free.
- Conversation persistence via `localStorage` is straightforward.
- Same code path as the feed / ledger / catalog — one mental model.

**Watch out:**

- The popup covers the avatar / scene while open. Acceptable —
  conversation is the focus; the world can wait. (Same trade-off
  the tavern feed makes.)
- Mobile viewport: keyboard-up + popup-overlap needs a check. The
  popup has a max-height + scrollable transcript so it fits.

## Alternatives considered

- **Phaser-rendered chat with custom IME bridge.** Possible but
  expensive to build and maintain; would diverge visually from
  every other dialog in the app.
- **Floating React panel beside the avatar in screen space.**
  Cute but blocks the rest of the world during a long chat. Modal
  is cleaner.
- **Inline chat as a sidebar component, not modal.** Tried in the
  feed (deferred). Same answer here: modal first; sidebar can
  follow if user feedback asks for it.

## Implementation notes

1. `SquareScene.ts` strips `createNpcBubble` / `showRandomNpcTip` /
   `updateNpcBubble`. Replaces with a `ProximityPromptManager`
   instance pointing at the NPC coords; on ENTER the manager fires
   `SQUARE_OPEN_SAGE_EVENT` on `this.events`.
2. `SQUARE_OPEN_SAGE_EVENT` is exported from `SquareScene.ts` like
   `TAVERN_OPEN_FEED_EVENT` so client code can subscribe by name.
3. `GameSquare.tsx` mounts `<SageFeatures />` alongside the
   `CapacityHud`.
4. `SageFeatures.tsx` polls the game ref every 500 ms until the
   game mounts (mirrors `TavernFeatures.tsx`), then attaches a
   listener on the open event. Owns `open` state + dialogue popup.
5. Dialogue popup component lives at `components/sage/SageDialogue.
   tsx`. Self-contained; takes nothing but `open` + `onClose`.
