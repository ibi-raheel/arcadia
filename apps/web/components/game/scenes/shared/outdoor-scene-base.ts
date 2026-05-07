// Shared base class for single-player outdoor image-backed scenes
// (academy-outside / tavern-outside / coworking-outside). Each concrete
// subclass provides:
//   - the Phaser scene key
//   - an OutdoorSceneConfig bundle (image + camera + sprites + triggers)
//
// The base class owns all runtime behaviour: image render, LocalAvatar,
// keyboard + click input, y-sort, SPACE coordination between jump and the
// enter-prompt helper, and the single walk-onto return-edge trigger.
//
// ADR 0004: concrete subclasses do NOT hardcode tweakable values — they
// import from sibling *.config.ts modules and pass them into the config.

import type { AvatarBodyOffset } from '../world/local-avatar';
import * as Phaser from 'phaser';

import { isAvatarId } from './avatar-palette';
import { spawnColliders } from './colliders';
import { applyFillZoom } from './fill-zoom';
import {
  createEdgeTriggerManager,
  type EdgeTriggerManager,
  type EdgeTriggers,
} from './edge-triggers';
import {
  createEnterPromptManager,
  type EnterPromptManager,
  type EntryTrigger,
} from './enter-prompt';
import { NpcSwarm } from './npc-swarm';
import type { PixelRect } from './types';
import { calculateYSortDepth, type YSortable } from './y-sort';
import { registerAvatarAnimations } from '../world/avatar-animations';
import {
  resolveClickTargetVelocity,
  resolveInputVelocity,
  velocityToFacingDirection,
  type InputState,
} from '../world/input';
import { LocalAvatar } from '../world/local-avatar';
import { MEMBER_REGISTRY_KEY, type SceneMember } from '../world/WorldScene';

type YSortableGameObject = YSortable & { setDepth: (depth: number) => unknown };

/**
 * Optional registry key the page mount writes to override the outdoor
 * scene's default spawn position. Tavern-outside uses this with a
 * `?from=<buildingId>` URL param so leaving a tavern drops the member
 * back at that specific tavern's door.
 */
export const OUTDOOR_SPAWN_OVERRIDE_REGISTRY_KEY = 'outdoor-spawn-override';

export type OutdoorSceneConfig = {
  /** BOOT_ASSETS.<key>.key — the Phaser texture key for the background image. */
  readonly imageKey: string;
  readonly bounds: { readonly width: number; readonly height: number };
  readonly camera: {
    readonly zoom: number;
    readonly followLerp: number;
    readonly deadzone: { readonly width: number; readonly height: number };
    readonly fadeInMs: number;
  };
  readonly avatar: {
    readonly spawnPixel: { readonly x: number; readonly y: number };
    readonly size: { readonly width: number; readonly height: number };
    readonly bodyOffset: AvatarBodyOffset;
    readonly walkSpeed: number;
    readonly clickArrivalThreshold: number;
  };
  readonly depth: {
    readonly ground: number;
    readonly dynamic: number;
  };
  readonly ySort: { readonly yAnchorRatio: number };
  readonly colliders: readonly PixelRect[];
  readonly entryTriggers: readonly EntryTrigger[];
  /** Single walk-onto edge back to /world. */
  readonly returnEdge: EdgeTriggers;
};

export abstract class OutdoorSceneBase extends Phaser.Scene {
  protected abstract readonly sceneConfig: OutdoorSceneConfig;

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

  private enterPrompt?: EnterPromptManager;
  private edgeTriggers?: EdgeTriggerManager;

