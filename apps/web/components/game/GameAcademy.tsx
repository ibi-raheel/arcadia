// Phase 3.5 academy mount. Single-player mirror of GameTavern without
// Colyseus / chat / leaderboard — just Phaser + a local avatar + a
// central lectern. Walking up to the lectern + pressing ENTER opens a
// React scroll modal (LedgerScroll) listing the member's courses.
//
// 2026-04-24 — retired the floating-card podium pattern. The course list
// is now kept in React and only shown when the member interacts with
// the scene centrepiece.

'use client';

import * as Phaser from 'phaser';
import { useCallback, useEffect, useRef, useState } from 'react';

import { LedgerScroll } from '@/app/academy/_components/LedgerScroll';

import { BuildingTransition } from './BuildingTransition';
import { LevelUpBanner } from './LevelUpBanner';
import { useLevelSync } from './net/use-level-sync';
import { BootScene } from './scenes/boot/BootScene';
import {
  NEXT_SCENE_KEY_REGISTRY_KEY,
  PROGRESS_CALLBACK_REGISTRY_KEY,
} from './scenes/boot/asset-manifest';
import {
  ACADEMY_COURSES_REGISTRY_KEY,
  ACADEMY_OPEN_LEDGER_EVENT,
  ACADEMY_SCENE_KEY,
  AcademyScene,
  type AcademyCoursePodium,
} from './scenes/academy/AcademyScene';
import { academyCameraConfig } from './scenes/academy/camera.config';
import { MEMBER_REGISTRY_KEY, type SceneMember } from './scenes/world/WorldScene';

type Props = {
  readonly member: SceneMember;
  readonly courses: readonly AcademyCoursePodium[];
};

export default function GameAcademy({ member, courses }: Props): React.JSX.Element {
  useLevelSync({ memberId: member.memberId });

  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [preloadProgress, setPreloadProgress] = useState<number | null>(null);
  const [ledgerOpen, setLedgerOpen] = useState(false);

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
        width: academyCameraConfig.bounds.width,
        height: academyCameraConfig.bounds.height,
      },
      scene: [BootScene, AcademyScene],
    });

    game.registry.set(MEMBER_REGISTRY_KEY, member);
    game.registry.set(ACADEMY_COURSES_REGISTRY_KEY, courses);
    game.registry.set(NEXT_SCENE_KEY_REGISTRY_KEY, ACADEMY_SCENE_KEY);
    game.registry.set(PROGRESS_CALLBACK_REGISTRY_KEY, (progress: number) => {
      setPreloadProgress(progress);
    });

    const handleOpenLedger = (): void => {
      setLedgerOpen(true);
    };
    game.events.on(ACADEMY_OPEN_LEDGER_EVENT, handleOpenLedger);

    setPreloadProgress(0);
    gameRef.current = game;

    return () => {
      const g = gameRef.current;
      gameRef.current = null;
      if (g) {
        g.events.off(ACADEMY_OPEN_LEDGER_EVENT, handleOpenLedger);
        g.destroy(true);
      }
    };
  }, [member, courses]);

  const closeLedger = useCallback(() => setLedgerOpen(false), []);

  const ready = preloadProgress !== null && preloadProgress >= 1;

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <div ref={containerRef} className="absolute inset-0" />
      <LedgerScroll open={ledgerOpen} onClose={closeLedger} courses={courses} />
      <BuildingTransition
        ready={ready}
        displayName="The Academy"
        backgroundImage="/academy-interior.png"
      />
      <LevelUpBanner />
    </div>
  );
}
