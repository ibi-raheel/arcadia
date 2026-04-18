import Phaser from 'phaser';

// Phase 0 Step 19 — isometric spike.
//
// Proves the Phaser rendering pipeline works end-to-end in /apps/web:
//   - orthographic tilemap at 64x32 (TAD §4.1 — iso-style sprites on an
//     orthographic grid, NOT Phaser's isometric Tilemaps.Orientation)
//   - two dynamic sprites that move every frame so y-sort has work to do
//   - y-sort by sprite.y; origin pinned to (0.5, 1) so the "feet" drive
//     the sort key
//   - FPS + min-FPS overlay for the 60-FPS-for-60-seconds test criterion
//
// Placeholder art is generated procedurally via Phaser.Graphics — the
// real iso-style tileset + avatar atlases land in Phase 1 Week 3 from
// docs/art/sprite-requirements.md.

const TILE_W = 64;
const TILE_H = 32;
const GRID_COLS = 10;
const GRID_ROWS = 10;
const GRID_ORIGIN_X = 160;
const GRID_ORIGIN_Y = 60;
const AVATAR_W = 48;
const AVATAR_H = 64;
const FPS_WARMUP_MS = 3000;

export class SpikeScene extends Phaser.Scene {
  private avatars: Phaser.GameObjects.Sprite[] = [];
  private fpsText!: Phaser.GameObjects.Text;
  private minFps = Number.POSITIVE_INFINITY;
  private startTime = 0;
  private frameCount = 0;

  constructor() {
    super('SpikeScene');
  }

  preload(): void {
    // Tile: 64x32 green rectangle with a darker border. Painted on an
    // orthogonal cell per TAD §4.1; the iso "feel" will come from the
    // actual tileset art in Phase 1. Graphics objects are destroyed
    // before the first render so their brief presence in the display
    // list is invisible.
    const tile = this.add.graphics();
    tile.fillStyle(0x4ade80);
    tile.fillRect(0, 0, TILE_W, TILE_H);
    tile.lineStyle(1, 0x16a34a);
    tile.strokeRect(0, 0, TILE_W, TILE_H);
    tile.generateTexture('tile-grass', TILE_W, TILE_H);
    tile.destroy();

    // Two avatar placeholder sprites — flat coloured rectangles. Real
    // avatars are 8 characters × 24 frames each (Phase 1 Week 3).
    const avatars: Array<[string, number]> = [
      ['avatar-red', 0xef4444],
      ['avatar-blue', 0x3b82f6],
    ];
    for (const [name, color] of avatars) {
      const g = this.add.graphics();
      g.fillStyle(color);
      g.fillRect(0, 0, AVATAR_W, AVATAR_H);
      g.lineStyle(2, 0x000000);
      g.strokeRect(0, 0, AVATAR_W, AVATAR_H);
      g.generateTexture(name, AVATAR_W, AVATAR_H);
      g.destroy();
    }
  }

  create(): void {
    // Orthographic 10x10 tilemap. `data` is a 2D number[][] referring to
    // tileset indices — index 0 is 'tile-grass' below.
    const data: number[][] = Array.from({ length: GRID_ROWS }, () =>
      Array<number>(GRID_COLS).fill(0),
    );
    const map = this.make.tilemap({ data, tileWidth: TILE_W, tileHeight: TILE_H });
    const tileset = map.addTilesetImage('tile-grass', undefined, TILE_W, TILE_H);
    if (tileset) {
      map.createLayer(0, tileset, GRID_ORIGIN_X, GRID_ORIGIN_Y);
    }

    // Two avatars placed at different y-coords so y-sort has an opinion
    // to form. Origin (0.5, 1) puts the sort anchor at their feet.
    const a = this.add
      .sprite(GRID_ORIGIN_X + 2 * TILE_W, GRID_ORIGIN_Y + 3 * TILE_H, 'avatar-red')
      .setOrigin(0.5, 1);
    const b = this.add
      .sprite(GRID_ORIGIN_X + 5 * TILE_W, GRID_ORIGIN_Y + 6 * TILE_H, 'avatar-blue')
      .setOrigin(0.5, 1);
    this.avatars.push(a, b);

    // FPS + stats overlay. setScrollFactor(0) keeps it pinned to the
    // viewport when camera follow is added later; setDepth(9999) floats
    // it above all game objects.
    this.fpsText = this.add
      .text(10, 10, '', {
        font: '14px monospace',
        color: '#f5f5f5',
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: { x: 8, y: 6 },
      })
      .setScrollFactor(0)
      .setDepth(9999);

    this.startTime = this.time.now;
  }

  override update(time: number): void {
    // Animate each avatar with a different phase so y-sort order flips
    // repeatedly — exercises the depth update every frame.
    const baseYA = GRID_ORIGIN_Y + 3 * TILE_H;
    const baseYB = GRID_ORIGIN_Y + 6 * TILE_H;
    const [avatarA, avatarB] = this.avatars;
    if (!avatarA || !avatarB) return;
    avatarA.y = baseYA + Math.sin(time / 300) * 48;
    avatarB.y = baseYB + Math.cos(time / 300) * 48;

    // Y-sort: depth = sprite.y. Lower on screen renders in front.
    for (const sprite of this.avatars) {
      sprite.setDepth(sprite.y);
    }

    // Track min FPS after the warmup window — Phaser's early frames
    // skew low while textures upload.
    const fps = this.game.loop.actualFps;
    this.frameCount += 1;
    if (time - this.startTime > FPS_WARMUP_MS && fps < this.minFps) {
      this.minFps = fps;
    }

    const elapsedS = ((time - this.startTime) / 1000).toFixed(1);
    const minStr = this.minFps === Number.POSITIVE_INFINITY ? '--' : this.minFps.toFixed(0);
    this.fpsText.setText(
      [
        'Arcadia isometric spike — Phase 0 Step 19',
        `fps ${fps.toFixed(0)}   min ${minStr}`,
        `t ${elapsedS}s   frames ${this.frameCount}`,
      ].join('\n'),
    );
  }
}
