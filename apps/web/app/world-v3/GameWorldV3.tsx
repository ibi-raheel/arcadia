'use client';

import * as Phaser from 'phaser';
import { useEffect, useRef } from 'react';

import { AVATAR_SHEETS } from '@/components/game/scenes/boot/asset-manifest';
import { registerAvatarAnimations } from '@/components/game/scenes/world/avatar-animations';
import {
  resolveInputVelocity,
  velocityToFacingDirection,
  type InputState,
} from '@/components/game/scenes/world/input';
import { LocalAvatar } from '@/components/game/scenes/world/local-avatar';

const MAP_KEY = 'arcadia-world';
const MAP_PATH = '/maps/arcadia-world.tmj';
const AVATAR_DISPLAY_SIZE = 128;
const AVATAR_BODY_OFFSET = { x: 32, y: 88, width: 64, height: 32 } as const;
const WALK_SPEED = 260;

type InlineTileset = {
  name: string;
  image: string;
  tilewidth: number;
  tileheight: number;
  objectalignment?: string;
};

class WorldV3Scene extends Phaser.Scene {
  private tilesetPreloads: InlineTileset[] = [];
  private localAvatar?: LocalAvatar;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys?: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private objectSprites: Phaser.GameObjects.Sprite[] = [];

  constructor() {
    super({ key: 'WorldV3Scene' });
  }

  preload(): void {
    this.load.tilemapTiledJSON(MAP_KEY, MAP_PATH);
    this.load.once(`filecomplete-tilemapJSON-${MAP_KEY}`, () => {
      const data = this.cache.tilemap.get(MAP_KEY)?.data;
      if (!data) return;
      this.tilesetPreloads = (data.tilesets ?? [])
        .filter((t: InlineTileset) => !!t.image && !!t.name && !!t.tilewidth)
        .map((t: InlineTileset) => ({
          name: t.name,
          image: t.image,
          tilewidth: t.tilewidth,
          tileheight: t.tileheight,
          objectalignment: t.objectalignment,
        }));
      // Load each tileset as a SPRITESHEET with its per-tile dimensions.
      // This registers one texture-frame per tile on the image so
      // map.createFromObjects + raw add.sprite(x, y, key, frame) both
      // pick the right tile instead of the whole sheet.
      for (const ts of this.tilesetPreloads) {
        this.load.spritesheet(`ts-${ts.name}`, ts.image, {
          frameWidth: ts.tilewidth,
          frameHeight: ts.tileheight,
        });
      }
      this.load.start();
    });

    for (const actions of Object.values(AVATAR_SHEETS)) {
      if (!actions) continue;
      for (const sheet of Object.values(actions)) {
        if (!sheet) continue;
        this.load.spritesheet(sheet.key, sheet.path, {
          frameWidth: sheet.frameWidth,
          frameHeight: sheet.frameHeight,
        });
      }
    }
  }

  create(): void {
    const map = this.make.tilemap({ key: MAP_KEY });

    const tilesets: Phaser.Tilemaps.Tileset[] = [];
    for (const ts of this.tilesetPreloads) {
      const set = map.addTilesetImage(ts.name, `ts-${ts.name}`);
      if (set) tilesets.push(set);
    }

    // Tile layers by index (duplicate names OK).
    map.layers.forEach((_layerData, idx) => {
      map.createLayer(idx, tilesets, 0, 0);
    });

    // Object layers → one Sprite per object. Explicit frame picking:
    // gid − tileset.firstgid = local tile index = frame index (since
    // load.spritesheet registered frames "0", "1", "2", ... in the
    // same order). No reliance on createFromObjects doing the right
    // thing silently — we compute the frame ourselves.
    for (const objectLayer of map.objects) {
      for (const obj of objectLayer.objects) {
        if (obj.gid == null) continue;
        const tileset = findTilesetForGid(tilesets, obj.gid);
        if (!tileset) continue;
        const localTileIndex = obj.gid - tileset.firstgid;
        const texKey = `ts-${tileset.name}`;
        const sprite = this.add.sprite(obj.x ?? 0, obj.y ?? 0, texKey, localTileIndex);
        applyOriginFromAlignment(sprite, tilesetAlignment(tileset));
        if (obj.width && obj.height) sprite.setDisplaySize(obj.width, obj.height);
        sprite.setDepth(obj.y ?? 0);
        this.objectSprites.push(sprite);
      }
    }

    const worldW = map.widthInPixels;
    const worldH = map.heightInPixels;
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.physics.world.setBounds(0, 0, worldW, worldH);

    registerAvatarAnimations(this);
    this.localAvatar = new LocalAvatar(this, {
      memberId: 'preview-member',
      avatarId: 'avatar-01',
      displayName: 'Preview',
      spawnPixel: { x: worldW / 2, y: worldH / 2 },
      size: { width: AVATAR_DISPLAY_SIZE, height: AVATAR_DISPLAY_SIZE },
      bodyOffset: AVATAR_BODY_OFFSET,
    });
    this.cameras.main.startFollow(this.localAvatar.rect, true, 0.12, 0.12);
    this.cameras.main.setZoom(0.6);

    this.wireKeyboardInput();
  }

