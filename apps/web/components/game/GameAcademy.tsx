// Phase 3.5 academy mount. Single-player mirror of GameTavern without
// Colyseus / chat / leaderboard — just Phaser + a local avatar + course
// podiums. Podium clicks fire a navigation event routed to /academy/[id].

'use client';

import * as Phaser from 'phaser';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

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
  ACADEMY_NAVIGATE_EVENT,
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

  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [preloadProgress, setPreloadProgress] = useState<number | null>(null);

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

    const handleNavigate = (courseId: string): void => {
      router.push(`/academy/${courseId}`);
    };
    game.events.on(ACADEMY_NAVIGATE_EVENT, handleNavigate);

    setPreloadProgress(0);
    gameRef.current = game;

    return () => {
      const g = gameRef.current;
      gameRef.current = null;
      if (g) {
        g.events.off(ACADEMY_NAVIGATE_EVENT, handleNavigate);
        g.destroy(true);
      }
    };
  }, [member, courses, router]);

  const ready = preloadProgress !== null && preloadProgress >= 1;

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <div ref={containerRef} className="absolute inset-0" />
      <BuildingTransition
        ready={ready}
        displayName="The Academy"
        backgroundImage="/academy-interior.png"
      />
      <LevelUpBanner />
    </div>
  );
}
