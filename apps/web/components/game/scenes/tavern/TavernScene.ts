// Phase 2 Week 7 interior scene. Mirrors WorldScene structure but:
//   - uses the tavern.tmj interior map (entrance at column 7 on the north wall)
//   - joins `tavern-realm1` (GameTavern sets the connection in the registry)
//   - no building-entrance zones — the "Return to World" control is a
//     React overlay button that triggers LEAVE_BUILDING + router.push
//   - no jump (optional) — keep input symmetrical with WorldScene so the
//     same muscle memory works; jump is harmless inside
//
// ADR 0004: no hardcoded tweakable values in this file. All camera / sprite
// / layer knobs live in the sibling *.config.ts modules.

import { MSG, type AvatarState } from '@arcadia/shared';
import * as Phaser from 'phaser';

import type { ColyseusConnection, ColyseusRoom } from '../../net/colyseus-client';
import { BOOT_ASSETS } from '../boot/asset-manifest';
import { isAvatarId } from '../shared/avatar-palette';
// Capacity HUD removed 2026-04-25 (user-feedback hotfix). Auto-
// sharding still happens at maxClients=20, just silently now.
import { spawnColliders } from '../shared/colliders';
import {
  createEnterPromptManager,
  type EnterPromptManager,
  type EntryTrigger,
} from '../shared/enter-prompt';
import { bindOverlayInputBridge } from '../shared/overlay-input-events';
import {
  createProximityPromptManager,
  type ProximityPromptManager,
} from '../shared/proximity-prompt';
import { applyFillZoom } from '../shared/fill-zoom';
import { NpcSwarm } from '../shared/npc-swarm';
import {
  createSpeechBubble,
  SPEECH_BUBBLE_DEPTH,
  SPEECH_BUBBLE_DURATION_MS,
  SPEECH_BUBBLE_Y_OFFSET,
} from '../shared/speech-bubble';
import { calculateYSortDepth, type YSortable } from '../shared/y-sort';
import { registerAvatarAnimations } from '../world/avatar-animations';
import {
  resolveClickTargetVelocity,
  resolveInputVelocity,
  velocityToFacingDirection,
  type InputState,
} from '../world/input';
import { LocalAvatar } from '../world/local-avatar';
import { shouldSendMove, type MoveState } from '../world/move-throttle';
import {
  COLYSEUS_CONNECTION_REGISTRY_KEY,
  MEMBER_REGISTRY_KEY,
  type SceneMember,
} from '../world/WorldScene';
import { RemoteAvatar, snapshotFromState } from '../world/remote-avatar';
import { tavernCameraConfig } from './camera.config';
import { tavernLayersConfig } from './layers.config';
import { tavernSpritesConfig } from './sprites.config';

export const TAVERN_SCENE_KEY = 'TavernScene' as const;

/**
 * Registry key the page component writes so the HUD can label the building
 * in human-readable form. Set from the `?b=` query param on /tavern
 * (2026-04-22 — pairs with Colyseus `filterBy(['building'])`).
 */
export const TAVERN_BUILDING_ID_REGISTRY_KEY = 'tavern-building-id';

/**
 * Fired when the member is standing next to the async-feed tablet
 * (right-hand shelf, coords in `tavernSpritesConfig.tablet`) and
 * presses ENTER. GameTavern listens and opens the `<FeedScroll>`
 * modal — no payload needed; the React mount already has the data.
 */
export const TAVERN_OPEN_FEED_EVENT = 'tavern:open-feed';

const MOVE_INTERVAL_MS = 50;

/**
 * Event emitted on `game.events` by the React chat layer when a new message
 * arrives (including the sender's own optimistic echo). Handler signature:
 *   (memberId: string, text: string, messageId: string) => void
 */
export const TAVERN_SPEECH_EVENT = 'tavern:speech';

/**
 * React → scene signals that drive keyboard handoff. When the chat input
 * gains focus we disable Phaser's keyboard plugin so WASD types letters
 * into the input instead of also moving the avatar. Re-enabled on blur.
 */
export const TAVERN_CHAT_FOCUS_EVENT = 'tavern:chat-focus';
export const TAVERN_CHAT_BLUR_EVENT = 'tavern:chat-blur';

