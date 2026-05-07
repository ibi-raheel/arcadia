// Outdoor image-backed town square. Replaces the Tiled orthogonal world
// (ADR 0007, `app/world-square-v3/GameWorldSquareV3.tsx`) at the /world
// route 2026-04-22 — Tiled files are retained on disk but no longer
// imported at runtime.
//
// Responsibilities mirror TavernScene: local avatar + keyboard/click input
// + space-jump + Colyseus-synced remote peers + move-throttle sending. On
// top, the square owns:
//   - four walk-onto edge triggers (N → /academy-outside, E →
//     /tavern-outside, S → /market, W → /coworking)
//   - a capacity HUD in the top-right showing "Square · N / 20" once the
//     `world-realm1` room finishes joining
//
// ADR 0004: no hardcoded tweakable values in this file. All knobs live in
// sibling *.config.ts modules.

import { MSG, type AvatarState } from '@arcadia/shared';
import * as Phaser from 'phaser';

import type { ColyseusConnection, ColyseusRoom } from '../../net/colyseus-client';
import { BOOT_ASSETS } from '../boot/asset-manifest';
import { isAvatarId } from '../shared/avatar-palette';
// Capacity HUD removed 2026-04-25 (user-feedback hotfix) — the
// "Square · N / 20" pill cluttered the world without adding much.
// Auto-sharding still happens at maxClients=20, just silently now.
import { spawnColliders } from '../shared/colliders';
import { createEdgeTriggerManager, type EdgeTriggerManager } from '../shared/edge-triggers';
import { NpcSwarm } from '../shared/npc-swarm';
import { createEnterPromptManager, type EnterPromptManager } from '../shared/enter-prompt';
import { applyFillZoom } from '../shared/fill-zoom';
import { bindOverlayInputBridge } from '../shared/overlay-input-events';
import {
  createProximityPromptManager,
  type ProximityPromptManager,
} from '../shared/proximity-prompt';
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
import { RemoteAvatar, snapshotFromState } from '../world/remote-avatar';
import {
  COLYSEUS_CONNECTION_REGISTRY_KEY,
  MEMBER_REGISTRY_KEY,
  type SceneMember,
} from '../world/WorldScene';
import { squareCameraConfig } from './camera.config';
import { squareLayersConfig } from './layers.config';
import { squareSpritesConfig } from './sprites.config';

export const SQUARE_SCENE_KEY = 'SquareScene' as const;

/** Fired on the scene's event bus when the local avatar is within the
 *  wanderer's proximity radius and presses ENTER. The React side
 *  (SageFeatures.tsx) listens for this and opens the dialogue popup. */
export const SQUARE_OPEN_SAGE_EVENT = 'square:open-sage' as const;

/**
 * Registry key written by `GameSquare` before boot when the URL carries
 * `?from=<origin>`. The scene reads it and uses the matching entry from
 * `SQUARE_RETURN_SPAWNS` (see sprites.config.ts) instead of the default
 * centre spawn, so returning from a neighbour drops the member at the
 * correct bridge/gate.
 */
export const SQUARE_SPAWN_OVERRIDE_REGISTRY_KEY = 'square-spawn-override';

const MOVE_INTERVAL_MS = 50;

type YSortableGameObject = YSortable & { setDepth: (depth: number) => unknown };

export class SquareScene extends Phaser.Scene {
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
  private enterKey?: Phaser.Input.Keyboard.Key;
  private clickTarget: { x: number; y: number } | null = null;

  private colyseus?: ColyseusConnection;
  private lastMoveSentAt = 0;
  private lastMoveState: MoveState | null = null;

  private readonly remoteAvatars = new Map<string, RemoteAvatar>();
  private unsubscribeConnected: (() => void) | null = null;

  private edgeTriggers?: EdgeTriggerManager;
  private lodgePrompt?: EnterPromptManager;
  private sagePrompt?: ProximityPromptManager;
  private unbindOverlayInput?: () => void;

  constructor() {
    super({ key: SQUARE_SCENE_KEY });
  }

