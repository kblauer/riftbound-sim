import { z } from "zod";

/**
 * PLACEHOLDER RULES. This models a minimal two-player card game (draw, play a
 * card to the board, end turn, concede) so the rest of the stack has something
 * real to run. The actual Riftbound rules replace this; the shape to keep is
 * the pure reducer: (state, action) -> state, with no I/O, clock, or globals.
 */

export const OPENING_HAND_SIZE = 4;

export const playerIdSchema = z.string().min(1);
export type PlayerId = z.infer<typeof playerIdSchema>;

/** One physical card in a match. `cardId` refers to a catalog `printing_id`. */
export const cardInstanceSchema = z.object({
  instanceId: z.string(),
  cardId: z.string(),
});
export type CardInstance = z.infer<typeof cardInstanceSchema>;

export interface PlayerState {
  id: PlayerId;
  deck: CardInstance[];
  hand: CardInstance[];
  board: CardInstance[];
}

export type MatchStatus = "active" | "finished";

export interface MatchState {
  seed: number;
  players: [PlayerState, PlayerState];
  activePlayer: PlayerId;
  turn: number;
  status: MatchStatus;
  winner: PlayerId | null;
}

export interface MatchSetup {
  seed: number;
  /** Seat order decides who goes first. Each deck is a list of catalog card ids. */
  players: [{ id: PlayerId; deck: readonly string[] }, { id: PlayerId; deck: readonly string[] }];
}

/** Stand-in deck used until deck building exists. Ids are not real catalog printings. */
export function placeholderDeck(size = 20): string[] {
  return Array.from({ length: size }, (_, i) => `placeholder-${i + 1}`);
}