// (SPEECH_BUBBLE_* constants + createSpeechBubble factory live in
// `../shared/speech-bubble` — extracted 2026-05-06 so the NPC swarm
// and the tavern chat share one implementation. The 110 px Y-offset
// is preserved per the 2026-04-23 bump that stopped the bubble bg
// overlapping the name label on 135 px avatars.)

type YSortableGameObject = YSortable & { setDepth: (depth: number) => unknown };

export class TavernScene extends Phaser.Scene {
  private readonly ySortables: YSortableGameObject[] = [];
  private localAvatar?: LocalAvatar;
  private npcSwarm?: NpcSwarm;

  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys?: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private spaceKey?: Phaser.Input.Keyboard.Key;
  private clickTarget: { x: number; y: number } | null = null;

  private colyseus?: ColyseusConnection;
  private lastMoveSentAt = 0;
  private lastMoveState: MoveState | null = null;

  // Set synchronously by the chat focus/blur events so `update()` can freeze
  // the avatar the very next frame without depending on Phaser's internal
  // `keyboard.enabled` flag (which doesn't reset `Key.isDown`, so keys that
  // were held when Tab fired stay "down" forever).
  private chatFocused = false;

  private readonly remoteAvatars = new Map<string, RemoteAvatar>();
  private unsubscribeConnected: (() => void) | null = null;

  // 2026-04-23 (Phase 7): ENTER-gated archway exit. Proximity prompt +
  // ENTER fires LEAVE_BUILDING and navigates to /tavern-outside
  // (optionally with `?from=<buildingId>` so the outdoor scene can spawn
  // the member next to the correct tavern door). The "↓ Exit ↓" in-world
  // label was removed alongside this change — the prompt pill is the
  // only exit affordance.
  private enterPrompt?: EnterPromptManager;
  private tabletPrompt?: ProximityPromptManager;
  private enterKey?: Phaser.Input.Keyboard.Key;

  // Speech bubbles above speakers — keyed by memberId so a new message from
  // the same member replaces any active bubble.
  private readonly speechBubbles = new Map<string, Phaser.GameObjects.Container>();

  constructor() {
    super({ key: TAVERN_SCENE_KEY });
  }

