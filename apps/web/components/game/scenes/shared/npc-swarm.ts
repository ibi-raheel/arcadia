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

import { isSimulationOnClient, SIM_CHANGE_EVENT } from '@/lib/simulation-mode';

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
import {
  createSpeechBubble,
  SPEECH_BUBBLE_DEPTH,
  SPEECH_BUBBLE_DURATION_MS,
  SPEECH_BUBBLE_Y_OFFSET,
} from './speech-bubble';

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

/** Random ambient mutterings shown above NPC heads in the same
 *  speech-bubble visual the tavern chat uses. Mix of in-character
 *  scriptorium voice + lighter relatable lines so the world feels
 *  alive without leaning too hard on the medieval gimmick. */
const NPC_MESSAGES: ReadonlyArray<string> = [
  'Bored… might have a pizza.',
  'Where was that secret chest again?',
  'I need a blacksmith. Too short for this armor.',
  'Anyone seen the keeper today?',
  'Brb, refilling the inkwell.',
  'I swear the lantern moved on its own.',
  '~ if I hear one more bard tonight ~',
  'Did the scribe finish the new course?',
  'Three coins for that? In this economy?',
  'Pretty sure the wanderer just winked at me.',
  'Just need ten minutes of focus, please.',
  'Tomorrow. I will start tomorrow.',
  'Found a typo in the third lesson. Again.',
  'My XP bar moved! …half a pixel.',
  'Tavern at sundown? Bring the lute.',
  'The hourglass said five minutes. It lied.',
  'Anyone good with Figma? Asking for a friend.',
  'Pretty sure that course launch made me rich.',
  'I am not late. The clock is early.',
  'The jukebox is stuck on the same track.',
  'I will get to inbox zero one day.',
  'Anyone want to playtest a coffer with me?',
  'Saw a dragon south of the market. Probably a goose.',
  'Need coffee. Or a nap. Both, ideally.',
  'My avatar keeps walking into walls. Theatrical.',
  'Heard the sage is just a static panel now.',
  'The scribe owes me a recap.',
  'Two streams in three days. Send help.',
  'New cohort starts Sunday. Bring tea.',
  'You ever just stand in the rain on purpose?',
];

