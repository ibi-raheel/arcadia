// Verifies BootScene's asset manifest: stable keys, stable paths, and that
// every referenced asset exists on disk (catches future breakage if an asset
// is renamed or removed without updating the manifest).

import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { BOOT_ASSETS, BOOT_SCENE_KEY, NEXT_SCENE_KEY_AFTER_BOOT } from '../asset-manifest';

const __dirname = dirname(fileURLToPath(import.meta.url));
// apps/web/components/game/scenes/boot/__tests__ → apps/web/public
const PUBLIC_DIR = resolve(__dirname, '../../../../../public');

describe('BootScene asset manifest', () => {
  it('exports a stable BootScene key', () => {
    expect(BOOT_SCENE_KEY).toBe('BootScene');
  });

  it('hands off to WorldScene', () => {
    expect(NEXT_SCENE_KEY_AFTER_BOOT).toBe('WorldScene');
  });

  it('declares both Phase 1 assets (tileset + tilemap)', () => {
    expect(BOOT_ASSETS.tileset.path).toBe('/tilesets/placeholder.png');
    expect(BOOT_ASSETS.tilemap.path).toBe('/maps/world.tmj');
  });

  it('uses distinct Phaser texture keys per asset', () => {
    const keys = Object.values(BOOT_ASSETS).map((a) => a.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('every declared asset path points to a file that exists on disk', () => {
    for (const asset of Object.values(BOOT_ASSETS)) {
      const full = resolve(PUBLIC_DIR, `.${asset.path}`);
      expect(existsSync(full), `missing asset: ${full}`).toBe(true);
    }
  });
});
