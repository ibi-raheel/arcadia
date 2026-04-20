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

const MOVE_INTERVAL_MS = 50;

/**
 * Event emitted on `game.events` by the React chat layer when a new message
 * arrives (including the sender's own optimistic echo). Handler signature:
 *   (memberId: string, text: string, messageId: string) => void
 */
export const TAVERN_SPEECH_EVENT = 'tavern:speech';

/**
 * Emitted by the scene when a speech bubble is clicked. React opens a
 * reaction picker at the supplied canvas-relative coords.
 *   (messageId: string, x: number, y: number) => void
 */
export const TAVERN_BUBBLE_CLICK_EVENT = 'tavern:bubble-click';

/**
 * React → scene signals that drive keyboard handoff. When the chat input
 * gains focus we disable Phaser's keyboard plugin so WASD types letters
 * into the input instead of also moving the avatar. Re-enabled on blur.
 */
export const TAVERN_CHAT_FOCUS_EVENT = 'tavern:chat-focus';
export const TAVERN_CHAT_BLUR_EVENT = 'tavern:chat-blur';

const SPEECH_BUBBLE_DURATION_MS = 5000;
const SPEECH_BUBBLE_DEPTH = 10_000;
const SPEECH_BUBBLE_Y_OFFSET = 64; // pixels above the avatar's origin
const SPEECH_BUBBLE_MAX_WIDTH = 200;
const SPEECH_BUBBLE_PAD_X = 10;
const SPEECH_BUBBLE_PAD_Y = 6;

/**
 * Build a speech-bubble Container (background rounded-rect + text). Origin
 * sits at the bottom-centre so callers can attach it directly above an
 * avatar's head by setting (x, y) to the avatar's top-of-head coord.
 */
function createSpeechBubble(scene: Phaser.Scene, text: string): Phaser.GameObjects.Container {
  const textObj = scene.add
    .text(0, 0, text, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '12px',
      color: '#ffffff',
      wordWrap: { width: SPEECH_BUBBLE_MAX_WIDTH, useAdvancedWrap: true },
    })
    .setOrigin(0.5, 0.5);

  const w = textObj.width + SPEECH_BUBBLE_PAD_X * 2;
  const h = textObj.height + SPEECH_BUBBLE_PAD_Y * 2;

  // Graphics for rounded-rect background + tail. Drawn relative to the
  // Container's origin, which we anchor at bottom-centre (so y is 0 at the
  // tail tip, −(h+tail) at the top of the bubble).
  const tailSize = 6;
  const bg = scene.add.graphics();
  bg.fillStyle(0x0a0a0a, 0.85);
  bg.lineStyle(1, 0x4a4a4a, 1);
  // Rounded rect anchored with bottom-centre = (0, -tailSize).
  bg.fillRoundedRect(-w / 2, -h - tailSize, w, h, 6);
  bg.strokeRoundedRect(-w / 2, -h - tailSize, w, h, 6);
  // Triangle tail pointing down to the speaker.
  bg.fillTriangle(-tailSize, -tailSize, tailSize, -tailSize, 0, 0);
  bg.lineBetween(-tailSize, -tailSize, 0, 0);
  bg.lineBetween(tailSize, -tailSize, 0, 0);

  textObj.setPosition(0, -tailSize - h / 2);

  return scene.add.container(0, 0, [bg, textObj]);
}

type YSortableGameObject = YSortable & { setDepth: (depth: number) => unknown };

export class TavernScene extends Phaser.Scene {
  private collisionLayer?: Phaser.Tilemaps.TilemapLayer;

  private readonly ySortables: YSortableGameObject[] = [];
  private localAvatar?: LocalAvatar;

  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys?: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private clickTarget: { x: number; y: number } | null = null;

  private colyseus?: ColyseusConnection;
  private lastMoveSentAt = 0;
  private lastMoveState: MoveState | null = null;

  private readonly remoteAvatars = new Map<string, RemoteAvatar>();
  private unsubscribeConnected: (() => void) | null = null;

  // Speech bubbles above speakers — keyed by memberId so a new message from
  // the same member replaces any active bubble.
  private readonly speechBubbles = new Map<string, Phaser.GameObjects.Container>();

  constructor() {
    super({ key: TAVERN_SCENE_KEY });
  }

