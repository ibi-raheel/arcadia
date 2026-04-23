// Phase 4 market mount. Mirrors GameAcademy's single-player shape +
// adds a React HUD (search) on top of the Phaser canvas and a full-screen
// StallView modal that opens when the scene emits MARKET_OPEN_STALL_EVENT.
// URL carries ?course=<id>; the URL is the sole source of truth for
// which stall (if any) is open — avoids state/URL races.

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
  MARKET_FILTER_EVENT,
  MARKET_OPEN_STALL_EVENT,
  MARKET_SCENE_KEY,
  MARKET_STALLS_REGISTRY_KEY,
  MarketScene,
  type MarketStall,
} from './scenes/market/MarketScene';
import { marketCameraConfig } from './scenes/market/camera.config';
import { MEMBER_REGISTRY_KEY, type SceneMember } from './scenes/world/WorldScene';

import type { StallData } from '@/app/market/_components/StallView';
import { StallView } from '@/app/market/_components/StallView';

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
  const [search, setSearch] = useState('');

  // URL is the single source of truth for the open stall id.
  const openCourseId = searchParams.get('course');

  // Keep a ref to router so the Phaser lifecycle effect (mounted once)
  // can call the latest router.replace on stall-click events.
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

    const handleOpenStall = (courseId: string): void => {
      // Navigate only — the URL flips the modal open via `openCourseId`.
      routerRef.current.replace(`/market?course=${courseId}`, { scroll: false });
    };
    game.events.on(MARKET_OPEN_STALL_EVENT, handleOpenStall);

    setPreloadProgress(0);
    gameRef.current = game;

    return () => {
      const g = gameRef.current;
      gameRef.current = null;
      if (g) {
        g.events.off(MARKET_OPEN_STALL_EVENT, handleOpenStall);
        g.destroy(true);
      }
    };
  }, [member, stalls]);

  // Push search changes down into the scene so stall game-objects can
  // hide / show without a React re-render.
  useEffect(() => {
    const g = gameRef.current;
    if (!g) return;
    g.events.emit(MARKET_FILTER_EVENT, search);
  }, [search]);

  const closeStall = useCallback(() => {
    // Drop ?course= — the derived `openCourseId` then flips null and
    // the modal unmounts.
    const params = new URLSearchParams(searchParams.toString());
    params.delete('course');
    const qs = params.toString();
    router.replace(qs ? `/market?${qs}` : '/market', { scroll: false });
  }, [router, searchParams]);

  const handleReturnToWorld = (): void => router.push('/world?from=market');

  const activeStall = useMemo(
    () => (openCourseId ? (stallDetails[openCourseId] ?? null) : null),
    [openCourseId, stallDetails],
  );

  const ready = preloadProgress !== null && preloadProgress >= 1;

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <div ref={containerRef} className="absolute inset-0" />
      <button
        type="button"
        onClick={handleReturnToWorld}
        className="absolute left-4 top-4 z-30 rounded bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-900 shadow transition hover:bg-white"
      >
        ← Return to World
      </button>
      <div className="absolute right-4 top-4 z-30 flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 backdrop-blur">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search stalls…"
          className="w-56 rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
        />
      </div>
      {activeStall && <StallView stall={activeStall} onClose={closeStall} />}
      <BuildingTransition
        ready={ready}
        displayName="The Market"
        backgroundImage="/market-interior.png"
      />
      <LevelUpBanner />
    </div>
  );
}
