import { z } from "zod";
import type { Action } from "./actions.ts";
import { cardInstanceSchema, type MatchState, type PlayerId, playerIdSchema } from "./state.ts";

/**
 * What one player is allowed to know. The opponent's hand and both decks are
 * reduced to counts, so a view is safe to send over the network.
 */
export const playerViewSchema = z.object({
  you: z.object({
    id: playerIdSchema,
    hand: z.array(cardInstanceSchema),
    board: z.array(cardInstanceSchema),
    deckCount: z.number().int(),
  }),
  opponent: z.object({
    id: playerIdSchema,
    handCount: z.number().int(),
    board: z.array(cardInstanceSchema),
    deckCount: z.number().int(),
  }),
  activePlayer: playerIdSchema,
  turn: z.number().int(),
  status: z.enum(["active", "finished"]),
  winner: playerIdSchema.nullable(),
});
export type PlayerView = z.infer<typeof playerViewSchema>;

export function viewFor(state: MatchState, playerId: PlayerId): PlayerView {
  const you = state.players.find((p) => p.id === playerId);
  const opponent = state.players.find((p) => p.id !== playerId);
  if (!you || !opponent) throw new Error(`Player ${playerId} is not in this match`);
  return {
    you: { id: you.id, hand: you.hand, board: you.board, deckCount: you.deck.length },
    opponent: {
      id: opponent.id,
      handCount: opponent.hand.length,
      board: opponent.board,
      deckCount: opponent.deck.length,
    },
    activePlayer: state.activePlayer,
    turn: state.turn,
    status: state.status,
    winner: state.winner,
  };
}

/** Every action the viewing player may take right now. Used by the UI and the bots. */
export function legalActions(view: PlayerView): Action[] {
  if (view.status !== "active") return [];
  const player = view.you.id;
  const actions: Action[] = [{ type: "concede", player }];
  if (view.activePlayer !== player) return actions;
  actions.push({ type: "endTurn", player });
  for (const card of view.you.hand) {
    actions.push({ type: "playCard", player, instanceId: card.instanceId });
  }
  return actions;
}
