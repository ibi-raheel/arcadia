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
  }

  private wirePointerInput(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      this.clickTarget = { x: world.x, y: world.y };
    });
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
  }
}