const NPC_SPEECH_MIN_DELAY_MS = 5_000;
const NPC_SPEECH_MAX_DELAY_MS = 14_000;

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
  /** Walk speed in px/s. Default 200. Pass the scene's player
   *  `walkSpeed` so NPCs feel the same speed as the local avatar. */
  readonly speed?: number;
  /** Min idle ms on arrival. Default 1000. */
  readonly idleMinMs?: number;
  /** Max idle ms on arrival. Default 4000. */
  readonly idleMaxMs?: number;
  /** Inclusive level range used to randomise each NPC's nameplate
   *  badge digit. Default 1–12 — keeps the badge to one or two
   *  digits so the circular Arc isn't overflowed. */
  readonly levelRange?: { readonly min: number; readonly max: number };
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
  /** Scene clock ms when this NPC will speak again. Compared against
   *  `scene.time.now` each tick. Initialised on construction with a
   *  staggered offset so the swarm doesn't all chatter at once. */
  nextSpeakAt: number;
  /** Active bubble container (null when no bubble is up). Followed in
   *  update() so it tracks the NPC's position as they walk. */
  bubble: Phaser.GameObjects.Container | null;
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
  private readonly options: NpcSwarmOptions;
  private readonly bounds: NpcBounds;
  private readonly speed: number;
  private readonly idleMinMs: number;
  private readonly idleMaxMs: number;
  private readonly npcs: Npc[] = [];
  /** Window-level handler bound to the SIM_CHANGE_EVENT — kept as a
   *  field so `destroy()` can remove it cleanly. */
  private readonly simChangeHandler: (e: Event) => void;

  constructor(scene: Phaser.Scene, options: NpcSwarmOptions) {
    this.scene = scene;
    this.options = options;
    this.bounds = options.bounds;
    this.speed = options.speed ?? 200;
    this.idleMinMs = options.idleMinMs ?? 1000;
    this.idleMaxMs = options.idleMaxMs ?? 4000;

    // Spawn only when simulation mode is on. The persistent player
    // is otherwise alone in the scene.
    if (isSimulationOnClient()) {
      this.spawnAll();
    }

    // React to the global toggle. Flipping ON spawns a fresh batch
    // (same logic the constructor uses); flipping OFF tears them
    // down, including any pending speech bubbles. Bound to the
    // window so it survives scene re-renders inside the same React
    // tree (Phaser scene lifetime > swarm lifetime is a non-goal —
    // the React mount destroys + recreates the scene on navigation,
    // and the swarm goes with it).
    this.simChangeHandler = (e: Event): void => {
      const detail = (e as CustomEvent<boolean>).detail;
      if (detail) {
        if (this.npcs.length === 0) this.spawnAll();
      } else {
        this.despawnAll();
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener(SIM_CHANGE_EVENT, this.simChangeHandler);
    }

    // Also clean up when the scene tears down (route change, etc) so
    // the listener doesn't leak past the Phaser game's lifetime.
    scene.events.once('shutdown', () => this.destroy());
    scene.events.once('destroy', () => this.destroy());
  }

  /** Spawns the configured number of NPCs at random positions and
   *  stagger-initialised speak/idle timers. Idempotent only after a
   *  preceding `despawnAll()` — calling it twice in a row would
   *  double the population. */
  private spawnAll(): void {
    const levelMin = this.options.levelRange?.min ?? 1;
    const levelMax = this.options.levelRange?.max ?? 12;

    for (let i = 0; i < this.options.count; i++) {
      const persona = NPC_PERSONAS[i % NPC_PERSONAS.length]!;
      const x = randomInRange(this.bounds.minX, this.bounds.maxX);
      const y = randomInRange(this.bounds.minY, this.bounds.maxY);
      // Per-NPC randomised level so the badges show a mix of digits
      // (1, 4, 7, 12, …) rather than every NPC reading "Lv 1".
      const level = Math.floor(randomInRange(levelMin, levelMax + 1));
      const visuals = createAvatarVisuals(
        this.scene,
        persona.avatarId,
        x,
        y,
        persona.name,
        level,
        this.options.size,
      );
      this.npcs.push({
        visuals,
        avatarId: persona.avatarId,
        state: 'idle',
        targetX: x,
        targetY: y,
        // Stagger first-move so they don't all start walking on frame 1.
        idleUntil: this.scene.time.now + Math.random() * 1500,
        direction: 's',
        currentAnimKey: null,
        // Stagger first-bubble across the full max delay so the
        // swarm chatters at different beats instead of in sync.
        nextSpeakAt:
          this.scene.time.now + NPC_SPEECH_MIN_DELAY_MS + Math.random() * NPC_SPEECH_MAX_DELAY_MS,
        bubble: null,
      });
      // Start each NPC in idle-south (matches LocalAvatar default).
      this.playAnim(this.npcs[this.npcs.length - 1]!, 'idle', 's');
    }
  }

  /** Tears down every NPC + their pending bubble, leaving the
   *  internal array empty. The next `spawnAll()` builds fresh
   *  visuals + timers. */
  private despawnAll(): void {
    for (const npc of this.npcs) {
      if (npc.bubble) {
        npc.bubble.destroy();
        npc.bubble = null;
      }
      destroyVisuals(npc.visuals);
    }
    this.npcs.length = 0;
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

      // Speech bubble lifecycle. If the NPC has no bubble and it's
      // time to speak, pick a random line and spawn one. If they
      // have one, follow it to their head each frame.
      if (npc.bubble === null && now >= npc.nextSpeakAt) {
        const text =
          NPC_MESSAGES[Math.floor(Math.random() * NPC_MESSAGES.length)] ?? NPC_MESSAGES[0]!;
        const bubble = createSpeechBubble(this.scene, text);
        bubble.setDepth(SPEECH_BUBBLE_DEPTH);
        bubble.setPosition(
          npc.visuals.gameObject.x,
          npc.visuals.gameObject.y - SPEECH_BUBBLE_Y_OFFSET,
        );
        npc.bubble = bubble;
        // Auto-destroy after the standard duration; clear the slot
        // so the next-speak timer can re-fire.
        this.scene.time.delayedCall(SPEECH_BUBBLE_DURATION_MS, () => {
          if (npc.bubble) {
            npc.bubble.destroy();
            npc.bubble = null;
          }
          npc.nextSpeakAt =
            this.scene.time.now +
            NPC_SPEECH_MIN_DELAY_MS +
            Math.random() * (NPC_SPEECH_MAX_DELAY_MS - NPC_SPEECH_MIN_DELAY_MS);
        });
      } else if (npc.bubble !== null) {
        npc.bubble.setPosition(
          npc.visuals.gameObject.x,
          npc.visuals.gameObject.y - SPEECH_BUBBLE_Y_OFFSET,
        );
      }
    }
  }

  destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener(SIM_CHANGE_EVENT, this.simChangeHandler);
    }
    this.despawnAll();
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
