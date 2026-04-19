// Outdoor isometric world. Phase 1 skeleton (Step 7) renders the tilemap and
// sets up the camera; avatar, input, collision physics, y-sort, and building
// entrance zones land in Steps 8–16. Strict rule per ADR 0004: no hardcoded
// tweakable values — everything that a human might want to adjust lives in
// `camera.config.ts`, `sprites.config.ts`, or `layers.config.ts`.

import { MSG } from '@arcadia/shared';
import * as Phaser from 'phaser';

import type { ColyseusConnection } from '../../net/colyseus-client';
import { BOOT_ASSETS, NEXT_SCENE_KEY_AFTER_BOOT } from '../boot/asset-manifest';
import { isAvatarId, type AvatarId } from '../shared/avatar-palette';
import { tileCenterToPixel } from '../shared/iso-math';
import { BUILDING_NAMES, type BuildingName } from '../shared/types';
import { calculateYSortDepth, type YSortable } from '../shared/y-sort';
import { registerAvatarAnimations } from './avatar-animations';
import { WORLD_TILE_SIZE, worldCameraConfig } from './camera.config';
import {
  resolveClickTargetVelocity,
  resolveInputVelocity,
  velocityToFacingDirection,
  type InputState,
} from './input';
import { worldLayersConfig } from './layers.config';
import { LocalAvatar } from './local-avatar';
import { shouldSendMove, type MoveState } from './move-throttle';
import { worldSpritesConfig } from './sprites.config';

/** Shape of the `member` registry entry written by GameWorld before Phaser boots. */
export type SceneMember = {
  readonly avatarId: AvatarId;
  readonly displayName: string;
};

export const MEMBER_REGISTRY_KEY = 'member';

/**
 * React-side navigation callback, injected via registry so the scene can
 * route to building shells without reaching into Next.js directly. GameWorld
 * writes this before Phaser boots.
 */
export type NavigateFn = (path: string) => void;
export const NAVIGATE_REGISTRY_KEY = 'navigate';

/**
 * Step 19 return-to-world spawn override. If set, WorldScene spawns the
 * avatar at that building's `exitTile` instead of the default centre.
 * GameWorld writes this from the `?from=` query param when present.
 */
export const SPAWN_FROM_REGISTRY_KEY = 'spawnFrom';

/**
 * Phase 2 Step 6 — the ColyseusConnection controller GameWorld creates
 * before mounting Phaser. WorldScene reads this to send MOVE at 20 Hz and
 * ENTER_BUILDING on transition. The connection is stable across reconnects
 * (`send` dispatches via the current room internally).
 */
export const COLYSEUS_CONNECTION_REGISTRY_KEY = 'colyseus';

// Phase 2 Step 6 — MOVE is throttled to 20 updates/second per TAD §4.3.
const MOVE_INTERVAL_MS = 50;

// Union of Phaser types that have `y`, `height`, and `setDepth` — building
// placeholder Rectangles (Step 9) and the local avatar (Step 12) satisfy this.
type YSortableGameObject = YSortable & {
  setDepth: (depth: number) => unknown;
};

export class WorldScene extends Phaser.Scene {
  private groundLayer?: Phaser.Tilemaps.TilemapLayer;
  private collisionLayer?: Phaser.Tilemaps.TilemapLayer;
  private overlayLayer?: Phaser.Tilemaps.TilemapLayer;

  // Dynamic-band objects whose depth is recomputed every frame from y-position.
  // Populated as Steps 9 (buildings) and 12 (avatar) land.
  private readonly ySortables: YSortableGameObject[] = [];

  private localAvatar?: LocalAvatar;

  // Input handles. Populated in create(); read each frame in update().
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys?: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private spaceKey?: Phaser.Input.Keyboard.Key;

  // Click-to-move target in world space. Cleared on arrival, on keyboard
  // input, or when the avatar is re-spawned.
  private clickTarget: { x: number; y: number } | null = null;

  // Entrance zones keyed by building name so we can wire one collider per
  // zone against the avatar once it exists.
  private readonly buildingZones = new Map<BuildingName, Phaser.GameObjects.Zone>();

  // Guards re-entry: once a building transition is in flight, further
  // overlap events are ignored so the avatar can't re-trigger fadeOut.
  private isTransitioning = false;

  // Step 6 multiplayer wiring. Connection handed off from GameWorld via the
  // registry. Dedupe-state prevents 20Hz MOVE spam when the avatar is idle;
  // only send when (x, y, direction, isMoving) has changed AND >= 50ms since
  // the last outbound message. See move-throttle.ts for the pure predicate.
  private colyseus?: ColyseusConnection;
  private lastMoveSentAt = 0;
  private lastMoveState: MoveState | null = null;

  constructor() {
    super({ key: NEXT_SCENE_KEY_AFTER_BOOT });
  }

