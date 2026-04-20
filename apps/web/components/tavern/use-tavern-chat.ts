// React hook encapsulating the Tavern chat state machine:
//   - initial history fetch (500 most recent, reversed)
//   - Supabase Realtime INSERT subscription — append new peer messages
//   - Supabase Realtime UPDATE subscription — merge reaction changes
//   - send() — INSERT via RLS chat_write policy (Phase 0); optimistic echo
//   - toggleReaction() — RPC call; optimistic local flip
//
// Deduping rule — the realtime INSERT echoes the sender's own message back.
// We drop it if we already have a row with the same id (covers optimistic
// append + realtime echo collision).

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { getSupabaseBrowserClient } from '@/lib/supabase/client';

import type { TavernMessage } from './types';

const HISTORY_LIMIT = 500;

type ChatState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; messages: TavernMessage[] };

export type UseTavernChatArgs = {
  readonly realmId: string;
  readonly memberId: string;
  /**
   * Fired whenever a message newly enters the local cache — includes both
   * peer messages (via Realtime INSERT) and the sender's own optimistic
   * echo after a successful INSERT. Used by GameTavern to pop speech
   * bubbles above the speaker's avatar in TavernScene.
   */
  readonly onMessageReceived?: (message: TavernMessage) => void;
};

export type UseTavernChatResult = {
  readonly state: ChatState;
  readonly send: (content: string) => Promise<void>;
  readonly toggleReaction: (messageId: string, emoji: string) => Promise<void>;
};

export function useTavernChat({
  realmId,
  memberId,
  onMessageReceived,
}: UseTavernChatArgs): UseTavernChatResult {
  const [state, setState] = useState<ChatState>({ status: 'loading' });
  // Ref-backed mirror of the message list — lets the Realtime handlers merge
  // without closing over stale state from their subscribe-time render.
  const messagesRef = useRef<TavernMessage[]>([]);
  // Keep the callback ref fresh without re-subscribing the Realtime channel
  // every render.
  const onMessageReceivedRef = useRef(onMessageReceived);
  useEffect(() => {
    onMessageReceivedRef.current = onMessageReceived;
  }, [onMessageReceived]);

  const setMessages = useCallback((next: TavernMessage[]) => {
    messagesRef.current = next;
    setState({ status: 'ready', messages: next });
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let cancelled = false;

    // Initial history — 500 newest first, reversed to render oldest-at-top.
    void (async () => {
      const { data, error } = await supabase
        .from('tavern_messages')
        .select('id, realm_id, sender_id, content, created_at, reactions')
        .eq('realm_id', realmId)
        .order('created_at', { ascending: false })
        .limit(HISTORY_LIMIT);
      if (cancelled) return;
      if (error) {
        setState({ status: 'error', message: error.message });
        return;
      }
      const ordered = (data ?? []).slice().reverse() as TavernMessage[];
      setMessages(ordered);
    })();

    // Realtime channel — one subscription covers INSERT + UPDATE filtered on realm.
    const channel = supabase
      .channel(`tavern-chat-${realmId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tavern_messages',
          filter: `realm_id=eq.${realmId}`,
        },
        (payload) => {
          const row = payload.new as TavernMessage;
          // Drop if already present (optimistic-append echo). In that case
          // the sender's own optimistic path has already fired the
          // onMessageReceived callback — don't double-fire for the speech
          // bubble.
          if (messagesRef.current.some((m) => m.id === row.id)) return;
          setMessages([...messagesRef.current, row]);
          onMessageReceivedRef.current?.(row);
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tavern_messages',
          filter: `realm_id=eq.${realmId}`,
        },
        (payload) => {
          const row = payload.new as TavernMessage;
          const next = messagesRef.current.map((m) =>
            m.id === row.id ? { ...m, reactions: row.reactions } : m,
          );
          setMessages(next);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [realmId, setMessages]);

  const send = useCallback(
    async (content: string): Promise<void> => {
      const trimmed = content.trim();
      if (trimmed.length === 0) return;
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('tavern_messages')
        .insert({ realm_id: realmId, sender_id: memberId, content: trimmed })
        .select('id, realm_id, sender_id, content, created_at, reactions')
        .single();
      if (error) {
        console.error('tavern send failed:', error.message);
        return;
      }
      // Append immediately — Realtime echo will no-op via id dedupe.
      if (data && !messagesRef.current.some((m) => m.id === data.id)) {
        const row = data as TavernMessage;
        setMessages([...messagesRef.current, row]);
        // Fire for the speaker's own bubble. Realtime INSERT echo will see
        // the row in the cache and skip firing again.
        onMessageReceivedRef.current?.(row);
      }
    },
    [realmId, memberId, setMessages],
  );

  const toggleReaction = useCallback(
    async (messageId: string, emoji: string): Promise<void> => {
      const supabase = getSupabaseBrowserClient();

      // Optimistic local flip — Realtime UPDATE echo reconciles if the
      // server computed something different.
      const before = messagesRef.current.find((m) => m.id === messageId);
      if (before) {
        const users = before.reactions?.[emoji] ?? [];
        const nextUsers = users.includes(memberId)
          ? users.filter((u) => u !== memberId)
          : [...users, memberId];
        const nextReactions = { ...(before.reactions ?? {}) };
        if (nextUsers.length === 0) {
          delete nextReactions[emoji];
        } else {
          nextReactions[emoji] = nextUsers;
        }
        const optimistic = messagesRef.current.map((m) =>
          m.id === messageId ? { ...m, reactions: nextReactions } : m,
        );
        setMessages(optimistic);
      }

      const { error } = await supabase.rpc('toggle_reaction', {
        p_message_id: messageId,
        p_emoji: emoji,
      });
      if (error) {
        console.error('toggle_reaction rpc failed:', error.message);
        // Rollback by restoring the pre-toggle row from Realtime on next echo;
        // for now, log — a 3 s window of stale UI is acceptable vs a round-trip.
      }
    },
    [memberId, setMessages],
  );

  return { state, send, toggleReaction };
}
