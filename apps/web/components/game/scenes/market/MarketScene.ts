// Phase 4 market scene. Member walks a 1536×1024 interior and clicks a
// course "stall" to open the React stall-view modal. Single-player —
// no Colyseus. Mirrors AcademyScene's image-backed shape; stalls store
// their course id in getData('courseId') so the React HUD can also toggle
// visibility by id (search filtering).
//
// ADR 0004: no hardcoded tweakable values. See *.config.ts siblings.

import * as Phaser from 'phaser';

import { BOOT_ASSETS } from '../boot/asset-manifest';
import { isAvatarId } from '../shared/avatar-palette';
import { spawnColliders } from '../shared/colliders';
import { createEdgeTriggerManager, type EdgeTriggerManager } from '../shared/edge-triggers';
import { calculateYSortDepth, type YSortable } from '../shared/y-sort';
import { registerAvatarAnimations } from '../world/avatar-animations';
import {
  resolveClickTargetVelocity,
  resolveInputVelocity,
  velocityToFacingDirection,
  type InputState,
} from '../world/input';
import { LocalAvatar } from '../world/local-avatar';
import { MEMBER_REGISTRY_KEY, type SceneMember } from '../world/WorldScene';
import { marketCameraConfig } from './camera.config';
import { marketLayersConfig } from './layers.config';
import { marketSpritesConfig } from './sprites.config';

export const MARKET_SCENE_KEY = 'MarketScene' as const;

const POSITION_LS_PREFIX = 'arcadia:market:avatar-pos:';
const POSITION_SAVE_INTERVAL_MS = 500;

type SavedPosition = { readonly x: number; readonly y: number };

function loadSavedPosition(memberId: string): SavedPosition | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(POSITION_LS_PREFIX + memberId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedPosition>;
    if (typeof parsed.x !== 'number' || typeof parsed.y !== 'number') return null;
    return { x: parsed.x, y: parsed.y };
  } catch {
    return null;
  }
}

function saveSavedPosition(memberId: string, pos: SavedPosition): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(POSITION_LS_PREFIX + memberId, JSON.stringify(pos));
  } catch {
    // Quota exceeded or storage disabled — silently skip.
  }
}

/**
 * Shape of stall data the page passes in via the registry. One stall
 * rendered per entry.
 */
export type MarketStall = {
  readonly id: string;
  readonly title: string;
  readonly creatorName: string;
  readonly lessonCount: number;
  readonly enrolmentCount: number;
  readonly enrolled: boolean;
};

export const MARKET_STALLS_REGISTRY_KEY = 'market-stalls';
export const MARKET_OPEN_STALL_EVENT = 'market:open-stall';
/** React HUD → scene. Payload: string (search term, lowercased). */
export const MARKET_FILTER_EVENT = 'market:filter';

type YSortableGameObject = YSortable & { setDepth: (depth: number) => unknown };

type StallVisuals = {
  readonly courseId: string;
  readonly title: string;
  readonly rect: Phaser.GameObjects.Rectangle;
  readonly objects: Phaser.GameObjects.GameObject[];
  haystack: string;
};

export class MarketScene extends Phaser.Scene {
  private readonly ySortables: YSortableGameObject[] = [];
  private readonly stalls: StallVisuals[] = [];
  private localAvatar?: LocalAvatar;

  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys?: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private clickTarget: { x: number; y: number } | null = null;

  private memberId: string | null = null;
  private lastPositionSaveAt = 0;
  private edgeTriggers?: EdgeTriggerManager;

  constructor() {
    super({ key: MARKET_SCENE_KEY });
  }

