// Coworking tent interior. Multiplayer — joins `coworking-realm1` via
// Colyseus `filterBy(['building'])`, so only clients that entered the
// same tent on the outdoor scene share this room. maxClients = 20;
// 21st person transparently lands in a fresh room for the same tent.
//
// Visual parity with the tavern interior: image background, LocalAvatar,
// RemoteAvatars, y-sort, move-throttle. No chat/speech bubbles — tents
// are quiet workspaces for now; add a text channel in a follow-up if the
// UX needs it.

import { MSG, type AvatarState } from '@arcadia/shared';
import * as Phaser from 'phaser';

import type { ColyseusConnection, ColyseusRoom } from '../../net/colyseus-client';
import { BOOT_ASSETS } from '../boot/asset-manifest';
import { isAvatarId } from '../shared/avatar-palette';
import { createCapacityHud, type CapacityHud } from '../shared/capacity-hud';
import { spawnColliders } from '../shared/colliders';
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
import { coworkingInsideCameraConfig } from './camera.config';
import { coworkingInsideLayersConfig } from './layers.config';
import { coworkingInsideSpritesConfig } from './sprites.config';

export const COWORKING_INSIDE_SCENE_KEY = 'CoworkingInsideScene' as const;

/** Registry key the page component writes so the scene can label the HUD. */
export const COWORKING_BUILDING_ID_REGISTRY_KEY = 'coworking-building-id';

const MOVE_INTERVAL_MS = 50;
const HUD_MAX_CLIENTS = 20;

type YSortableGameObject = YSortable & { setDepth: (depth: number) => unknown };

/** "tent-3" → "Tent 3". Fallback to the raw id for anything unexpected. */
function labelFromBuildingId(id: string | null): string {
  if (!id) return 'Tent';
  const match = /^tent-([0-9]+)$/.exec(id);
  if (match) return `Tent ${match[1]}`;
  return id;
}

export class CoworkingInsideScene extends Phaser.Scene {
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

  constructor() {
    super({ key: COWORKING_INSIDE_SCENE_KEY });
  }

  create(): void {
    const bg = this.add.image(0, 0, BOOT_ASSETS.coworkingInside.key);
    bg.setOrigin(0, 0);
    bg.setDepth(coworkingInsideLayersConfig.depth.ground);

    const { bounds, zoom, fadeInMs } = coworkingInsideCameraConfig;
    this.cameras.main.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);
    applyFillZoom(this, bounds.width, bounds.height, zoom);
    this.scale.on('resize', () => applyFillZoom(this, bounds.width, bounds.height, zoom));
    this.physics.world.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);
    this.cameras.main.fadeIn(fadeInMs, 0, 0, 0);

    registerAvatarAnimations(this);

    this.createLocalAvatar();
    this.wireKeyboardInput();
    this.wirePointerInput();

    const buildingId = this.registry.get(COWORKING_BUILDING_ID_REGISTRY_KEY) as string | null;

    // Rebuild the return edge with `?from=<tentId>` so the outdoor scene
    // spawns the member back at the tent door they came from
    // (continuity). Falls back to the static config route when no
    // buildingId is present.
    const baseEdge = coworkingInsideLayersConfig.returnEdge.bottom;
    const returnEdge =
      buildingId && baseEdge
        ? {
            bottom: {
              ...baseEdge,
              route: `${baseEdge.route}?from=${encodeURIComponent(buildingId)}`,
            },
          }
        : coworkingInsideLayersConfig.returnEdge;

    this.edgeTriggers = createEdgeTriggerManager(
      this,
      bounds.width,
      bounds.height,
      returnEdge,
      () => {
        // Pre-navigate hook — send LEAVE_BUILDING before the fade
        // starts so the Colyseus room leave isn't racing the redirect.
        // Replaces the old React "Leave tent" button's handler.
        this.colyseus?.send(MSG.LEAVE_BUILDING, { building: 'coworking' });
      },
    );

    this.capacityHud = createCapacityHud(this, {
      label: labelFromBuildingId(buildingId),
      max: HUD_MAX_CLIENTS,
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
      console.warn('CoworkingInsideScene: no valid member in registry; skipping avatar.');
      return;
    }

    const avatar = new LocalAvatar(this, {
      memberId: member.memberId,
      avatarId: member.avatarId,
      displayName: member.displayName,
      spawnPixel: coworkingInsideSpritesConfig.avatar.spawnPixel,
      size: coworkingInsideSpritesConfig.avatar.size,
      bodyOffset: coworkingInsideSpritesConfig.avatar.bodyOffset,
    });

    this.localAvatar = avatar;
    this.registerYSortable(avatar);

    if (coworkingInsideLayersConfig.colliders.length > 0) {
      const group = spawnColliders(this, coworkingInsideLayersConfig.colliders);
      this.physics.add.collider(avatar.body, group);
    }

    this.cameras.main.startFollow(
      avatar.rect,
      true,
      coworkingInsideCameraConfig.followLerp,
      coworkingInsideCameraConfig.followLerp,
    );
    this.cameras.main.setDeadzone(
      coworkingInsideCameraConfig.deadzone.width,
      coworkingInsideCameraConfig.deadzone.height,
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
    const remote = new RemoteAvatar(this, snapshot, coworkingInsideSpritesConfig.avatar.size);
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
    this.edgeTriggers = undefined;
    this.capacityHud = undefined;
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
    const kbd = resolveInputVelocity(input, coworkingInsideSpritesConfig.avatar.walkSpeed);

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
        coworkingInsideSpritesConfig.avatar.walkSpeed,
        coworkingInsideSpritesConfig.avatar.clickArrivalThreshold,
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

    const depthBase = coworkingInsideLayersConfig.depth.dynamic;
    const { yAnchorRatio } = coworkingInsideLayersConfig.ySort;
    for (const obj of this.ySortables) {
      obj.setDepth(calculateYSortDepth(obj, { depthBase, yAnchorRatio }));
    }

    const enterJustDown = this.enterKey ? Phaser.Input.Keyboard.JustDown(this.enterKey) : false;
    this.edgeTriggers?.update(this.localAvatar.x, this.localAvatar.y, enterJustDown);
  }
}
