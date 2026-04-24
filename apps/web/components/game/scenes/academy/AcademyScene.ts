// Phase 3.5 academy scene. Member walks around a 1536×1024 interior and
// clicks a "course podium" to open the course viewer. Single-player —
// no Colyseus, no remote avatars. Mirrors TavernScene's image-backed
// scene shape (bg image, local avatar, screen-space WASD/arrows/click).
//
// ADR 0004: no hardcoded tweakable values. See *.config.ts siblings.

import * as Phaser from 'phaser';

import { BOOT_ASSETS } from '../boot/asset-manifest';
import { isAvatarId } from '../shared/avatar-palette';
import { spawnColliders } from '../shared/colliders';
import { addCrispText } from '../shared/crisp-text';
import {
  createEnterPromptManager,
  type EnterPromptManager,
} from '../shared/enter-prompt';
import { applyFillZoom } from '../shared/fill-zoom';
import { createJumpBinding, type JumpBinding } from '../shared/jump-binding';
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

/**
 * Shape of course data the page passes in via the registry. Each podium
 * maps one-to-one with a row here.
 */
export type AcademyCoursePodium = {
  readonly id: string;
  readonly title: string;
  readonly completedLessons: number;
  readonly totalLessons: number;
};

export const ACADEMY_COURSES_REGISTRY_KEY = 'academy-courses';
export const ACADEMY_NAVIGATE_EVENT = 'academy:navigate';

type YSortableGameObject = YSortable & { setDepth: (depth: number) => unknown };

export class AcademyScene extends Phaser.Scene {
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
  private enterPrompt?: EnterPromptManager;

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

    this.renderPodiums();

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
        // Don't click-to-move when the click landed on an interactive podium.
        if (currentlyOver.length > 0) return;
        const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        this.clickTarget = { x: world.x, y: world.y };
      },
    );
  }

  /**
   * Draws one podium per course supplied via the registry. Each podium is
   * a clickable Rectangle + title label + progress text. Click fires the
   * game-level navigation event; GameAcademy picks it up and routes.
   */
  private renderPodiums(): void {
    const courses =
      (this.registry.get(ACADEMY_COURSES_REGISTRY_KEY) as
        | readonly AcademyCoursePodium[]
        | undefined) ?? [];
    if (courses.length === 0) return;

    const cfg = academySpritesConfig.podium;
    const { width: canvasW } = academyCameraConfig.bounds;

    courses.forEach((course, index) => {
      const row = Math.floor(index / cfg.maxPerRow);
      const colsThisRow = Math.min(cfg.maxPerRow, courses.length - row * cfg.maxPerRow);
      const col = index % cfg.maxPerRow;
      const rowWidth = (colsThisRow - 1) * cfg.spacingX;
      const x = canvasW / 2 - rowWidth / 2 + col * cfg.spacingX;
      const y = cfg.firstRowCenterY + row * cfg.spacingY;

      const rect = this.add
        .rectangle(x, y, cfg.size.width, cfg.size.height, 0x1a1f2a, 0.85)
        .setStrokeStyle(2, 0x34d399, 0.9);
      rect.setDepth(academyLayersConfig.depth.podiums);
      rect.setInteractive({ useHandCursor: true });

      const label = addCrispText(this, x, y + cfg.labelOffsetY, course.title, {
        fontFamily: '"Georgia", "Cambria", "Times New Roman", serif',
        fontSize: '17px',
        fontStyle: 'bold',
        color: '#fef3c7',
        stroke: '#1c1917',
        strokeThickness: 4,
        align: 'center',
        wordWrap: { width: cfg.size.width + 80 },
      }).setOrigin(0.5, 1);
      label.setDepth(academyLayersConfig.depth.podiums + 1);

      const progressText =
        course.totalLessons > 0
          ? `${course.completedLessons}/${course.totalLessons} · ${Math.round((course.completedLessons / course.totalLessons) * 100)}%`
          : 'No lessons yet';
      const progress = addCrispText(this, x, y + cfg.progressOffsetY, progressText, {
        fontFamily: '"Georgia", "Cambria", "Times New Roman", serif',
        fontSize: '13px',
        color: '#a7f3d0',
        stroke: '#1c1917',
        strokeThickness: 3,
        align: 'center',
      }).setOrigin(0.5, 0);
      progress.setDepth(academyLayersConfig.depth.podiums + 1);

      rect.on('pointerover', () => rect.setFillStyle(0x0f172a, 1));
      rect.on('pointerout', () => rect.setFillStyle(0x1a1f2a, 0.85));
      rect.on('pointerup', () => {
        this.game.events.emit(ACADEMY_NAVIGATE_EVENT, course.id);
      });
    });
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

  public override update(_time: number, _deltaMs: number): void {
    if (!this.localAvatar) return;

    this.jumpBinding?.tryJump(this.localAvatar);

    const enterJustDown = this.enterKey
      ? Phaser.Input.Keyboard.JustDown(this.enterKey)
      : false;
    this.enterPrompt?.update(this.localAvatar.x, this.localAvatar.y, enterJustDown);

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