  create(): void {
    // Image-backed tavern (2026-04-19). The map is a single static PNG;
    // collisions will be added later via a separate data layer. For now
    // the avatar walks freely within the image's world-bounds rectangle.
    const bg = this.add.image(0, 0, BOOT_ASSETS.tavernInterior.key);
    bg.setOrigin(0, 0);
    bg.setDepth(tavernLayersConfig.depth.ground);

    const { bounds, zoom, fadeInMs } = tavernCameraConfig;
    this.cameras.main.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);
    applyFillZoom(this, bounds.width, bounds.height, zoom);
    this.scale.on('resize', () => applyFillZoom(this, bounds.width, bounds.height, zoom));
    this.physics.world.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);
    this.cameras.main.fadeIn(fadeInMs, 0, 0, 0);

    registerAvatarAnimations(this);

    this.createLocalAvatar();
    this.wireKeyboardInput();
    this.wirePointerInput();

    // Demo NPCs — three patrons drifting around the bar at the
    // local avatar's walk speed.
    this.npcSwarm = new NpcSwarm(this, {
      count: 3,
      bounds: { minX: 200, minY: 200, maxX: bounds.width - 200, maxY: bounds.height - 200 },
      size: tavernSpritesConfig.avatar.size,
      speed: tavernSpritesConfig.avatar.walkSpeed,
    });

    // Defensive reset — the React side emits a blur event on mount that
    // may arrive before this scene finishes `create()`. Guarantee the
    // keyboard plugin is on by default so WASD works immediately even if
    // that initial event was dropped.
    if (this.input.keyboard) this.input.keyboard.enabled = true;

    const buildingId = this.registry.get(TAVERN_BUILDING_ID_REGISTRY_KEY) as string | null;
    void buildingId;

    // 2026-04-23 (Phase 7): ENTER-gated archway exit. Walking into the
    // archway radius shows "Press ENTER to leave the tavern"; ENTER
    // fires LEAVE_BUILDING + fades + navigates. `?from=<buildingId>` is
    // carried to /tavern-outside so the outdoor scene can spawn the
    // member next to the door they used.
    const archway = tavernLayersConfig.exitArchway;
    const archwayRoute = buildingId
      ? `${archway.route}?from=${encodeURIComponent(buildingId)}`
      : archway.route;
    const archwayTrigger: EntryTrigger = {
      buildingId: 'tavern-archway',
      centerX: archway.centerX,
      centerY: archway.centerY,
      radius: archway.radius,
      label: 'Press ENTER to leave the Tavern',
      route: archwayRoute,
    };
    this.enterPrompt = createEnterPromptManager(this, [archwayTrigger], () => {
      // Pre-navigate hook — send LEAVE_BUILDING before the camera fade
      // begins so the server-side room leave is not racing the redirect.
      this.colyseus?.send(MSG.LEAVE_BUILDING, { building: 'tavern' });
    });

    // Phase 9 (2026-04-24) — async-feed tablet on the right-hand
    // shelf. Walking close fires a local-action proximity prompt; on
    // ENTER, emit `TAVERN_OPEN_FEED_EVENT` so the React mount can pop
    // the FeedScroll modal. No navigation — the modal overlays the
    // scene; the avatar stays right where it is.
    const tablet = tavernSpritesConfig.tablet;
    this.tabletPrompt = createProximityPromptManager(
      this,
      {
        centerX: tablet.centerX,
        centerY: tablet.centerY,
        radius: tablet.interactRadius,
        label: 'Press ENTER to read the feed',
      },
      () => {
        this.game.events.emit(TAVERN_OPEN_FEED_EVENT);
      },
    );

    this.colyseus = this.registry.get(COLYSEUS_CONNECTION_REGISTRY_KEY) as
      | ColyseusConnection
      | undefined;
    if (this.colyseus) {
      this.unsubscribeConnected = this.colyseus.subscribeConnected((room) => {
        void this.wireRemoteAvatars(room);
      });
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardownRemoteAvatars());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.teardownRemoteAvatars());

    // React-side chat wires new messages to game.events via
    // TAVERN_SPEECH_EVENT. Each emit shows (or replaces) a bubble above the
    // speaking avatar for SPEECH_BUBBLE_DURATION_MS.
    this.game.events.on(TAVERN_SPEECH_EVENT, this.showSpeechBubble, this);
    // Focus handoff — disable Phaser's keyboard plugin while the React chat
    // input is focused so WASD types letters instead of also moving the
    // avatar. Re-enabled on blur.
    this.game.events.on(TAVERN_CHAT_FOCUS_EVENT, this.disableKeyboardInput, this);
    this.game.events.on(TAVERN_CHAT_BLUR_EVENT, this.enableKeyboardInput, this);
    // Same focus / blur gate, but for ANY overlay input (feed
    // composer, sage dialogue, future overlays). Decoupled from the
    // chat-specific events so a future overlay doesn't have to know
    // about TAVERN_CHAT_*.
    const unbindOverlayInput = bindOverlayInputBridge(this, {
      capturesOnBlur: ['W', 'A', 'S', 'D', 'SPACE', 'ENTER'],
    });
    const teardown = () => {
      this.game.events.off(TAVERN_SPEECH_EVENT, this.showSpeechBubble, this);
      this.game.events.off(TAVERN_CHAT_FOCUS_EVENT, this.disableKeyboardInput, this);
      this.game.events.off(TAVERN_CHAT_BLUR_EVENT, this.enableKeyboardInput, this);
      unbindOverlayInput();
      this.tabletPrompt?.destroy();
      this.tabletPrompt = undefined;
      this.teardownSpeechBubbles();
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, teardown);
    this.events.once(Phaser.Scenes.Events.DESTROY, teardown);
  }

  private disableKeyboardInput(): void {
    this.chatFocused = true;
    if (this.input.keyboard) {
      this.input.keyboard.enabled = false;
      // Captures live on the game-level KeyboardManager and preventDefault
      // at the DOM, independent of the scene plugin's `enabled` flag. Clear
      // them so W/A/S/D/Space reach the chat <input>.
      this.input.keyboard.clearCaptures();
    }
    this.clickTarget = null;
    this.localAvatar?.body.setVelocity(0, 0);
    if (this.localAvatar) this.localAvatar.isMoving = false;
  }

  private enableKeyboardInput(): void {
    this.chatFocused = false;
    if (this.input.keyboard) {
      this.input.keyboard.enabled = true;
      this.input.keyboard.addCapture('W,A,S,D,SPACE');
      // While the plugin was disabled, any keyup events were ignored — a key
      // released during chat would still report `isDown = true` on the first
      // frame after close. Reset every tracked key's state so the avatar
      // only moves on a fresh press.
      this.input.keyboard.resetKeys();
    }
  }

  /**
   * Find an avatar by its server-side `memberId` (LocalAvatar or RemoteAvatar).
   * Used by the speech-bubble lookup; scales fine for 20 CCU.
   */
  private findAvatarByMemberId(memberId: string): LocalAvatar | RemoteAvatar | undefined {
    if (this.localAvatar && this.localAvatar.memberId === memberId) return this.localAvatar;
    for (const remote of this.remoteAvatars.values()) {
      if (remote.memberId === memberId) return remote;
    }
    return undefined;
  }

  public showSpeechBubble(memberId: string, text: string, _messageId?: string): void {
    const avatar = this.findAvatarByMemberId(memberId);
    if (!avatar) return;

    this.speechBubbles.get(memberId)?.destroy();

    const bubble = createSpeechBubble(this, text);
    bubble.setDepth(SPEECH_BUBBLE_DEPTH);

    this.speechBubbles.set(memberId, bubble);

    this.time.delayedCall(SPEECH_BUBBLE_DURATION_MS, () => {
      this.speechBubbles.get(memberId)?.destroy();
      this.speechBubbles.delete(memberId);
    });
  }

  private teardownSpeechBubbles(): void {
    for (const bubble of this.speechBubbles.values()) bubble.destroy();
    this.speechBubbles.clear();
  }

  private wirePointerInput(): void {
    this.input.on(
      'pointerdown',
      (pointer: Phaser.Input.Pointer, currentlyOver: Phaser.GameObjects.GameObject[]) => {
        // Don't click-to-move when the click landed on an interactive
        // object (speech bubble → react picker).
        if (currentlyOver.length > 0) return;
        // Don't click-to-move while the React chat input is focused
        // (mirrors the keyboard.enabled gate).
        if (this.input.keyboard && !this.input.keyboard.enabled) return;
        const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        this.clickTarget = { x: world.x, y: world.y };
      },
    );
  }

  private wireKeyboardInput(): void {
    if (!this.input.keyboard) return;
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasdKeys = this.input.keyboard.addKeys('W,A,S,D') as {
      W: Phaser.Input.Keyboard.Key;
      A: Phaser.Input.Keyboard.Key;
      S: Phaser.Input.Keyboard.Key;
      D: Phaser.Input.Keyboard.Key;
    };
    // Spacebar → one-shot jump animation, mirrors WorldScene. `addCapture`
    // stops the browser from page-scrolling when the canvas is active.
    this.input.keyboard.addCapture('SPACE');
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    // ENTER → fires the ENTER-gated archway exit (Phase 7).
    this.input.keyboard.addCapture('ENTER');
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
  }

  private readInputState(): InputState {
    const c = this.cursors;
    const w = this.wasdKeys;
    return {
      up: (c?.up.isDown ?? false) || (w?.W.isDown ?? false),
      down: (c?.down.isDown ?? false) || (w?.S.isDown ?? false),
      left: (c?.left.isDown ?? false) || (w?.A.isDown ?? false),
      right: (c?.right.isDown ?? false) || (w?.D.isDown ?? false),
    };
  }

  private createLocalAvatar(): void {
    const member = this.registry.get(MEMBER_REGISTRY_KEY) as SceneMember | undefined;
    if (!member || !isAvatarId(member.avatarId)) {
      console.warn('TavernScene: no valid member in registry; skipping avatar.');
      return;
    }

    const avatar = new LocalAvatar(this, {
      memberId: member.memberId,
      avatarId: member.avatarId,
      displayName: member.displayName,
      spawnPixel: tavernSpritesConfig.avatar.spawnPixel,
      size: tavernSpritesConfig.avatar.size,
      bodyOffset: tavernSpritesConfig.avatar.bodyOffset,
    });

    this.localAvatar = avatar;
    this.registerYSortable(avatar);

    // Collider scaffold — no-op until tavernLayersConfig.colliders is
    // populated by hand (see TAVERN_COLLIDERS in layers.config.ts).
    if (tavernLayersConfig.colliders.length > 0) {
      const group = spawnColliders(this, tavernLayersConfig.colliders);
      this.physics.add.collider(avatar.body, group);
    }

    this.cameras.main.startFollow(
      avatar.rect,
      true,
      tavernCameraConfig.followLerp,
      tavernCameraConfig.followLerp,
    );
    this.cameras.main.setDeadzone(
      tavernCameraConfig.deadzone.width,
      tavernCameraConfig.deadzone.height,
    );
  }

  public registerYSortable(obj: YSortableGameObject): void {
    this.ySortables.push(obj);
  }

  private unregisterYSortable(obj: YSortableGameObject): void {
    const idx = this.ySortables.indexOf(obj);
    if (idx >= 0) this.ySortables.splice(idx, 1);
  }

  private async wireRemoteAvatars(room: ColyseusRoom): Promise<void> {
    this.teardownRemoteAvatars();

    const { getStateCallbacks } = await import('colyseus.js');
    const $ = getStateCallbacks(room as unknown as Parameters<typeof getStateCallbacks>[0]);

    const avatarsProxy = $(room.state).avatars;

    avatarsProxy.onAdd((state: AvatarState, sessionId: string) => {
      this.addRemoteAvatar(sessionId, state, room.sessionId, $);
    }, true);

    avatarsProxy.onRemove((_state: AvatarState, sessionId: string) => {
      this.removeRemoteAvatar(sessionId);
    });
  }

  private addRemoteAvatar(
    sessionId: string,
    state: AvatarState,
    selfSessionId: string,
    $: (instance: unknown) => { onChange(cb: () => void): () => void },
  ): void {
    if (sessionId === selfSessionId) return;
    if (this.remoteAvatars.has(sessionId)) return;
    const snapshot = snapshotFromState(state);
    if (!snapshot) return;
    const remote = new RemoteAvatar(this, snapshot, tavernSpritesConfig.avatar.size);
    this.remoteAvatars.set(sessionId, remote);
    this.registerYSortable(remote);
    $(state).onChange(() => {
      remote.applyPatch(state);
    });
  }

  private removeRemoteAvatar(sessionId: string): void {
    const remote = this.remoteAvatars.get(sessionId);
    if (!remote) return;
    this.unregisterYSortable(remote);
    remote.destroy();
    this.remoteAvatars.delete(sessionId);
  }

  private teardownRemoteAvatars(): void {
    for (const [, remote] of this.remoteAvatars) {
      this.unregisterYSortable(remote);
      remote.destroy();
    }
    this.remoteAvatars.clear();

    if (this.unsubscribeConnected) {
      this.unsubscribeConnected();
      this.unsubscribeConnected = null;
    }
  }

  private sendMoveIfChanged(now: number): void {
    if (!this.colyseus || !this.localAvatar) return;
    const current: MoveState = {
      x: this.localAvatar.x,
      y: this.localAvatar.y,
      direction: this.localAvatar.direction,
      isMoving: this.localAvatar.isMoving,
    };
    if (!shouldSendMove(current, this.lastMoveState, this.lastMoveSentAt, now, MOVE_INTERVAL_MS)) {
      return;
    }
    this.colyseus.send(MSG.MOVE, current);
    this.lastMoveSentAt = now;
    this.lastMoveState = current;
  }

  public override update(time: number, deltaMs: number): void {
    const dtSec = deltaMs / 1000;
    for (const remote of this.remoteAvatars.values()) {
      remote.tick(dtSec);
    }
    this.npcSwarm?.update(time, deltaMs);

    if (this.localAvatar) {
      // Chat focused → hard-stop the avatar and skip all input processing.
      // Phaser freezes Key.isDown updates when the plugin is disabled, so a
      // key that was held when Tab fired (e.g. W) would stay "down" and keep
      // the avatar walking; this branch makes it impossible.
      if (this.chatFocused) {
        this.localAvatar.body.setVelocity(0, 0);
        this.localAvatar.isMoving = false;
        if (!this.localAvatar.isJumping) {
          this.localAvatar.playAnim('idle', this.localAvatar.direction);
        }
        this.localAvatar.syncAttachments();
        this.sendMoveIfChanged(this.time.now);
        const depthBase = tavernLayersConfig.depth.dynamic;
        const { yAnchorRatio } = tavernLayersConfig.ySort;
        for (const obj of this.ySortables) {
          obj.setDepth(calculateYSortDepth(obj, { depthBase, yAnchorRatio }));
        }
        for (const [memberId, bubble] of this.speechBubbles) {
          const avatar = this.findAvatarByMemberId(memberId);
          if (avatar) bubble.setPosition(avatar.x, avatar.y - SPEECH_BUBBLE_Y_OFFSET);
        }
        return;
      }

      const input = this.readInputState();
      const kbd = resolveInputVelocity(input, tavernSpritesConfig.avatar.walkSpeed);

      let vx = 0;
      let vy = 0;
      let moving = false;

      if (kbd.isMoving) {
        this.clickTarget = null;
        vx = kbd.vx;
        vy = kbd.vy;
        moving = true;
      } else if (this.clickTarget) {
        const res = resolveClickTargetVelocity(
          { x: this.localAvatar.x, y: this.localAvatar.y },
          this.clickTarget,
          tavernSpritesConfig.avatar.walkSpeed,
          tavernSpritesConfig.avatar.clickArrivalThreshold,
          'e',
        );
        if (res.arrived) {
          this.clickTarget = null;
        } else {
          vx = res.vx;
          vy = res.vy;
          moving = true;
        }
      }

      this.localAvatar.body.setVelocity(vx, vy);
      this.localAvatar.isMoving = moving;
      this.localAvatar.direction = velocityToFacingDirection(vx, vy, this.localAvatar.direction);

      // Spacebar → one-shot jump. JustDown fires only on the key-press
      // transition, so holding space doesn't restart the jump each frame.
      if (
        this.spaceKey &&
        Phaser.Input.Keyboard.JustDown(this.spaceKey) &&
        !this.localAvatar.isJumping
      ) {
        this.localAvatar.triggerJump(this.localAvatar.direction);
      }

      if (!this.localAvatar.isJumping) {
        this.localAvatar.playAnim(moving ? 'walk' : 'idle', this.localAvatar.direction);
      }

      this.localAvatar.syncAttachments();

      this.sendMoveIfChanged(this.time.now);

      const enterJustDown = this.enterKey ? Phaser.Input.Keyboard.JustDown(this.enterKey) : false;
      // Tablet prompt runs first so a single ENTER at a spot where
      // both prompts are active (can't happen today — tablet is far
      // from the archway — but the defensive order future-proofs the
      // addition of new in-tavern interactables).
      const tabletFired =
        this.tabletPrompt?.update(this.localAvatar.x, this.localAvatar.y, enterJustDown) ?? false;
      this.enterPrompt?.update(
        this.localAvatar.x,
        this.localAvatar.y,
        tabletFired ? false : enterJustDown,
      );
    }

    const depthBase = tavernLayersConfig.depth.dynamic;
    const { yAnchorRatio } = tavernLayersConfig.ySort;
    for (const obj of this.ySortables) {
      obj.setDepth(calculateYSortDepth(obj, { depthBase, yAnchorRatio }));
    }

    // Reposition each live speech bubble above its speaker. Bubbles follow
    // the avatar one-for-one so they stay glued during movement.
    for (const [memberId, bubble] of this.speechBubbles) {
      const avatar = this.findAvatarByMemberId(memberId);
      if (avatar) {
        bubble.setPosition(avatar.x, avatar.y - SPEECH_BUBBLE_Y_OFFSET);
      }
    }
  }
}