  create(): void {
    const bg = this.add.image(0, 0, BOOT_ASSETS.marketInterior.key);
    bg.setOrigin(0, 0);
    bg.setDepth(marketLayersConfig.depth.ground);

    const { bounds, zoom, fadeInMs } = marketCameraConfig;
    this.cameras.main.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);
    this.cameras.main.setZoom(zoom);
    this.physics.world.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);
    this.cameras.main.fadeIn(fadeInMs, 0, 0, 0);

    registerAvatarAnimations(this);
    this.createLocalAvatar();
    this.wireKeyboardInput();
    this.wirePointerInput();

    this.renderStalls();

    // Walk off the top edge to return to /world (2026-04-22 — replaces
    // the browser back button as the exit affordance).
    this.edgeTriggers = createEdgeTriggerManager(
      this,
      bounds.width,
      bounds.height,
      marketLayersConfig.returnEdge,
    );

    // HUD search → hide non-matching stalls.
    this.game.events.on(MARKET_FILTER_EVENT, this.applyFilter, this);
    const onShutdown = (): void => {
      this.game.events.off(MARKET_FILTER_EVENT, this.applyFilter, this);
      this.edgeTriggers?.destroy();
      this.edgeTriggers = undefined;
      if (this.memberId != null && this.localAvatar) {
        saveSavedPosition(this.memberId, {
          x: this.localAvatar.x,
          y: this.localAvatar.y,
        });
      }
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, onShutdown);
    this.events.once(Phaser.Scenes.Events.DESTROY, onShutdown);
  }

  private createLocalAvatar(): void {
    const member = this.registry.get(MEMBER_REGISTRY_KEY) as SceneMember | undefined;
    if (!member || !isAvatarId(member.avatarId)) {
      console.warn('MarketScene: no valid member in registry; skipping avatar.');
      return;
    }
    this.memberId = member.memberId;
    // Prefer last-known position from localStorage so reloads don't yank
    // the member back to spawn. Clamp inside world bounds just in case
    // the image size has changed since the last save.
    const saved = loadSavedPosition(member.memberId);
    const defaults = marketSpritesConfig.avatar.spawnPixel;
    const bounds = marketCameraConfig.bounds;
    const spawnPixel = saved
      ? {
          x: Math.min(Math.max(saved.x, 0), bounds.width),
          y: Math.min(Math.max(saved.y, 0), bounds.height),
        }
      : defaults;

    const avatar = new LocalAvatar(this, {
      memberId: member.memberId,
      avatarId: member.avatarId,
      displayName: member.displayName,
      spawnPixel,
      size: marketSpritesConfig.avatar.size,
      bodyOffset: marketSpritesConfig.avatar.bodyOffset,
    });
    this.localAvatar = avatar;
    this.ySortables.push(avatar);
    this.cameras.main.startFollow(avatar.rect, true, 0.12, 0.12);
    this.cameras.main.setDeadzone(
      marketCameraConfig.deadzone.width,
      marketCameraConfig.deadzone.height,
    );

    // Static colliders scaffold — no-op when the config's array is
    // empty. User fills in layers.config.ts → MARKET_COLLIDERS with
    // rectangles to block the avatar without any code change.
    if (marketLayersConfig.colliders.length > 0) {
      const group = spawnColliders(this, marketLayersConfig.colliders);
      this.physics.add.collider(avatar.body, group);
    }
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

  private renderStalls(): void {
    const stalls =
      (this.registry.get(MARKET_STALLS_REGISTRY_KEY) as readonly MarketStall[] | undefined) ?? [];
    if (stalls.length === 0) return;

    const cfg = marketSpritesConfig.stall;
    const { width: canvasW } = marketCameraConfig.bounds;

    stalls.forEach((stall, index) => {
      const row = Math.floor(index / cfg.maxPerRow);
      const colsThisRow = Math.min(cfg.maxPerRow, stalls.length - row * cfg.maxPerRow);
      const col = index % cfg.maxPerRow;
      const rowWidth = (colsThisRow - 1) * cfg.spacingX;
      const x = canvasW / 2 - rowWidth / 2 + col * cfg.spacingX;
      const y = cfg.firstRowCenterY + row * cfg.spacingY;

      const fillColor = stall.enrolled ? 0x064e3b : 0x1a1f2a;
      const rect = this.add
        .rectangle(x, y, cfg.size.width, cfg.size.height, fillColor, 0.85)
        .setStrokeStyle(2, stall.enrolled ? 0x34d399 : 0xa855f7, 0.9);
      rect.setDepth(marketLayersConfig.depth.stalls);
      rect.setInteractive({ useHandCursor: true });
      rect.setData('courseId', stall.id);

      const title = this.add
        .text(x, y + cfg.labelOffsetY, stall.title, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '16px',
          color: '#f1f5f9',
          stroke: '#0f172a',
          strokeThickness: 4,
          align: 'center',
          wordWrap: { width: cfg.size.width + 80 },
        })
        .setOrigin(0.5, 1);
      title.setDepth(marketLayersConfig.depth.stalls + 1);

      const creator = this.add
        .text(x, y + cfg.creatorOffsetY, `by ${stall.creatorName}`, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '11px',
          color: '#cbd5e1',
          stroke: '#0f172a',
          strokeThickness: 3,
          align: 'center',
        })
        .setOrigin(0.5, 0);
      creator.setDepth(marketLayersConfig.depth.stalls + 1);

      const footerText = stall.enrolled
        ? `${stall.lessonCount} lessons · Enrolled`
        : `${stall.lessonCount} lessons · ${stall.enrolmentCount} enrolled`;
      const footer = this.add
        .text(x, y + cfg.priceOffsetY, footerText, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '12px',
          color: stall.enrolled ? '#a7f3d0' : '#e9d5ff',
          stroke: '#0f172a',
          strokeThickness: 3,
          align: 'center',
        })
        .setOrigin(0.5, 0);
      footer.setDepth(marketLayersConfig.depth.stalls + 1);

      rect.on('pointerover', () => rect.setFillStyle(0x0f172a, 1));
      rect.on('pointerout', () => rect.setFillStyle(fillColor, 0.85));
      rect.on('pointerup', () => {
        this.game.events.emit(MARKET_OPEN_STALL_EVENT, stall.id);
      });

      this.stalls.push({
        courseId: stall.id,
        title: stall.title,
        rect,
        objects: [rect, title, creator, footer],
        haystack: `${stall.title} ${stall.creatorName}`.toLowerCase(),
      });
    });
  }

  private applyFilter(search: string): void {
    const needle = search.trim().toLowerCase();
    for (const s of this.stalls) {
      const visible = needle.length === 0 || s.haystack.includes(needle);
      for (const obj of s.objects) {
        // GameObject base type doesn't declare setVisible, but every
        // concrete object we construct here (Rectangle, Text) implements
        // the Visible component.
        const v = obj as unknown as Phaser.GameObjects.Components.Visible;
        v.setVisible(visible);
      }
    }
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

  public override update(time: number, _deltaMs: number): void {
    if (!this.localAvatar) return;

    const input = this.readInputState();
    const kbd = resolveInputVelocity(input, marketSpritesConfig.avatar.walkSpeed);

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
        marketSpritesConfig.avatar.walkSpeed,
        marketSpritesConfig.avatar.clickArrivalThreshold,
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

    const depthBase = marketLayersConfig.depth.dynamic;
    const { yAnchorRatio } = marketLayersConfig.ySort;
    for (const obj of this.ySortables) {
      obj.setDepth(calculateYSortDepth(obj, { depthBase, yAnchorRatio }));
    }

    this.edgeTriggers?.update(this.localAvatar.x, this.localAvatar.y);

    // Persist position to localStorage every POSITION_SAVE_INTERVAL_MS
    // so page reloads pick up where the member left off. Skipped when
    // the avatar isn't actually moving — no point burning IO for nothing.
    if (
      this.memberId != null &&
      moving &&
      time - this.lastPositionSaveAt >= POSITION_SAVE_INTERVAL_MS
    ) {
      saveSavedPosition(this.memberId, { x: this.localAvatar.x, y: this.localAvatar.y });
      this.lastPositionSaveAt = time;
    }
  }
}
