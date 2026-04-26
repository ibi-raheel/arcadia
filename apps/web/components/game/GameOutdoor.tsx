// Single-player Phaser mount shared by the three outdoor scene routes
// (/academy-outside, /tavern-outside, /coworking). No Colyseus — each
// outdoor scene is single-player by design; multiplayer happens inside
// the interiors (tavern-realm1 / coworking-realm1).
//
// Variant selection is by prop — the page passes 'academy-outside' etc.
// and GameOutdoor resolves the right scene class, scene key, and camera
// bounds from `VARIANT_MAP`.

'use client';

import * as Phaser from 'phaser';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { getSupabaseBrowserClient } from '@/lib/supabase/client';

import { BuildingTransition } from './BuildingTransition';
import { LevelUpBanner } from './LevelUpBanner';
import { PlayerHud } from '@/components/hud/PlayerHud';
import { BootScene } from './scenes/boot/BootScene';
import {
  NEXT_SCENE_KEY_REGISTRY_KEY,
  PROGRESS_CALLBACK_REGISTRY_KEY,
} from './scenes/boot/asset-manifest';
import {
  AcademyOutsideScene,
  ACADEMY_OUTSIDE_SCENE_KEY,
} from './scenes/academy-outside/AcademyOutsideScene';
import { academyOutsideCameraConfig } from './scenes/academy-outside/camera.config';
import {
  CoworkingOutsideScene,
  COWORKING_OUTSIDE_SCENE_KEY,
} from './scenes/coworking-outside/CoworkingOutsideScene';
import { coworkingOutsideCameraConfig } from './scenes/coworking-outside/camera.config';
import { OUTDOOR_SPAWN_OVERRIDE_REGISTRY_KEY } from './scenes/shared/outdoor-scene-base';
import { isAvatarId, type AvatarId } from './scenes/shared/avatar-palette';
import {
  TavernOutsideScene,
  TAVERN_OUTSIDE_SCENE_KEY,
} from './scenes/tavern-outside/TavernOutsideScene';
import { tavernOutsideCameraConfig } from './scenes/tavern-outside/camera.config';
import { TAVERN_OUTSIDE_DOOR_SPAWNS } from './scenes/tavern-outside/layers.config';
import { COWORKING_OUTSIDE_DOOR_SPAWNS } from './scenes/coworking-outside/layers.config';
import { MEMBER_REGISTRY_KEY, type SceneMember } from './scenes/world/WorldScene';

export type OutdoorVariant = 'academy-outside' | 'tavern-outside' | 'coworking-outside';

type VariantSpec = {
  readonly sceneClass: new () => Phaser.Scene;
  readonly sceneKey: string;
  readonly bounds: { readonly width: number; readonly height: number };
  readonly transitionName: string;
  readonly transitionImage: string;
};

const VARIANT_MAP: Record<OutdoorVariant, VariantSpec> = {
  'academy-outside': {
    sceneClass: AcademyOutsideScene,
    sceneKey: ACADEMY_OUTSIDE_SCENE_KEY,
    bounds: academyOutsideCameraConfig.bounds,
    transitionName: 'Academy Grounds',
    transitionImage: '/worlds/academy-2508x2508.png',
  },
  'tavern-outside': {
    sceneClass: TavernOutsideScene,
    sceneKey: TAVERN_OUTSIDE_SCENE_KEY,
    bounds: tavernOutsideCameraConfig.bounds,
    transitionName: 'Tavern Grounds',
    transitionImage: '/worlds/tavernoutside-2508x2508.png',
  },
  'coworking-outside': {
    sceneClass: CoworkingOutsideScene,
    sceneKey: COWORKING_OUTSIDE_SCENE_KEY,
    bounds: coworkingOutsideCameraConfig.bounds,
    transitionName: 'Coworking Grounds',
    transitionImage: '/worlds/coworkingoutside-2806x2242.png',
  },
};

type SessionFetch =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ready';
      member: SceneMember;
      role: 'member' | 'creator' | 'admin';
    };

