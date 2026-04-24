// Phase 4 market mount. Single-player scene + a full-screen catalog
// scroll (opens when the scene emits MARKET_OPEN_CATALOG_EVENT) + the
// StallView modal (opens when a catalog row is picked; URL carries
// ?course=<id>).
//
// 2026-04-24 — retired the floating-card stall pattern. Stall picking
// is now a catalog-scroll click that drops ?course=<id> directly into
// the URL; the scene no longer emits a per-stall event. Deep links
// with ?course= still open the StallView the same way they did before.
//
// Earlier behaviour retained:
//   - URL `?course=<id>` drives StallView open/close.
//   - `locallyEnrolledIds` set keeps "Open in Academy" after a session
//     enrol without a full page reload (Phase 7 item M6).

'use client';

import * as Phaser from 'phaser';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
  MARKET_STALLS_REGISTRY_KEY,
  MarketScene,
  type MarketStall,
} from './scenes/market/MarketScene';
import { marketCameraConfig } from './scenes/market/camera.config';
import { MEMBER_REGISTRY_KEY, type SceneMember } from './scenes/world/WorldScene';

import type { StallData } from '@/app/market/_components/StallView';
import { StallView } from '@/app/market/_components/StallView';
import { CatalogScroll } from '@/app/market/_components/CatalogScroll';

type Props = {
  readonly member: SceneMember;
  readonly stalls: readonly MarketStall[];
  readonly stallDetails: Readonly<Record<string, StallData>>;
};

export default function GameMarket({ member, stalls, stallDetails }: Props): React.JSX.Element {
  useLevelSync({ memberId: member.memberId });

  const router = useRouter();
  const searchParams = useSearchParams();
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [preloadProgress, setPreloadProgress] = useState<number | null>(null);
  const [catalogOpen, setCatalogOpen] = useState(false);

  const [locallyEnrolledIds, setLocallyEnrolledIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const markEnrolled = useCallback((courseId: string): void => {
    setLocallyEnrolledIds((prev) => {
      if (prev.has(courseId)) return prev;
      const next = new Set(prev);
      next.add(courseId);
      return next;
    });
  }, []);

  const openCourseId = searchParams.get('course');

  const routerRef = useRef(router);
  useEffect(() => {
    routerRef.current = router;
  }, [router]);

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
    game.registry.set(MARKET_STALLS_REGISTRY_KEY, stalls);
    game.registry.set(NEXT_SCENE_KEY_REGISTRY_KEY, MARKET_SCENE_KEY);
    game.registry.set(PROGRESS_CALLBACK_REGISTRY_KEY, (progress: number) => {
      setPreloadProgress(progress);
    });

    const handleOpenCatalog = (): void => {
      setCatalogOpen(true);
    };
    game.events.on(MARKET_OPEN_CATALOG_EVENT, handleOpenCatalog);

    setPreloadProgress(0);
    gameRef.current = game;

    return () => {
      const g = gameRef.current;
      gameRef.current = null;
      if (g) {
        g.events.off(MARKET_OPEN_CATALOG_EVENT, handleOpenCatalog);
        g.destroy(true);
      }
    };
  }, [member, stalls]);

  const pickStall = useCallback((courseId: string) => {
    setCatalogOpen(false);
    routerRef.current.replace(`/market?course=${courseId}`, { scroll: false });
  }, []);

  const closeStall = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('course');
    const qs = params.toString();
    router.replace(qs ? `/market?${qs}` : '/market', { scroll: false });
  }, [router, searchParams]);

  const closeCatalog = useCallback(() => setCatalogOpen(false), []);

  const activeStall = useMemo(() => {
    if (!openCourseId) return null;
    const base = stallDetails[openCourseId];
    if (!base) return null;
    return base.enrolled || !locallyEnrolledIds.has(openCourseId)
      ? base
      : { ...base, enrolled: true };
  }, [openCourseId, stallDetails, locallyEnrolledIds]);

  const ready = preloadProgress !== null && preloadProgress >= 1;

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <div ref={containerRef} className="absolute inset-0" />
      <CatalogScroll
        open={catalogOpen && !activeStall}
        onClose={closeCatalog}
        stalls={stalls}
        locallyEnrolledIds={locallyEnrolledIds}
        onPick={pickStall}
      />
      {activeStall && (
        <StallView stall={activeStall} onClose={closeStall} onEnrolled={markEnrolled} />
      )}
      <BuildingTransition
        ready={ready}
        displayName="The Market"
        backgroundImage="/market-interior.png"
      />
      <LevelUpBanner />
    </div>
  );
}