  create(): void {
    const cfg = this.sceneConfig;

    const bg = this.add.image(0, 0, cfg.imageKey);
    bg.setOrigin(0, 0);
    bg.setDepth(cfg.depth.ground);

    this.cameras.main.setBounds(0, 0, cfg.bounds.width, cfg.bounds.height);
    // Fill-zoom: match the interior-scene pattern so every outdoor island
    // resizes to the browser viewport instead of showing black bars on
    // large displays. Re-fits on window resize. Design zoom is preserved
    // as a floor for small viewports.
    applyFillZoom(this, cfg.bounds.width, cfg.bounds.height, cfg.camera.zoom);
    this.scale.on('resize', () =>
      applyFillZoom(this, cfg.bounds.width, cfg.bounds.height, cfg.camera.zoom),
    );
    this.physics.world.setBounds(0, 0, cfg.bounds.width, cfg.bounds.height);
    this.cameras.main.fadeIn(cfg.camera.fadeInMs, 0, 0, 0);

    registerAvatarAnimations(this);
    this.createLocalAvatar();
    this.wireKeyboardInput();
    this.wirePointerInput();

    // Demo NPCs — three folk wandering this outdoor area. All three
    // outdoor scenes (academy / tavern / coworking outside) inherit
    // this; bounds + size come from their `cfg.bounds` + `cfg.avatar.size`.
    this.npcSwarm = new NpcSwarm(this, {
      count: 3,
      bounds: {
        minX: 320,
        minY: 320,
        maxX: cfg.bounds.width - 320,
        maxY: cfg.bounds.height - 320,
      },
      size: cfg.avatar.size,
      speed: 100,
    });

    this.enterPrompt = createEnterPromptManager(this, cfg.entryTriggers);
    this.edgeTriggers = createEdgeTriggerManager(
      this,
      cfg.bounds.width,
      cfg.bounds.height,
      cfg.returnEdge,
    );

    const teardown = (): void => {
      this.enterPrompt?.destroy();
      this.edgeTriggers?.destroy();
      this.enterPrompt = undefined;
      this.edgeTriggers = undefined;
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, teardown);
    this.events.once(Phaser.Scenes.Events.DESTROY, teardown);
  }

  private createLocalAvatar(): void {
    const cfg = this.sceneConfig;
    const member = this.registry.get(MEMBER_REGISTRY_KEY) as SceneMember | undefined;
    if (!member || !isAvatarId(member.avatarId)) {
      console.warn(`${this.scene.key}: no valid member in registry; skipping avatar.`);
      return;
    }

    const spawnOverride = this.registry.get(OUTDOOR_SPAWN_OVERRIDE_REGISTRY_KEY) as
      | { readonly x: number; readonly y: number }
      | undefined;

    const avatar = new LocalAvatar(this, {
      memberId: member.memberId,
      avatarId: member.avatarId,
      displayName: member.displayName,
      spawnPixel: spawnOverride ?? cfg.avatar.spawnPixel,
      size: cfg.avatar.size,
      bodyOffset: cfg.avatar.bodyOffset,
    });
    this.localAvatar = avatar;
    this.ySortables.push(avatar);

    if (cfg.colliders.length > 0) {
      const group = spawnColliders(this, cfg.colliders);
      this.physics.add.collider(avatar.body, group);
    }

    this.cameras.main.startFollow(avatar.rect, true, cfg.camera.followLerp, cfg.camera.followLerp);
    this.cameras.main.setDeadzone(cfg.camera.deadzone.width, cfg.camera.deadzone.height);
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
    // SPACE is jump (unchanged). ENTER is the enter-prompt trigger
    // (2026-04-22 feedback: SPACE-vs-jump conflict made jump feel broken
    // inside any prompt radius; moving the prompt to ENTER decouples them).
    this.input.keyboard.addCapture('SPACE,ENTER');
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
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

  public override update(): void {
    this.npcSwarm?.update();

    if (!this.localAvatar) return;
    const cfg = this.sceneConfig;

    const input = this.readInputState();
    const kbd = resolveInputVelocity(input, cfg.avatar.walkSpeed);

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
        cfg.avatar.walkSpeed,
        cfg.avatar.clickArrivalThreshold,
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

    // SPACE → jump. ENTER → enter-prompt. No coordination needed: the
    // prompt helper only navigates when ENTER is pressed; SPACE is always
    // available for jump even inside a prompt's proximity radius.
    const spaceJustDown = this.spaceKey ? Phaser.Input.Keyboard.JustDown(this.spaceKey) : false;
    const enterJustDown = this.enterKey ? Phaser.Input.Keyboard.JustDown(this.enterKey) : false;
    this.enterPrompt?.update(this.localAvatar.x, this.localAvatar.y, enterJustDown);
    if (spaceJustDown && !this.localAvatar.isJumping) {
      this.localAvatar.triggerJump(this.localAvatar.direction);
    }

    if (!this.localAvatar.isJumping) {
      this.localAvatar.playAnim(moving ? 'walk' : 'idle', this.localAvatar.direction);
    }
    this.localAvatar.syncAttachments();

    const depthBase = cfg.depth.dynamic;
    const { yAnchorRatio } = cfg.ySort;
    for (const obj of this.ySortables) {
      obj.setDepth(calculateYSortDepth(obj, { depthBase, yAnchorRatio }));
    }

    this.edgeTriggers?.update(this.localAvatar.x, this.localAvatar.y);
  }
}
