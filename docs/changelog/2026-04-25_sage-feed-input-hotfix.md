# 2026-04-25 · Hotfix — sage ENTER + feed ENTER + overlay typing

**PR:** [#19](https://github.com/ibi-raheel/arcadia/pull/19)
**Merged:** `9909930`

Three production bugs caught the same way as the tavern-chat issue
from a few weeks back. Documented in detail in
`apps/web/components/game/CLAUDE.md` § "Two gotchas that bit hard
enough to write down."

## Bugs

1. **Sage proximity prompt visible, ENTER does nothing.**
   `SquareScene` emitted `SQUARE_OPEN_SAGE_EVENT` on `this.events`
   (scene-local bus). `SageFeatures` listened on
   `gameRef.current.events` (Phaser.Game-level bus). Different
   buses → never met.

2. **Couldn't type WASD / SPACE / ENTER in the sage input.**
   No focus / blur bridge → Phaser's KeyboardManager (capture-phase
   listener on `window`) ate the keys before the textarea saw them.

3. **Same WASD / SPACE eat in the tavern-feed composer.**
   ChatPanel had its own bridge; FeedScroll's textarea didn't emit
   focus, so opening the feed silently disabled WASD inside the
   composer too.

## Fix

- `SquareScene.ts` — emit on `this.game.events` instead of
  `this.events`.
- New module `apps/web/components/game/scenes/shared/overlay-input-
  events.ts`:
  - `OVERLAY_INPUT_FOCUS_EVENT` / `OVERLAY_INPUT_BLUR_EVENT`
    (custom DOM events on `window` — no game-ref plumbing).
  - `emitOverlayInputFocus()` / `emitOverlayInputBlur()` for React
    overlays.
  - `bindOverlayInputBridge(scene, { capturesOnBlur })` for Phaser
    scenes.
- `SquareScene` + `TavernScene` both bind the bridge with
  `['W','A','S','D','SPACE','ENTER']` as the captures-on-blur set.
- `SageDialogue` + `FeedScroll` both fire focus on mount, blur on
  cleanup.

## Why a custom DOM event instead of `game.events`

The bridge needs to reach into a Phaser scene that the React
overlay doesn't have a ref to. A `window`-level CustomEvent
decouples both sides — neither needs to know about the other's
existence, and we don't have to plumb a `gameRef` prop down to
every overlay.

## Test plan (manual, on prod)

- `/world` → walk to wanderer → ENTER → dialogue opens.
- Type "what is arcadia?" — keys land in the input, no avatar move.
- Esc → dialogue closes, WASD again moves the avatar.
- `/tavern` → walk to tablet → ENTER → feed opens.
- Type in composer — same behaviour.
- Tab to open chat — still works (regression check).
