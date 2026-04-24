// Phase 4 market mount. Mirrors GameAcademy's single-player shape + a
// full-screen StallView modal that opens when the scene emits
// MARKET_OPEN_STALL_EVENT. URL carries ?course=<id>; the URL is the sole
// source of truth for which stall (if any) is open — avoids state/URL races.
//
// 2026-04-23 (Phase 7):
//   - M4: removed the "← Return to World" button (edge-exit covers it).
//   - M5: removed the "Search stalls…" input (no one used it).
//   - M6: `locallyEnrolledIds` moved here from StallView so reopening a
//     stall after enrolling in the same session still shows "Open in
//     Academy" instead of the Enrol button.

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

  // Course ids the member enrolled in during this session. Merged with
  // `stall.enrolled` so reopening the modal after enrolling still shows
  // "Open in Academy" instead of the Enrol button (Phase 7 item M6).
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

  const closeStall = useCallback(() => {
    // Drop ?course= — the derived `openCourseId` then flips null and
    // the modal unmounts.
    const params = new URLSearchParams(searchParams.toString());
    params.delete('course');
    const qs = params.toString();
    router.replace(qs ? `/market?${qs}` : '/market', { scroll: false });
  }, [router, searchParams]);

  const activeStall = useMemo(() => {
    if (!openCourseId) return null;
    const base = stallDetails[openCourseId];
    if (!base) return null;
    // Merge the server-fetched `enrolled` with the session-local set so
    // re-opening the modal after enrolling still reads as enrolled.
    return base.enrolled || !locallyEnrolledIds.has(openCourseId)
      ? base
      : { ...base, enrolled: true };
  }, [openCourseId, stallDetails, locallyEnrolledIds]);

  const ready = preloadProgress !== null && preloadProgress >= 1;

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <div ref={containerRef} className="absolute inset-0" />
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