  create(): void {
    const map = this.make.tilemap({ key: BOOT_ASSETS.tavernTilemap.key });
    const tileset = map.addTilesetImage('world', BOOT_ASSETS.tileset.key, 64, 64);
    if (!tileset) {
      throw new Error('TavernScene: failed to register tileset for tavern map');
    }

    const { tilemapLayers, depth } = tavernLayersConfig;

    const groundLayer = map.createLayer(tilemapLayers.ground, tileset, 0, 0)!;
    groundLayer.setDepth(depth.ground);

    this.collisionLayer = map.createLayer(tilemapLayers.collision, tileset, 0, 0)!;
    this.collisionLayer.setDepth(depth.collisionVisuals);
    this.collisionLayer.setCollisionByExclusion([0]);

    const overlayLayer = map.createLayer(tilemapLayers.overlay, tileset, 0, 0)!;
    overlayLayer.setDepth(depth.overlay);

    const { bounds, zoom, fadeInMs } = tavernCameraConfig;
    this.cameras.main.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);
    this.cameras.main.setZoom(zoom);
    this.physics.world.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);
    this.cameras.main.fadeIn(fadeInMs, 0, 0, 0);

    registerAvatarAnimations(this);

    this.createLocalAvatar();
    this.wireKeyboardInput();
    this.wirePointerInput();

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
    const teardown = () => {
      this.game.events.off(TAVERN_SPEECH_EVENT, this.showSpeechBubble, this);
      this.game.events.off(TAVERN_CHAT_FOCUS_EVENT, this.disableKeyboardInput, this);
      this.game.events.off(TAVERN_CHAT_BLUR_EVENT, this.enableKeyboardInput, this);
      this.teardownSpeechBubbles();
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, teardown);
    this.events.once(Phaser.Scenes.Events.DESTROY, teardown);
  }

  private disableKeyboardInput(): void {
    if (this.input.keyboard) this.input.keyboard.enabled = false;
    // Also clear click-target + zero velocity so the avatar doesn't drift
    // while the user types. Keyboard-driven velocity is already guarded by
    // the enabled flag above.
    this.clickTarget = null;
    this.localAvatar?.body.setVelocity(0, 0);
    if (this.localAvatar) this.localAvatar.isMoving = false;
  }

  private enableKeyboardInput(): void {
    if (this.input.keyboard) this.input.keyboard.enabled = true;
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

  public showSpeechBubble(memberId: string, text: string, messageId: string): void {
    const avatar = this.findAvatarByMemberId(memberId);
    if (!avatar) return;

    this.speechBubbles.get(memberId)?.destroy();

    const bubble = createSpeechBubble(this, text);
    bubble.setDepth(SPEECH_BUBBLE_DEPTH);
    bubble.setData('messageId', messageId);
    // Make the bubble clickable for the reaction picker. Hit area is a
    // rectangle matching the bubble's bounding box; sized from the text
    // object which is the second child of the container.
    const textObj = bubble.getAt(1) as Phaser.GameObjects.Text | undefined;
    const hitW = (textObj?.width ?? 100) + 24;
    const hitH = (textObj?.height ?? 20) + 16;
    // Hit rect is centred on the bubble's body (above the tail anchor).
    bubble.setInteractive(
      new Phaser.Geom.Rectangle(-hitW / 2, -hitH - 6, hitW, hitH),
      Phaser.Geom.Rectangle.Contains,
    );
    bubble.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.game.events.emit(TAVERN_BUBBLE_CLICK_EVENT, messageId, pointer.x, pointer.y);
    });

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
      spawnTile: tavernSpritesConfig.avatar.spawnTile,
    });

    this.localAvatar = avatar;
    this.registerYSortable(avatar);

    if (this.collisionLayer) {
      this.physics.add.collider(avatar.rect, this.collisionLayer);
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
    const remote = new RemoteAvatar(this, snapshot);
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

  public override update(_time: number, deltaMs: number): void {
    const dtSec = deltaMs / 1000;
    for (const remote of this.remoteAvatars.values()) {
      remote.tick(dtSec);
    }

    if (this.localAvatar) {
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

      if (!this.localAvatar.isJumping) {
        this.localAvatar.playAnim(moving ? 'walk' : 'idle', this.localAvatar.direction);
      }

      this.localAvatar.syncAttachments();

      this.sendMoveIfChanged(this.time.now);
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
