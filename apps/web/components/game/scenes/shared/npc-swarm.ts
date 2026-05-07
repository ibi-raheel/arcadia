// Demo NPCs — autonomous wandering avatars that populate every Phaser
// scene so the world feels inhabited during demo recordings. Spawned
// client-side per scene; not synced via Colyseus, so different tabs
// see different NPC arrangements (fine for single-tab demos).
//
// Each NPC uses the existing avatar-renderer + avatar-animations
// pipeline, so it visually reads identical to a real player. Behaviour
// is a tiny state machine: pick a random in-bounds target → walk
// toward it at fixed speed → on arrival, idle 1–4s → repeat.
//
// **Visual-only.** No physics body, no collider awareness — NPCs
// walk straight lines and may pass through scene props (chairs,
// tables, the central crystal, etc). For demo polish this trade-off
// is acceptable; if it ever shows on camera, swap to a colliders-
// aware path.
//
// Usage from a scene:
//
//     // in create(), after registerAvatarAnimations(this):
//     this.npcSwarm = new NpcSwarm(this, {
//       count: 4,
//       bounds: { minX: 200, minY: 200, maxX: 2308, maxY: 2308 },
//       size: { width: 202, height: 202 },
//     });
//
//     // in update(time, delta):
//     this.npcSwarm?.update(time, delta);

import type Phaser from 'phaser';

import type { AvatarDirection } from '@arcadia/shared';

import { animationKey } from '../world/avatar-animations';
import {
  createAvatarVisuals,
  destroyVisuals,
  setVisualsDepth,
  syncVisualAttachments,
  type AvatarSize,
  type AvatarVisuals,
} from '../world/avatar-renderer';
import type { AvatarId } from './avatar-palette';

/** Pool of NPC personas — alternates as we spawn so the same scene
 *  doesn't have four "Mira"s. Names borrowed from the market
 *  fixtures so they read as plausible realm folk. */
const NPC_PERSONAS: ReadonlyArray<{ readonly avatarId: AvatarId; readonly name: string }> = [
  { avatarId: 'avatar-01', name: 'Roan' },
  { avatarId: 'avatar-02', name: 'Mira' },
  { avatarId: 'avatar-01', name: 'Hollis' },
  { avatarId: 'avatar-02', name: 'Tama' },
  { avatarId: 'avatar-01', name: 'Idris' },
  { avatarId: 'avatar-02', name: 'Lyra' },
  { avatarId: 'avatar-01', name: 'Nox' },
  { avatarId: 'avatar-02', name: 'Cassia' },
];

export type NpcBounds = {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
};

export type NpcSwarmOptions = {
  /** Number of NPCs to spawn. 3–5 is a good demo range. */
  readonly count: number;
  /** Allowed wander rect in world pixels. */
  readonly bounds: NpcBounds;
  /** Display size — should match the scene's player avatar size. */
  readonly size: AvatarSize;
  /** Walk speed in px/s. Default 90 — slower than the player so they
   *  read as ambient, not racing. */
  readonly speed?: number;
  /** Min idle ms on arrival. Default 1000. */
  readonly idleMinMs?: number;
  /** Max idle ms on arrival. Default 4000. */
  readonly idleMaxMs?: number;
  /** Optional level shown in the nameplate badge. Default 1. */
  readonly level?: number;
};

type NpcState = 'walking' | 'idle';

type Npc = {
  readonly visuals: AvatarVisuals;
  readonly avatarId: AvatarId;
  state: NpcState;
  targetX: number;
  targetY: number;
  /** Scene clock ms — when state === 'idle', waits until this. */
  idleUntil: number;
  direction: AvatarDirection;
  /** Tracks whether the current `walk-<dir>` anim has been started so
   *  we don't restart it every frame and stutter the cycle. */
  currentAnimKey: string | null;
};

/** Cardinal direction from a velocity vector. Matches the world's
 *  facing convention: dominant axis wins; horizontal ties pick e/w. */
