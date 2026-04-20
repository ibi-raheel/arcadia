// Shared types for the Tavern chat + leaderboard panels.

export type TavernMessage = {
  readonly id: string;
  readonly realm_id: string;
  readonly sender_id: string;
  readonly content: string;
  readonly created_at: string;
  readonly reactions: Record<string, string[]>; // emoji → list of member uuids
};

export type LeaderboardEntry = {
  readonly member_id: string;
  readonly display_name: string;
  readonly xp: number;
  readonly level: number;
};

/** Emoji palette offered in the reaction picker. Six covers the common set. */
export const REACTION_EMOJI = ['🔥', '❤️', '😂', '👀', '🎉', '💯'] as const;
export type ReactionEmoji = (typeof REACTION_EMOJI)[number];
