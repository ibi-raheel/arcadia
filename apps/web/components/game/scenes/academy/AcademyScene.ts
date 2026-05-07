// Phase 3.5 academy scene. Member walks around a 1536×1024 interior and
// steps up to a central lectern — press ENTER to open the Scribe's
// Ledger (a React scroll modal listing enrolled courses). Single-player,
// no Colyseus.
//
// 2026-04-24 — replaced the floating-card "podiums" pattern with the
// lectern + scroll modal. The registry key for courses is preserved so
// the React mount still hands the course list in; the scene just stops
// drawing cards and instead pipes ENTER-on-lectern out to React for the
// scroll.
//
// ADR 0004: no hardcoded tweakable values. See *.config.ts siblings.

import * as Phaser from 'phaser';

import { BOOT_ASSETS } from '../boot/asset-manifest';
import { isAvatarId } from '../shared/avatar-palette';
import { spawnColliders } from '../shared/colliders';
import { addCrispText } from '../shared/crisp-text';
import { createEnterPromptManager, type EnterPromptManager } from '../shared/enter-prompt';
import { applyFillZoom } from '../shared/fill-zoom';
import { createJumpBinding, type JumpBinding } from '../shared/jump-binding';
import {
  createProximityPromptManager,
  type ProximityPromptManager,
} from '../shared/proximity-prompt';
import { NpcSwarm } from '../shared/npc-swarm';
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
import { academyCameraConfig } from './camera.config';
import { academyLayersConfig } from './layers.config';
import { academySpritesConfig } from './sprites.config';

export const ACADEMY_SCENE_KEY = 'AcademyScene' as const;

/** Shape of course data the page passes in via the registry. Now only
 *  used by the React ledger scroll; the scene itself doesn't render a
 *  card per course anymore. */
export type AcademyCoursePodium = {
  readonly id: string;
  readonly title: string;
  readonly completedLessons: number;
  readonly totalLessons: number;
};

export const ACADEMY_COURSES_REGISTRY_KEY = 'academy-courses';

/** Fired when the member is at the lectern and presses ENTER. Carries no
 *  payload — the React mount already has the course list. */
export const ACADEMY_OPEN_LEDGER_EVENT = 'academy:open-ledger';

type YSortableGameObject = YSortable & { setDepth: (depth: number) => unknown };

export class AcademyScene extends Phaser.Scene {
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
  private clickTarget: { x: number; y: number } | null = null;
  private jumpBinding?: JumpBinding;
  private enterKey?: Phaser.Input.Keyboard.Key;
  private enterPrompt?: EnterPromptManager;
  private ledgerPrompt?: ProximityPromptManager;

  constructor() {
    super({ key: ACADEMY_SCENE_KEY });
  }

