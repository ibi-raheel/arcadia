// Mirrors GameWorld for /tavern. Fetches session + member, opens the
// `tavern-realm1` Colyseus room, mounts Phaser with [BootScene, TavernScene].
// Emits MSG.LEAVE_BUILDING before routing back to /world so the game-server
// gets a clean transition log.

'use client';

import * as Phaser from 'phaser';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { getSupabaseBrowserClient } from '@/lib/supabase/client';

import { MSG } from '@arcadia/shared';

import { ChatPanel } from '@/components/tavern/ChatPanel';
import { LeaderboardPanel } from '@/components/tavern/LeaderboardPanel';

import { BuildingTransition } from './BuildingTransition';
import { connectToRoom, type ColyseusConnection } from './net/colyseus-client';
import {
  TAVERN_CHAT_BLUR_EVENT,
  TAVERN_CHAT_FOCUS_EVENT,
  TAVERN_SPEECH_EVENT,
} from './scenes/tavern/TavernScene';
import { BootScene } from './scenes/boot/BootScene';
import {
  NEXT_SCENE_KEY_REGISTRY_KEY,
  PROGRESS_CALLBACK_REGISTRY_KEY,
} from './scenes/boot/asset-manifest';
import { isAvatarId, type AvatarId } from './scenes/shared/avatar-palette';
import { TavernScene, TAVERN_SCENE_KEY } from './scenes/tavern/TavernScene';
import { tavernCameraConfig } from './scenes/tavern/camera.config';
import {
  COLYSEUS_CONNECTION_REGISTRY_KEY,
  MEMBER_REGISTRY_KEY,
  type SceneMember,
} from './scenes/world/WorldScene';

const COLYSEUS_ENDPOINT = process.env.NEXT_PUBLIC_COLYSEUS_URL ?? '';

type SessionFetch =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; member: SceneMember; accessToken: string };

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
    .select('avatar_id, display_name, realm_id')
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
  const displayName = data.display_name ?? 'Player';
  return {
    status: 'ready',
    member: {
      memberId: session.user.id,
      realmId: data.realm_id,
      avatarId,
      displayName,
    },
    accessToken: session.access_token,
  };
}

export default function GameTavern(): React.JSX.Element {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const connectionRef = useRef<ColyseusConnection | null>(null);
  const [fetchState, setFetchState] = useState<SessionFetch>({ status: 'loading' });
  const [connectError, setConnectError] = useState<string | null>(null);
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
    if (
      fetchState.status !== 'ready' ||
      !containerRef.current ||
      gameRef.current ||
      !COLYSEUS_ENDPOINT
    ) {
      if (fetchState.status === 'ready' && !COLYSEUS_ENDPOINT) {
        setConnectError('NEXT_PUBLIC_COLYSEUS_URL is not configured');
      }
      return;
    }

    let cancelled = false;

    (async () => {
      let connection: ColyseusConnection;
      try {
        connection = await connectToRoom({
          endpoint: COLYSEUS_ENDPOINT,
          roomName: 'tavern-realm1',
          accessToken: fetchState.accessToken,
          onReconnectFailed: (err) => {
            if (!cancelled) setConnectError(err.message);
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (!cancelled) setConnectError(message);
        return;
      }

      if (cancelled) {
        await connection.leave();
        return;
      }

      connectionRef.current = connection;

      const game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: containerRef.current!,
        backgroundColor: '#1f2937',
        pixelArt: true,
        physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
        scale: {
          mode: Phaser.Scale.RESIZE,
          width: tavernCameraConfig.bounds.width,
          height: tavernCameraConfig.bounds.height,
        },
        scene: [BootScene, TavernScene],
      });

      game.registry.set(MEMBER_REGISTRY_KEY, fetchState.member);
      game.registry.set(COLYSEUS_CONNECTION_REGISTRY_KEY, connection);
      game.registry.set(NEXT_SCENE_KEY_REGISTRY_KEY, TAVERN_SCENE_KEY);
      game.registry.set(PROGRESS_CALLBACK_REGISTRY_KEY, (progress: number) => {
        setPreloadProgress(progress);
      });
      setPreloadProgress(0);
      gameRef.current = game;
    })();

    return () => {
      cancelled = true;
      const game = gameRef.current;
      gameRef.current = null;
      if (game) game.destroy(true);
      const conn = connectionRef.current;
      connectionRef.current = null;
      if (conn) void conn.leave();
    };
  }, [fetchState]);

  const handleReturnToWorld = (): void => {
    connectionRef.current?.send(MSG.LEAVE_BUILDING, { building: 'tavern' });
    router.push('/world?from=tavern');
  };

  // Chat → scene bridge. TavernScene listens on `game.events` for
  // TAVERN_SPEECH_EVENT and pops a bubble above the avatar matching
  // `memberId`. Safe when gameRef hasn't populated yet — emit is a no-op
  // until Phaser mounts.
  const handleMessageReceived = useCallback(
    (msg: { id: string; sender_id: string; content: string }): void => {
      gameRef.current?.events.emit(TAVERN_SPEECH_EVENT, msg.sender_id, msg.content, msg.id);
    },
    [],
  );

  // Focus handoff — tell TavernScene to disable/enable its keyboard plugin
  // when the chat input gains/loses focus, so WASD types in the input
  // without also moving the avatar.
  const handleChatFocusChange = useCallback((focused: boolean): void => {
    gameRef.current?.events.emit(focused ? TAVERN_CHAT_FOCUS_EVENT : TAVERN_CHAT_BLUR_EVENT);
  }, []);

  if (fetchState.status === 'error' || connectError) {
    const message = fetchState.status === 'error' ? fetchState.message : connectError!;
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-2 bg-slate-900 text-slate-300">
        <p className="text-lg">Couldn&rsquo;t enter the Tavern.</p>
        <p className="text-sm text-slate-500">{message}</p>
      </div>
    );
  }

  const sceneReady =
    fetchState.status === 'ready' && preloadProgress !== null && preloadProgress >= 1;

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <div ref={containerRef} className="absolute inset-0" />
      <button
        type="button"
        onClick={handleReturnToWorld}
        className="absolute left-4 top-4 z-40 rounded bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-900 shadow transition hover:bg-white"
      >
        ← Return to World
      </button>
      {/* Week 8 overlays — chat bottom-right, leaderboard top-right. `fetchState`
          carries member + realm once ready; rendered conditionally so the
          panels don't start fetching while we're still authing. */}
      {fetchState.status === 'ready' && (
        <>
          <ChatPanel
            realmId={fetchState.member.realmId}
            memberId={fetchState.member.memberId}
            displayName={fetchState.member.displayName}
            onMessageReceived={handleMessageReceived}
            onFocusChange={handleChatFocusChange}
          />
          <LeaderboardPanel
            realmId={fetchState.member.realmId}
            memberId={fetchState.member.memberId}
          />
        </>
      )}
      <BuildingTransition building="tavern" ready={sceneReady} />
    </div>
  );
}
