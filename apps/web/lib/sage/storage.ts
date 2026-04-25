// localStorage persistence for the sage's conversation history.
// Caps total messages at HISTORY_CAP and per-message length at
// MESSAGE_CHAR_CAP so a chatty session can't blow out the storage
// quota.

const STORAGE_KEY = 'arcadia.sage.history';
const HISTORY_CAP = 30;
const MESSAGE_CHAR_CAP = 4_000;

export type SageMessage = {
  readonly role: 'user' | 'assistant';
  readonly content: string;
};

export function loadSageHistory(): readonly SageMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((m): m is SageMessage => isMessage(m)).slice(-HISTORY_CAP);
  } catch {
    return [];
  }
}

export function saveSageHistory(messages: readonly SageMessage[]): void {
  if (typeof window === 'undefined') return;
  try {
    const trimmed = messages
      .filter(isMessage)
      .map((m) => ({ role: m.role, content: m.content.slice(0, MESSAGE_CHAR_CAP) }))
      .slice(-HISTORY_CAP);
    if (trimmed.length === 0) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Storage quota / private mode — silently no-op.
  }
}

function isMessage(value: unknown): value is SageMessage {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as { role?: unknown; content?: unknown };
  if (obj.role !== 'user' && obj.role !== 'assistant') return false;
  if (typeof obj.content !== 'string') return false;
  return true;
}
