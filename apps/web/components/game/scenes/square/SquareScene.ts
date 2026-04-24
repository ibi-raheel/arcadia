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
import { createCapacityHud, type CapacityHud } from '../shared/capacity-hud';
import { spawnColliders } from '../shared/colliders';
import { addCrispText } from '../shared/crisp-text';
import { createEdgeTriggerManager, type EdgeTriggerManager } from '../shared/edge-triggers';
import { applyFillZoom } from '../shared/fill-zoom';
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

/**
 * Registry key written by `GameSquare` before boot when the URL carries
 * `?from=<origin>`. The scene reads it and uses the matching entry from
 * `SQUARE_RETURN_SPAWNS` (see sprites.config.ts) instead of the default
 * centre spawn, so returning from a neighbour drops the member at the
 * correct bridge/gate.
 */
export const SQUARE_SPAWN_OVERRIDE_REGISTRY_KEY = 'square-spawn-override';

const MOVE_INTERVAL_MS = 50;
const HUD_MAX_CLIENTS = 20;

type YSortableGameObject = YSortable & { setDepth: (depth: number) => unknown };

export class SquareScene extends Phaser.Scene {
  private readonly ySortables: YSortableGameObject[] = [];
  private localAvatar?: LocalAvatar;

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
  private capacityHud?: CapacityHud;

  private npcBubble?: Phaser.GameObjects.Container;
  private npcBubbleText?: Phaser.GameObjects.Text;
  private npcBubbleBg?: Phaser.GameObjects.Graphics;
  private npcWasNear = false;

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

    this.edgeTriggers = createEdgeTriggerManager(
      this,
      bounds.width,
      bounds.height,
      squareLayersConfig.edgeTriggers,
    );

    this.capacityHud = createCapacityHud(this, { label: 'Square', max: HUD_MAX_CLIENTS });

    this.createNpcBubble();

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
      this.refreshHud(room);
    }, true);

    avatarsProxy.onRemove((_state: AvatarState, sessionId: string) => {
      this.removeRemoteAvatar(sessionId);
      this.refreshHud(room);
    });

    this.refreshHud(room);
  }

  private refreshHud(room: ColyseusRoom): void {
    if (!this.capacityHud) return;
    const count = (room.state.avatars as unknown as { size: number }).size;
    this.capacityHud.setCount(count);
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
    this.capacityHud?.destroy();
    this.npcBubble?.destroy();
    this.edgeTriggers = undefined;
    this.capacityHud = undefined;
    this.npcBubble = undefined;
    this.npcBubbleText = undefined;
    this.npcBubbleBg = undefined;
  }

  private createNpcBubble(): void {
    const text = addCrispText(this, 0, 0, '', {
      fontFamily: '"Georgia", "Cambria", "Times New Roman", serif',
      fontSize: '17px',
      color: '#1c1917',
      wordWrap: { width: 260 },
      align: 'center',
    })
      .setOrigin(0.5, 1)
      .setPadding(12, 8, 12, 8);
    const bg = this.add.graphics();
    this.npcBubble = this.add.container(0, 0, [bg, text]).setDepth(2_000_000).setVisible(false);
    this.npcBubbleText = text;
    this.npcBubbleBg = bg;
  }

  private showRandomNpcTip(): void {
    if (!this.npcBubble || !this.npcBubbleText || !this.npcBubbleBg) return;
    const tips = squareLayersConfig.npc.tips;
    const tip = tips[Math.floor(Math.random() * tips.length)] ?? '';
    this.npcBubbleText.setText(tip);
    const w = this.npcBubbleText.width;
    const h = this.npcBubbleText.height;
    this.npcBubbleBg.clear();
    this.npcBubbleBg.fillStyle(0xffffff, 0.95);
    this.npcBubbleBg.lineStyle(2, 0x1e293b, 1);
    this.npcBubbleBg.fillRoundedRect(-w / 2, -h, w, h, 10);
    this.npcBubbleBg.strokeRoundedRect(-w / 2, -h, w, h, 10);
    // Tail pointing down at the NPC's head.
    this.npcBubbleBg.fillTriangle(-8, 0, 8, 0, 0, 10);
    this.npcBubbleBg.strokeTriangle(-8, 0, 8, 0, 0, 10);
    this.npcBubble.setVisible(true);
  }

  private updateNpcBubble(ax: number, ay: number): void {
    if (!this.npcBubble) return;
    const cfg = squareLayersConfig.npc;
    this.npcBubble.setPosition(cfg.position.x, cfg.headY);
    const dx = ax - cfg.position.x;
    const dy = ay - cfg.position.y;
    const near = Math.hypot(dx, dy) < cfg.proximityPx;
    if (near && !this.npcWasNear) this.showRandomNpcTip();
    if (!near && this.npcWasNear) this.npcBubble.setVisible(false);
    this.npcWasNear = near;
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

    this.updateNpcBubble(this.localAvatar.x, this.localAvatar.y);
    const enterJustDown = this.enterKey
      ? Phaser.Input.Keyboard.JustDown(this.enterKey)
      : false;
    this.edgeTriggers?.update(this.localAvatar.x, this.localAvatar.y, enterJustDown);
  }
}