  create(): void {
    const bg = this.add.image(0, 0, BOOT_ASSETS.academyInterior.key);
    bg.setOrigin(0, 0);
    bg.setDepth(academyLayersConfig.depth.ground);

    const { bounds, zoom, fadeInMs } = academyCameraConfig;
    this.cameras.main.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);
    applyFillZoom(this, bounds.width, bounds.height, zoom);
    this.scale.on('resize', () => applyFillZoom(this, bounds.width, bounds.height, zoom));
    this.physics.world.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);
    this.cameras.main.fadeIn(fadeInMs, 0, 0, 0);

    registerAvatarAnimations(this);
    this.createLocalAvatar();
    this.wireKeyboardInput();
    this.wirePointerInput();

    this.renderLectern();

    // Demo NPCs — three folk wandering the lecture hall at the
    // local avatar's walk speed.
    this.npcSwarm = new NpcSwarm(this, {
      count: 3,
      bounds: { minX: 200, minY: 200, maxX: bounds.width - 200, maxY: bounds.height - 200 },
      size: academySpritesConfig.avatar.size,
      speed: academySpritesConfig.avatar.walkSpeed,
    });

    // ENTER-gated exit at the bottom-centre archway (Phase 7 item AC10).
    this.enterPrompt = createEnterPromptManager(this, [academyLayersConfig.exitArchway]);
  }

  private createLocalAvatar(): void {
    const member = this.registry.get(MEMBER_REGISTRY_KEY) as SceneMember | undefined;
    if (!member || !isAvatarId(member.avatarId)) {
      console.warn('AcademyScene: no valid member in registry; skipping avatar.');
      return;
    }
    const avatar = new LocalAvatar(this, {
      memberId: member.memberId,
      avatarId: member.avatarId,
      displayName: member.displayName,
      spawnPixel: academySpritesConfig.avatar.spawnPixel,
      size: academySpritesConfig.avatar.size,
      bodyOffset: academySpritesConfig.avatar.bodyOffset,
    });
    this.localAvatar = avatar;
    this.ySortables.push(avatar);
    this.cameras.main.startFollow(avatar.rect, true, 0.12, 0.12);
    this.cameras.main.setDeadzone(
      academyCameraConfig.deadzone.width,
      academyCameraConfig.deadzone.height,
    );

    if (academyLayersConfig.colliders.length > 0) {
      const group = spawnColliders(this, academyLayersConfig.colliders);
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
   * Draws a floating red-bound book at the centre of the hall with a
   * soft gilt halo behind it. No pedestal, no caption — the pedestal
   * read as a "folder" in 2026-04-24 review. Proximity prompt is the
   * only affordance telling the member the book is interactable.
   */
  private renderLectern(): void {
    const cfg = academySpritesConfig.lectern;
    const depthBase = academyLayersConfig.depth.podiums;

    // Soft warm halo so the book reads as "there's something here".
    const halo = this.add.graphics();
    halo.fillStyle(0xffb23a, 0.14);
    halo.fillCircle(cfg.centerX, cfg.centerY, 120);
    halo.setDepth(depthBase - 1);

    // Book — a wedge of three rectangles stacked to look like a closed
    // tome with gilt edging. Floats at the lectern centre.
    const bookBody = this.add
      .rectangle(cfg.centerX, cfg.centerY, 110, 38, 0x8f2530)
      .setStrokeStyle(1, 0x5a1620, 1);
    bookBody.setDepth(depthBase + 1);

    const bookSpine = this.add
      .rectangle(cfg.centerX, cfg.centerY, 110, 6, 0xc9a863)
      .setStrokeStyle(1, 0x8a6a3a, 1);
    bookSpine.setDepth(depthBase + 2);

    const bookPages = this.add
      .rectangle(cfg.centerX, cfg.centerY - 8, 104, 6, 0xe8d5a5)
      .setStrokeStyle(1, 0x8a6a3a, 1);
    bookPages.setDepth(depthBase + 2);

    // Gilt sigil on the cover.
    const sigil = addCrispText(this, cfg.centerX, cfg.centerY, '✦', {
      fontFamily: '"Georgia", "Cambria", "Times New Roman", serif',
      fontSize: '22px',
      color: '#d4a868',
      stroke: '#1c1917',
      strokeThickness: 3,
    }).setOrigin(0.5, 0.5);
    sigil.setDepth(depthBase + 3);

    // Float the book + sigil on a slow sine bob.
    this.tweens.add({
      targets: [bookBody, bookSpine, bookPages, sigil],
      y: '+=8',
      duration: 2400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });

    // Breathe the halo with a slow alpha pulse.
    this.tweens.add({
      targets: halo,
      alpha: { from: 0.6, to: 1 },
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });

    this.ledgerPrompt = createProximityPromptManager(
      this,
      {
        centerX: cfg.centerX,
        centerY: cfg.centerY,
        radius: cfg.interactRadius,
        label: "Press ENTER to open the Scribe's Ledger",
      },
      () => {
        this.game.events.emit(ACADEMY_OPEN_LEDGER_EVENT);
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

  public override update(time: number, deltaMs: number): void {
    this.npcSwarm?.update(time, deltaMs);

    if (!this.localAvatar) return;

    this.jumpBinding?.tryJump(this.localAvatar);

    const enterJustDown = this.enterKey ? Phaser.Input.Keyboard.JustDown(this.enterKey) : false;
    // The ledger prompt runs before the archway prompt so a single ENTER
    // press is consumed by the nearer interactable.
    const ledgerFired =
      this.ledgerPrompt?.update(this.localAvatar.x, this.localAvatar.y, enterJustDown) ?? false;
    this.enterPrompt?.update(
      this.localAvatar.x,
      this.localAvatar.y,
      ledgerFired ? false : enterJustDown,
    );

    const input = this.readInputState();
    const kbd = resolveInputVelocity(input, academySpritesConfig.avatar.walkSpeed);

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
        academySpritesConfig.avatar.walkSpeed,
        academySpritesConfig.avatar.clickArrivalThreshold,
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

    const depthBase = academyLayersConfig.depth.dynamic;
    const { yAnchorRatio } = academyLayersConfig.ySort;
    for (const obj of this.ySortables) {
      obj.setDepth(calculateYSortDepth(obj, { depthBase, yAnchorRatio }));
    }
  }
}