  private wireKeyboardInput(): void {
    if (!this.input.keyboard) return;
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasdKeys = this.input.keyboard.addKeys('W,A,S,D') as typeof this.wasdKeys;
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
    if (!this.localAvatar) return;
    const kbd = resolveInputVelocity(this.readInputState(), WALK_SPEED);
    this.localAvatar.body.setVelocity(kbd.vx, kbd.vy);
    this.localAvatar.isMoving = kbd.isMoving;
    this.localAvatar.direction = velocityToFacingDirection(
      kbd.vx,
      kbd.vy,
      this.localAvatar.direction,
    );
    if (!this.localAvatar.isJumping) {
      this.localAvatar.playAnim(kbd.isMoving ? 'walk' : 'idle', this.localAvatar.direction);
    }
    this.localAvatar.syncAttachments();
    const go = this.localAvatar.rect as Phaser.GameObjects.GameObject & {
      setDepth?: (v: number) => unknown;
    };
    go.setDepth?.(this.localAvatar.y + AVATAR_DISPLAY_SIZE / 2);
  }
}

function findTilesetForGid(
  tilesets: readonly Phaser.Tilemaps.Tileset[],
  gid: number,
): Phaser.Tilemaps.Tileset | undefined {
  let best: Phaser.Tilemaps.Tileset | undefined;
  for (const t of tilesets) {
    if (t.firstgid <= gid && (!best || t.firstgid > best.firstgid)) best = t;
  }
  return best;
}

function tilesetAlignment(ts: Phaser.Tilemaps.Tileset): string {
  // Phaser's Tileset type doesn't surface objectalignment as a typed
  // property, but the parsed data is preserved on the underlying object.
  const raw = (ts as unknown as { tileProperties?: unknown; objectAlignment?: string })
    .objectAlignment;
  return raw ?? 'bottomleft';
}

function applyOriginFromAlignment(sprite: Phaser.GameObjects.Sprite, alignment: string): void {
  // Tiled's objectalignment values — map to Phaser origin (0..1 on each axis).
  switch (alignment) {
    case 'topleft':
      sprite.setOrigin(0, 0);
      break;
    case 'top':
      sprite.setOrigin(0.5, 0);
      break;
    case 'topright':
      sprite.setOrigin(1, 0);
      break;
    case 'left':
      sprite.setOrigin(0, 0.5);
      break;
    case 'center':
      sprite.setOrigin(0.5, 0.5);
      break;
    case 'right':
      sprite.setOrigin(1, 0.5);
      break;
    case 'bottom':
      sprite.setOrigin(0.5, 1);
      break;
    case 'bottomright':
      sprite.setOrigin(1, 1);
      break;
    case 'bottomleft':
    default:
      sprite.setOrigin(0, 1);
      break;
  }
}

export default function GameWorldV3(): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      backgroundColor: '#1a1a1a',
      pixelArt: true,
      physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
      scale: {
        mode: Phaser.Scale.RESIZE,
        width: window.innerWidth,
        height: window.innerHeight,
      },
      scene: [WorldV3Scene],
    });
    gameRef.current = game;
    return () => {
      const g = gameRef.current;
      gameRef.current = null;
      if (g) g.destroy(true);
    };
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#1a1a1a]">
      <div ref={containerRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute left-4 top-4 rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-slate-300 backdrop-blur">
        <p className="font-semibold">Arcadia World 3 preview (20×20 @ 128px)</p>
        <p className="mt-1 text-slate-500">WASD / arrows to move · throwaway branch</p>
      </div>
    </div>
  );
}