function velocityToCardinal(vx: number, vy: number): AvatarDirection {
  if (Math.abs(vx) >= Math.abs(vy)) return vx >= 0 ? 'e' : 'w';
  return vy >= 0 ? 's' : 'n';
}

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export class NpcSwarm {
  private readonly scene: Phaser.Scene;
  private readonly bounds: NpcBounds;
  private readonly speed: number;
  private readonly idleMinMs: number;
  private readonly idleMaxMs: number;
  private readonly npcs: Npc[] = [];

  constructor(scene: Phaser.Scene, options: NpcSwarmOptions) {
    this.scene = scene;
    this.bounds = options.bounds;
    this.speed = options.speed ?? 90;
    this.idleMinMs = options.idleMinMs ?? 1000;
    this.idleMaxMs = options.idleMaxMs ?? 4000;
    const level = options.level ?? 1;

    for (let i = 0; i < options.count; i++) {
      const persona = NPC_PERSONAS[i % NPC_PERSONAS.length]!;
      const x = randomInRange(this.bounds.minX, this.bounds.maxX);
      const y = randomInRange(this.bounds.minY, this.bounds.maxY);
      const visuals = createAvatarVisuals(
        scene,
        persona.avatarId,
        x,
        y,
        persona.name,
        level,
        options.size,
      );
      this.npcs.push({
        visuals,
        avatarId: persona.avatarId,
        state: 'idle',
        targetX: x,
        targetY: y,
        // Stagger first-move so they don't all start walking on frame 1.
        idleUntil: scene.time.now + Math.random() * 1500,
        direction: 's',
        currentAnimKey: null,
      });
      // Start each NPC in idle-south (matches LocalAvatar default).
      this.playAnim(this.npcs[this.npcs.length - 1]!, 'idle', 's');
    }
  }

  update(time?: number, deltaMs?: number): void {
    const now = time ?? this.scene.time.now;
    const dt = (deltaMs ?? this.scene.game.loop.delta) / 1000;

    for (const npc of this.npcs) {
      if (npc.state === 'idle') {
        if (now < npc.idleUntil) {
          syncVisualAttachments(npc.visuals);
          setVisualsDepth(npc.visuals, npc.visuals.gameObject.y);
          continue;
        }
        // Idle expired — pick a new target inside bounds and start
        // walking. The target may be very close, in which case the
        // next tick will arrive immediately and idle again.
        npc.targetX = randomInRange(this.bounds.minX, this.bounds.maxX);
        npc.targetY = randomInRange(this.bounds.minY, this.bounds.maxY);
        npc.state = 'walking';
      }

      // Walking branch.
      const dx = npc.targetX - npc.visuals.gameObject.x;
      const dy = npc.targetY - npc.visuals.gameObject.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 6) {
        // Arrived. Snap to target, idle for a randomised stretch.
        npc.visuals.gameObject.x = npc.targetX;
        npc.visuals.gameObject.y = npc.targetY;
        npc.state = 'idle';
        npc.idleUntil = now + randomInRange(this.idleMinMs, this.idleMaxMs);
        this.playAnim(npc, 'idle', npc.direction);
      } else {
        const vx = (dx / dist) * this.speed;
        const vy = (dy / dist) * this.speed;
        npc.visuals.gameObject.x += vx * dt;
        npc.visuals.gameObject.y += vy * dt;
        const dir = velocityToCardinal(vx, vy);
        if (dir !== npc.direction) {
          npc.direction = dir;
          this.playAnim(npc, 'walk', dir);
        } else {
          // Same direction — make sure walk anim is running (handles
          // the idle → walk transition where direction didn't change).
          this.playAnim(npc, 'walk', dir);
        }
      }

      syncVisualAttachments(npc.visuals);
      setVisualsDepth(npc.visuals, npc.visuals.gameObject.y);
    }
  }

  destroy(): void {
    for (const npc of this.npcs) {
      destroyVisuals(npc.visuals);
    }
    this.npcs.length = 0;
  }

  private playAnim(npc: Npc, action: 'idle' | 'walk', direction: AvatarDirection): void {
    if (!npc.visuals.sprite) return; // Rectangle-fallback avatars can't animate.
    const key = animationKey(npc.avatarId, action, direction);
    if (key === npc.currentAnimKey) return;
    if (!this.scene.anims.exists(key)) return;
    npc.visuals.sprite.play(key, true);
    npc.currentAnimKey = key;
  }
}