  create(): void {
    const bg = this.add.image(0, 0, BOOT_ASSETS.squareOutside.key);
    bg.setOrigin(0, 0);
    bg.setDepth(squareLayersConfig.depth.ground);

    const { bounds, zoom, fadeInMs } = squareCameraConfig;
    this.cameras.main.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);
    applyFillZoom(this, bounds.width, bounds.height, zoom);
    this.scale.on('resize', () => applyFillZoom(this, bounds.width, bounds.height, zoom));
    this.physics.world.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);
    this.cameras.main.fadeIn(fadeInMs, 0, 0, 0);

    registerAvatarAnimations(this);

    this.createLocalAvatar();
    this.wireKeyboardInput();
    this.wirePointerInput();

    // Demo NPCs — wander the central square. Bounds inset by 320 px
    // so they don't crowd the edge triggers (300 px threshold).
    // Speed matches the local avatar's `walkSpeed` so peers and NPCs
    // move at the same pace on screen.
    this.npcSwarm = new NpcSwarm(this, {
      count: 6,
      bounds: { minX: 320, minY: 320, maxX: bounds.width - 320, maxY: bounds.height - 320 },
      size: squareSpritesConfig.avatar.size,
      speed: squareSpritesConfig.avatar.walkSpeed,
    });

    this.edgeTriggers = createEdgeTriggerManager(
      this,
      bounds.width,
      bounds.height,
      squareLayersConfig.edgeTriggers,
    );

    // Lodge entry — proximity prompt at the cabin in the top-right of
    // the square. Routes to / (the member's home landing).
    this.lodgePrompt = createEnterPromptManager(this, [squareLayersConfig.lodgeEntry]);

    // Wanderer NPC — proximity prompt at the bearded merchant on the
    // rug in the upper-left. ENTER opens the React sage dialogue
    // (SageFeatures listens for SQUARE_OPEN_SAGE_EVENT).
    const npc = squareLayersConfig.npc;
    this.sagePrompt = createProximityPromptManager(
      this,
      {
        centerX: npc.position.x,
        centerY: npc.position.y,
        radius: npc.proximityPx,
        label: 'Press ENTER to speak with the wanderer',
      },
      () => {
        this.game.events.emit(SQUARE_OPEN_SAGE_EVENT);
      },
    );

    // Releases keyboard captures while a React overlay input has
    // focus, so the user can type WASD / SPACE / ENTER into the
    // sage dialogue without Phaser eating the keys.
    this.unbindOverlayInput = bindOverlayInputBridge(this, {
      capturesOnBlur: ['W', 'A', 'S', 'D', 'SPACE', 'ENTER'],
    });

    this.colyseus = this.registry.get(COLYSEUS_CONNECTION_REGISTRY_KEY) as
      | ColyseusConnection
      | undefined;
    if (this.colyseus) {
      this.unsubscribeConnected = this.colyseus.subscribeConnected((room) => {
        void this.wireRemoteAvatars(room);
      });
    }

    const teardown = (): void => this.teardown();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, teardown);
    this.events.once(Phaser.Scenes.Events.DESTROY, teardown);
  }

  private createLocalAvatar(): void {
    const member = this.registry.get(MEMBER_REGISTRY_KEY) as SceneMember | undefined;
    if (!member || !isAvatarId(member.avatarId)) {
      console.warn('SquareScene: no valid member in registry; skipping avatar.');
      return;
    }

    const spawnOverride = this.registry.get(SQUARE_SPAWN_OVERRIDE_REGISTRY_KEY) as
      | { readonly x: number; readonly y: number }
      | undefined;
    const spawnPixel = spawnOverride ?? squareSpritesConfig.avatar.spawnPixel;

    const avatar = new LocalAvatar(this, {
      memberId: member.memberId,
      avatarId: member.avatarId,
      displayName: member.displayName,
      spawnPixel,
      size: squareSpritesConfig.avatar.size,
      bodyOffset: squareSpritesConfig.avatar.bodyOffset,
    });

    this.localAvatar = avatar;
    this.registerYSortable(avatar);

    if (squareLayersConfig.colliders.length > 0) {
      const group = spawnColliders(this, squareLayersConfig.colliders);
      this.physics.add.collider(avatar.body, group);
    }

    this.cameras.main.startFollow(
      avatar.rect,
      true,
      squareCameraConfig.followLerp,
      squareCameraConfig.followLerp,
    );
    this.cameras.main.setDeadzone(
      squareCameraConfig.deadzone.width,
      squareCameraConfig.deadzone.height,
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
    this.input.keyboard.addCapture('SPACE');
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.input.keyboard.addCapture('ENTER');
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
  }

  private wirePointerInput(): void {
    this.input.on(
      'pointerdown',
      (pointer: Phaser.Input.Pointer, currentlyOver: Phaser.GameObjects.GameObject[]) => {
        if (currentlyOver.length > 0) return;
        const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        this.clickTarget = { x: world.x, y: world.y };
      },
    );
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
    const remote = new RemoteAvatar(this, snapshot, squareSpritesConfig.avatar.size);
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

  private teardown(): void {
    this.teardownRemoteAvatars();
    this.edgeTriggers?.destroy();
    this.lodgePrompt?.destroy();
    this.sagePrompt?.destroy();
    this.unbindOverlayInput?.();
    this.edgeTriggers = undefined;
    this.lodgePrompt = undefined;
    this.sagePrompt = undefined;
    this.unbindOverlayInput = undefined;
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

    if (!this.localAvatar) return;

    const input = this.readInputState();
    const kbd = resolveInputVelocity(input, squareSpritesConfig.avatar.walkSpeed);

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
        squareSpritesConfig.avatar.walkSpeed,
        squareSpritesConfig.avatar.clickArrivalThreshold,
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

    const depthBase = squareLayersConfig.depth.dynamic;
    const { yAnchorRatio } = squareLayersConfig.ySort;
    for (const obj of this.ySortables) {
      obj.setDepth(calculateYSortDepth(obj, { depthBase, yAnchorRatio }));
    }

    const enterJustDown = this.enterKey ? Phaser.Input.Keyboard.JustDown(this.enterKey) : false;
    // Sage runs first — opens the React dialogue overlay and consumes
    // the ENTER for that frame so the lodge / edge triggers don't also
    // fire.
    const sageFired = this.sagePrompt?.update(
      this.localAvatar.x,
      this.localAvatar.y,
      enterJustDown,
    );
    // Lodge runs before edges so a single ENTER press is consumed by
    // the nearer interactable. (Lodge sits well inside the map; edge
    // triggers only fire in the 300 px edge band, so spatial overlap
    // is impossible — but the defensive ordering keeps future
    // triggers safe.)
    const lodgeFired = sageFired
      ? undefined
      : this.lodgePrompt?.update(this.localAvatar.x, this.localAvatar.y, enterJustDown);
    const edgeEnterAllowed = !sageFired && !lodgeFired?.navigated;
    this.edgeTriggers?.update(
      this.localAvatar.x,
      this.localAvatar.y,
      edgeEnterAllowed ? enterJustDown : false,
    );
  }
}