async function fetchSession(): Promise<SessionFetch> {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError || !session) {
    return { status: 'error', message: sessionError?.message ?? 'Not signed in.' };
  }
  const { data, error } = await supabase
    .from('memberships')
    .select('avatar_id, display_name, realm_id, role, xp')
    .eq('member_id', session.user.id)
    .maybeSingle();
  if (error) return { status: 'error', message: error.message };
  if (!data?.avatar_id) return { status: 'error', message: 'No avatar selected.' };
  if (!isAvatarId(data.avatar_id)) {
    return { status: 'error', message: `Invalid avatar_id "${data.avatar_id}".` };
  }
  if (!data.realm_id) {
    return { status: 'error', message: 'No realm for member.' };
  }
  const avatarId: AvatarId = data.avatar_id;
  const role =
    data.role === 'creator' || data.role === 'admin'
      ? (data.role as 'creator' | 'admin')
      : 'member';
  return {
    status: 'ready',
    member: {
      memberId: session.user.id,
      realmId: data.realm_id,
      avatarId,
      displayName: data.display_name ?? 'Player',
      xp: typeof data.xp === 'number' ? data.xp : 0,
    },
    role,
  };
}

export default function GameOutdoor({
  variant,
}: {
  readonly variant: OutdoorVariant;
}): React.JSX.Element {
  const spec = VARIANT_MAP[variant];
  const searchParams = useSearchParams();
  // `?from=<buildingId>` drops the avatar next to a specific door instead
  // of the default spawn. Tavern-outside + coworking-outside both use
  // this; academy-outside has one door so no per-door override.
  const spawnOverride = useMemo(() => {
    const from = searchParams.get('from');
    if (!from) return undefined;
    if (variant === 'tavern-outside') return TAVERN_OUTSIDE_DOOR_SPAWNS[from];
    if (variant === 'coworking-outside') return COWORKING_OUTSIDE_DOOR_SPAWNS[from];
    return undefined;
  }, [variant, searchParams]);

  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [fetchState, setFetchState] = useState<SessionFetch>({ status: 'loading' });
  const [preloadProgress, setPreloadProgress] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchSession().then((r) => {
      if (!cancelled) setFetchState(r);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (fetchState.status !== 'ready' || !containerRef.current || gameRef.current) return;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      backgroundColor: '#0b1220',
      pixelArt: true,
      physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
      scale: {
        mode: Phaser.Scale.RESIZE,
        width: spec.bounds.width,
        height: spec.bounds.height,
      },
      scene: [BootScene, spec.sceneClass],
    });

    game.registry.set(MEMBER_REGISTRY_KEY, fetchState.member);
    game.registry.set(NEXT_SCENE_KEY_REGISTRY_KEY, spec.sceneKey);
    if (spawnOverride) {
      game.registry.set(OUTDOOR_SPAWN_OVERRIDE_REGISTRY_KEY, spawnOverride);
    }
    game.registry.set(PROGRESS_CALLBACK_REGISTRY_KEY, (progress: number) => {
      setPreloadProgress(progress);
    });
    setPreloadProgress(0);
    gameRef.current = game;

    return () => {
      const g = gameRef.current;
      gameRef.current = null;
      if (g) g.destroy(true);
    };
  }, [fetchState, spec, spawnOverride]);

  if (fetchState.status === 'error') {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-2 bg-slate-900 text-slate-300">
        <p className="text-lg">Couldn&rsquo;t load the area.</p>
        <p className="text-sm text-slate-500">{fetchState.message}</p>
      </div>
    );
  }

  const sceneReady =
    fetchState.status === 'ready' && preloadProgress !== null && preloadProgress >= 1;

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#0b1220]">
      {fetchState.status === 'ready' && (
        <PlayerHud
          memberId={fetchState.member.memberId}
          displayName={fetchState.member.displayName}
          initialXp={fetchState.member.xp}
          location={spec.transitionName}
          role={fetchState.role}
          occupants={1}
          loaded={sceneReady}
        />
      )}
      <div className="relative flex-1">
        <div ref={containerRef} className="absolute inset-0" />
        <BuildingTransition
          ready={sceneReady}
          displayName={spec.transitionName}
          backgroundImage={spec.transitionImage}
        />
        <LevelUpBanner />
      </div>
    </div>
  );
}
