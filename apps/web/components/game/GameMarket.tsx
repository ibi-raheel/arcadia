// /market mount. Loads the Phaser MarketScene (image-backed interior +
// central crystal) and a single React overlay — `MarketOverlay` —
// hosting the four-stall dashboard (Courses / Templates / Tools /
// Exclusives). Walking up to the crystal + ENTER fires
// MARKET_OPEN_CATALOG_EVENT; we listen and toggle the overlay.
//
// **2026-05-02 — overlay rework.** Replaced the legacy
// `CatalogScroll` (one row per course) + URL-driven `StallView`
// pair with the four-stall dashboard. Both files stay on disk for
// reference but are no longer imported here. The Phaser scene
// itself is unchanged; only the React surface that opens on the
// crystal interaction is different.

'use client';

import * as Phaser from 'phaser';
import { useCallback, useEffect, useRef, useState } from 'react';

import { MarketOverlay } from '@/app/market/_components/MarketOverlay';
import type { MarketItem } from '@/lib/market/types';

import { BuildingTransition } from './BuildingTransition';
import { LevelUpBanner } from './LevelUpBanner';
import { useLevelSync } from './net/use-level-sync';
import { BootScene } from './scenes/boot/BootScene';
import {
  NEXT_SCENE_KEY_REGISTRY_KEY,
  PROGRESS_CALLBACK_REGISTRY_KEY,
} from './scenes/boot/asset-manifest';
import {
  MARKET_OPEN_CATALOG_EVENT,
  MARKET_SCENE_KEY,
  MarketScene,
} from './scenes/market/MarketScene';
import { marketCameraConfig } from './scenes/market/camera.config';
import { MEMBER_REGISTRY_KEY, type SceneMember } from './scenes/world/WorldScene';

type Props = {
  readonly member: SceneMember;
  readonly courses: ReadonlyArray<MarketItem>;
};

export default function GameMarket({ member, courses }: Props): React.JSX.Element {
  useLevelSync({ memberId: member.memberId });

  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [preloadProgress, setPreloadProgress] = useState<number | null>(null);
  const [overlayOpen, setOverlayOpen] = useState(false);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      backgroundColor: '#0f172a',
      pixelArt: true,
      physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
      scale: {
        mode: Phaser.Scale.RESIZE,
        width: marketCameraConfig.bounds.width,
        height: marketCameraConfig.bounds.height,
      },
      scene: [BootScene, MarketScene],
    });

    game.registry.set(MEMBER_REGISTRY_KEY, member);
    game.registry.set(NEXT_SCENE_KEY_REGISTRY_KEY, MARKET_SCENE_KEY);
    game.registry.set(PROGRESS_CALLBACK_REGISTRY_KEY, (progress: number) => {
      setPreloadProgress(progress);
    });

    const handleOpenOverlay = (): void => {
      setOverlayOpen(true);
    };
    game.events.on(MARKET_OPEN_CATALOG_EVENT, handleOpenOverlay);

    setPreloadProgress(0);
    gameRef.current = game;

    return () => {
      const g = gameRef.current;
      gameRef.current = null;
      if (g) {
        g.events.off(MARKET_OPEN_CATALOG_EVENT, handleOpenOverlay);
        g.destroy(true);
      }
    };
  }, [member]);

  const closeOverlay = useCallback(() => setOverlayOpen(false), []);

  const ready = preloadProgress !== null && preloadProgress >= 1;

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <div ref={containerRef} className="absolute inset-0" />
      <MarketOverlay open={overlayOpen} onClose={closeOverlay} courses={courses} />
      <BuildingTransition
        ready={ready}
        displayName="The Market"
        backgroundImage="/market-interior.png"
      />
      <LevelUpBanner />
    </div>
  );
}
