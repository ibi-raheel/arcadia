// Phase 4 market scene. Member walks a 1536×1024 interior and steps up
// to a central crystal — press ENTER to open the catalog scroll (a React
// modal listing every published stall in the realm). Clicking a stall
// inside the scroll opens the existing StallView modal via ?course=<id>.
// Single-player; no Colyseus.
//
// 2026-04-24 — replaced the floating stall-card pattern (rendered as
// Phaser Rectangle + Text objects per-course) with a single centre-of-
// room crystal + scroll modal. The old HUD search input and
// `MARKET_FILTER_EVENT` were already removed upstream; the scene no
// longer needs per-stall geometry or filter state.
//
// ADR 0004: no hardcoded tweakable values. See *.config.ts siblings.

import * as Phaser from 'phaser';

import { BOOT_ASSETS } from '../boot/asset-manifest';
import { isAvatarId } from '../shared/avatar-palette';
import { spawnColliders } from '../shared/colliders';
import { addCrispText } from '../shared/crisp-text';
import { createEdgeTriggerManager, type EdgeTriggerManager } from '../shared/edge-triggers';
import { applyFillZoom } from '../shared/fill-zoom';
import { createJumpBinding, type JumpBinding } from '../shared/jump-binding';
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
 * Shape of stall data the page passes in via the registry. One entry
 * per published course in the realm; the scene doesn't render a sprite
 * per-stall anymore, but the list is forwarded to React so the catalog
 * scroll can render it.
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
export const MARKET_OPEN_CATALOG_EVENT = 'market:open-catalog';

type YSortableGameObject = YSortable & { setDepth: (depth: number) => unknown };

export class MarketScene extends Phaser.Scene {
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
  private jumpBinding?: JumpBinding;
  private enterKey?: Phaser.Input.Keyboard.Key;

  private memberId: string | null = null;
  private lastPositionSaveAt = 0;
  private edgeTriggers?: EdgeTriggerManager;
  private catalogPrompt?: ProximityPromptManager;

  constructor() {
    super({ key: MARKET_SCENE_KEY });
  }