  create(): void {
    const map = this.make.tilemap({ key: BOOT_ASSETS.tilemap.key });
    // Internal tileset name must match the .tmj's `tilesets[0].name` ("world").
    // Tile source dimensions are 64×64 (upscaled pixel art); the map itself
    // walks on a 64×32 iso grid — the extra 32px of source height renders
    // above each cell, giving the cliff/elevation look the tileset is drawn for.
    const tileset = map.addTilesetImage('world', BOOT_ASSETS.tileset.key, 64, 64);

    if (!tileset) {
      throw new Error(`WorldScene: failed to register tileset for ${BOOT_ASSETS.tilemap.key}`);
    }

    const { tilemapLayers, depth } = worldLayersConfig;

    this.groundLayer = map.createLayer(tilemapLayers.ground, tileset, 0, 0)!;
    this.groundLayer.setDepth(depth.ground);

    this.collisionLayer = map.createLayer(tilemapLayers.collision, tileset, 0, 0)!;
    this.collisionLayer.setDepth(depth.collisionVisuals);
    // Every non-zero tile in the collision layer is a solid. Physics colliders
    // wire this up against the avatar in Step 15.
    this.collisionLayer.setCollisionByExclusion([0]);

    this.overlayLayer = map.createLayer(tilemapLayers.overlay, tileset, 0, 0)!;
    this.overlayLayer.setDepth(depth.overlay);

    const { bounds, zoom, fadeInMs } = worldCameraConfig;
    this.cameras.main.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);
    this.cameras.main.setZoom(zoom);
    this.physics.world.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);
    this.cameras.main.fadeIn(fadeInMs, 0, 0, 0);

    // Register all avatar (direction, action) animations up-front so
    // LocalAvatar can .play() them without further setup.
    registerAvatarAnimations(this);

    this.createBuildingPlaceholders();
    this.createLocalAvatar();
    this.wireKeyboardInput();
    this.wirePointerInput();

    this.colyseus = this.registry.get(COLYSEUS_CONNECTION_REGISTRY_KEY) as
      | ColyseusConnection
      | undefined;
  }

  /**
   * Step 14: pointer-down → set click-target in world space. update()
   * converts that target into a velocity toward it each frame, arriving
   * when within `clickArrivalThreshold`. Keyboard input takes priority
   * and clears the target; collisions naturally halt the velocity-driven
   * motion because we go through Arcade Physics.
   */
  private wirePointerInput(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      this.clickTarget = { x: world.x, y: world.y };
    });
  }

  /**
   * Step 13: capture WASD + arrow-key input. The raw key objects live on
   * the scene; update() reads their `.isDown` each frame into an
   * InputState and delegates to the pure resolvers in `input.ts`.
   */
  private wireKeyboardInput(): void {
    if (!this.input.keyboard) return;
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasdKeys = this.input.keyboard.addKeys('W,A,S,D') as {
      W: Phaser.Input.Keyboard.Key;
      A: Phaser.Input.Keyboard.Key;
      S: Phaser.Input.Keyboard.Key;
      D: Phaser.Input.Keyboard.Key;
    };
    // Spacebar → one-shot jump. addCapture prevents the browser from
    // page-scrolling when the canvas has focus.
    this.input.keyboard.addCapture('SPACE');
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
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

  /**
   * Step 12: instantiate the local-member avatar from the registry entry
   * GameWorld.tsx wrote before Phaser booted. Rectangle placeholder tinted
   * per AVATAR_COLORS, display-name text above, level badge below, Arcade
   * Physics body sized to the avatar's feet.
   */
  private createLocalAvatar(): void {
    const member = this.registry.get(MEMBER_REGISTRY_KEY) as SceneMember | undefined;

    if (!member || !isAvatarId(member.avatarId)) {
      // Without a member, the avatar cannot render. In practice this never
      // fires — the middleware avatar gate (Step 11) redirects to the
      // picker before /world is reachable. Logged rather than thrown so a
      // schema drift doesn't crash the whole scene.
      console.warn('WorldScene: no valid member in registry; skipping avatar.');
      return;
    }

    const spawnFrom = this.registry.get(SPAWN_FROM_REGISTRY_KEY) as BuildingName | undefined;
    const spawnTile = spawnFrom ? worldSpritesConfig.buildings[spawnFrom].exitTile : undefined;

    const avatar = new LocalAvatar(this, {
      avatarId: member.avatarId,
      displayName: member.displayName,
      spawnTile,
    });

    this.localAvatar = avatar;
    this.registerYSortable(avatar);

    // Step 15: physics collider between avatar body and the tilemap
    // `collision` layer (tiles marked colliding in create() via
    // setCollisionByExclusion([0])). World-bounds collision is already
    // enabled on the body in LocalAvatar's constructor.
    if (this.collisionLayer) {
      this.physics.add.collider(avatar.rect, this.collisionLayer);
    }

    // Step 17: overlap between avatar and each entrance zone. Fires
    // onBuildingEntry(name) when the avatar steps into a front-door tile.
    for (const [name, zone] of this.buildingZones) {
      this.physics.add.overlap(avatar.rect, zone, () => {
        this.onBuildingEntry(name);
      });
    }

    this.cameras.main.startFollow(
      avatar.rect,
      true,
      worldCameraConfig.followLerp,
      worldCameraConfig.followLerp,
    );
    this.cameras.main.setDeadzone(
      worldCameraConfig.deadzone.width,
      worldCameraConfig.deadzone.height,
    );
  }

  /**
   * Step 9: for each of the three buildings, draw a Rectangle at its
   * footprint (visual only — collision comes from the tilemap `collision`
   * layer per Step 15) and place an invisible entrance Zone at its front-door
   * tile. The Zone gets tagged with its building name for Step 17's overlap
   * callback, and a static physics body so Arcade overlap detection works.
   */
  private createBuildingPlaceholders(): void {
    for (const name of BUILDING_NAMES) {
      const cfg = worldSpritesConfig.buildings[name];

      const rect = this.add.rectangle(
        cfg.footprintRect.x + cfg.footprintRect.width / 2,
        cfg.footprintRect.y + cfg.footprintRect.height / 2,
        cfg.footprintRect.width,
        cfg.footprintRect.height,
        cfg.fillColor,
      );
      rect.setName(`building-${name}`);
      this.registerYSortable(rect);

      const entrancePx = tileCenterToPixel(cfg.entranceTile, WORLD_TILE_SIZE);
      const zone = this.add.zone(
        entrancePx.x,
        entrancePx.y,
        WORLD_TILE_SIZE.width,
        WORLD_TILE_SIZE.height,
      );
      zone.setName(`entrance-${name}`);
      zone.setData('buildingName', name);
      this.physics.add.existing(zone, true); // static body for Step 17 overlap
      this.buildingZones.set(name, zone);
    }
  }

  /**
   * Register an object to be y-sorted every frame. Called by Step 9 for
   * building placeholders and Step 12 for the local avatar.
   */
  public registerYSortable(obj: YSortableGameObject): void {
    this.ySortables.push(obj);
  }

  /**
   * Step 17: overlap callback. First entry per scene life starts the
   * fade-out → route-change sequence; subsequent overlaps are ignored
   * while `isTransitioning` is true so re-entering the zone during the
   * fade doesn't re-fire the navigation.
   */
  private onBuildingEntry(name: BuildingName): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    // Stop avatar motion so the fade-out isn't weirdly dynamic.
    this.localAvatar?.body.setVelocity(0, 0);
    if (this.localAvatar) {
      this.localAvatar.isMoving = false;
    }
    this.clickTarget = null;

    // Notify the server before the WS drops on navigation — gives Phase 4
    // analytics a clean ENTER_BUILDING signal. Server logs only in Phase 2.
    this.colyseus?.send(MSG.ENTER_BUILDING, { building: name });

    this.cameras.main.fadeOut(worldCameraConfig.fadeOutMs, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      const navigate = this.registry.get(NAVIGATE_REGISTRY_KEY) as NavigateFn | undefined;
      navigate?.(`/${name}`);
    });
  }

  /**
   * Phase 2 Step 6 — send MOVE at most every MOVE_INTERVAL_MS (20 Hz) and
   * only when any of (x, y, direction, isMoving) has changed since the
   * last outbound message. Skips cleanly when no connection is available
   * (test harness, disconnected state, etc.).
   */
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

  public override update(): void {
    if (this.localAvatar) {
      const input = this.readInputState();
      const kbd = resolveInputVelocity(input, worldSpritesConfig.avatar.walkSpeed);

      let vx = 0;
      let vy = 0;
      let moving = false;

      if (kbd.isMoving) {
        // Keyboard wins and cancels any pending click-target.
        this.clickTarget = null;
        vx = kbd.vx;
        vy = kbd.vy;
        moving = true;
      } else if (this.clickTarget) {
        // Click-to-move — velocity toward target until within threshold.
        // Direction inference here is ignored; velocity sign drives the
        // iso bucket below.
        const res = resolveClickTargetVelocity(
          { x: this.localAvatar.x, y: this.localAvatar.y },
          this.clickTarget,
          worldSpritesConfig.avatar.walkSpeed,
          worldSpritesConfig.avatar.clickArrivalThreshold,
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
      // transition, so holding space doesn't restart the jump mid-frame.
      if (
        this.spaceKey &&
        Phaser.Input.Keyboard.JustDown(this.spaceKey) &&
        !this.localAvatar.isJumping
      ) {
        this.localAvatar.triggerJump(this.localAvatar.direction);
      }

      // Walk when moving, idle when still — but don't stomp on the jump
      // one-shot; it clears `isJumping` on animationcomplete, after which
      // walk/idle resumes next frame.
      if (!this.localAvatar.isJumping) {
        this.localAvatar.playAnim(moving ? 'walk' : 'idle', this.localAvatar.direction);
      }

      this.localAvatar.syncAttachments();

      this.sendMoveIfChanged(this.time.now);
    }

    const depthBase = worldLayersConfig.depth.dynamic;
    const { yAnchorRatio } = worldLayersConfig.ySort;
    for (const obj of this.ySortables) {
      obj.setDepth(calculateYSortDepth(obj, { depthBase, yAnchorRatio }));
    }
  }
}
