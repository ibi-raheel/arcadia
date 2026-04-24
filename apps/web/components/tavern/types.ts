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
  readonly display_name: string | null;
  readonly avatar_id: string | null;
  readonly xp: number;
  readonly level: number;
};

/** Emoji palette offered in the reaction picker. Six covers the common set. */
export const REACTION_EMOJI = ['🔥', '❤️', '😂', '👀', '🎉', '💯'] as const;
export type ReactionEmoji = (typeof REACTION_EMOJI)[number];

/** Structural subset of Phaser.Game that TavernFeatures bridges into
 *  via the game-events bus. Typed here so TavernFeatures doesn't have
 *  to import Phaser (and drag it into the client bundle). */
export type PhaserGameLike = {
  readonly events: {
    on: (event: string, listener: (...args: unknown[]) => void) => unknown;
    off: (event: string, listener: (...args: unknown[]) => void) => unknown;
  };
};