  create(): void {
    const bg = this.add.image(0, 0, BOOT_ASSETS.marketInterior.key);
    bg.setOrigin(0, 0);
    bg.setDepth(marketLayersConfig.depth.ground);

    const { bounds, zoom, fadeInMs } = marketCameraConfig;
    this.cameras.main.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);
    applyFillZoom(this, bounds.width, bounds.height, zoom);
    this.scale.on('resize', () => applyFillZoom(this, bounds.width, bounds.height, zoom));
    this.physics.world.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);
    this.cameras.main.fadeIn(fadeInMs, 0, 0, 0);

    registerAvatarAnimations(this);
    this.createLocalAvatar();
    this.wireKeyboardInput();
    this.wirePointerInput();

    this.renderCrystal();

    // Walk off the top edge to return to /world (2026-04-22).
    this.edgeTriggers = createEdgeTriggerManager(
      this,
      bounds.width,
      bounds.height,
      marketLayersConfig.returnEdge,
    );

    const onShutdown = (): void => {
      this.edgeTriggers?.destroy();
      this.edgeTriggers = undefined;
      this.catalogPrompt?.destroy();
      this.catalogPrompt = undefined;
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
    const saved = loadSavedPosition(member.memberId);
    const defaults = marketSpritesConfig.avatar.spawnPixel;
    const bounds = marketCameraConfig.bounds;
    const TOP_EXIT_SAFETY_Y = 400;
    const useSaved = saved && saved.y >= TOP_EXIT_SAFETY_Y;
    const spawnPixel = useSaved
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
    this.jumpBinding = createJumpBinding(this);
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

  /**
   * Draws a centre-of-room pedestal with a floating blue crystal and a
   * soft glow. Walking close triggers the "Press ENTER to browse the
   * catalog" prompt; ENTER pops the React catalog scroll.
   */
  private renderCrystal(): void {
    const cfg = marketSpritesConfig.crystal;
    const depthBase = marketLayersConfig.depth.stalls;

    // Blue halo behind the crystal.
    const halo = this.add.graphics();
    halo.fillStyle(0x6aa3d4, 0.14);
    halo.fillCircle(cfg.centerX, cfg.centerY - 10, 150);
    halo.setDepth(depthBase - 1);

    // Stone pedestal — two stacked rectangles.
    const pedestalBase = this.add
      .rectangle(cfg.centerX, cfg.centerY + 48, cfg.pedestalWidth, 60, 0x3b3a44)
      .setStrokeStyle(2, 0x1c1917, 1);
    pedestalBase.setDepth(depthBase);

    const pedestalTop = this.add
      .rectangle(cfg.centerX, cfg.centerY + 14, cfg.pedestalWidth + 20, 16, 0x5a5968)
      .setStrokeStyle(2, 0x1c1917, 1);
    pedestalTop.setDepth(depthBase);

    // Crystal — an octagonal blue polygon, floating a few pixels above
    // the pedestal top.
    const cx = cfg.centerX;
    const cy = cfg.centerY - 32;
    const r = 28;
    const crystalPoints: number[] = [
      cx,
      cy - r, // top
      cx + r * 0.7,
      cy - r * 0.4,
      cx + r * 0.9,
      cy + r * 0.2,
      cx + r * 0.5,
      cy + r * 0.8,
      cx,
      cy + r, // bottom
      cx - r * 0.5,
      cy + r * 0.8,
      cx - r * 0.9,
      cy + r * 0.2,
      cx - r * 0.7,
      cy - r * 0.4,
    ];
    const crystal = this.add.polygon(0, 0, crystalPoints, 0x5b8fc7, 0.82);
    crystal.setOrigin(0, 0);
    crystal.setStrokeStyle(1.5, 0x9cc3e8, 1);
    crystal.setDepth(depthBase + 2);

    // Highlight — smaller inner polygon with a brighter blue.
    const highlight = this.add.polygon(
      0,
      0,
      [
        cx - 6,
        cy - 18,
        cx + 2,
        cy - 16,
        cx + 6,
        cy - 6,
        cx + 2,
        cy,
        cx - 6,
        cy - 2,
        cx - 10,
        cy - 12,
      ],
      0xcfe2f8,
      0.55,
    );
    highlight.setOrigin(0, 0);
    highlight.setDepth(depthBase + 3);

    // Caption below the pedestal.
    const caption = addCrispText(this, cfg.centerX, cfg.centerY + 92, 'The Market Catalog', {
      fontFamily: '"Georgia", "Cambria", "Times New Roman", serif',
      fontSize: '15px',
      fontStyle: 'italic',
      color: '#fef3c7',
      stroke: '#1c1917',
      strokeThickness: 3,
    }).setOrigin(0.5, 0);
    caption.setDepth(depthBase + 1);

    // Crystal float + halo pulse so the pedestal reads as interactable.
    this.tweens.add({
      targets: [crystal, highlight],
      y: { from: -6, to: 6 },
      duration: 2400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
    this.tweens.add({
      targets: halo,
      alpha: { from: 0.55, to: 1 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });

    this.catalogPrompt = createProximityPromptManager(
      this,
      {
        centerX: cfg.centerX,
        centerY: cfg.centerY,
        radius: cfg.interactRadius,
        label: 'Press ENTER to browse the catalog',
      },
      () => {
        this.game.events.emit(MARKET_OPEN_CATALOG_EVENT);
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

  public override update(time: number, _deltaMs: number): void {
    if (!this.localAvatar) return;

    this.jumpBinding?.tryJump(this.localAvatar);

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

    const enterJustDown = this.enterKey ? Phaser.Input.Keyboard.JustDown(this.enterKey) : false;
    const catalogFired =
      this.catalogPrompt?.update(this.localAvatar.x, this.localAvatar.y, enterJustDown) ?? false;
    this.edgeTriggers?.update(
      this.localAvatar.x,
      this.localAvatar.y,
      catalogFired ? false : enterJustDown,
    );

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
