import { produce } from "immer";
import type { Action } from "./actions.ts";
import { shuffle } from "./rng.ts";
import {
  type CardInstance,
  type MatchSetup,
  type MatchState,
  OPENING_HAND_SIZE,
  type PlayerState,
} from "./state.ts";

export type ActionResult = { ok: true; state: MatchState } | { ok: false; error: string };

export function createMatch(setup: MatchSetup): MatchState {
  const players = setup.players.map((p, seat): PlayerState => {
    const cards: CardInstance[] = p.deck.map((cardId, i) => ({
      instanceId: `p${seat}-${i}`,
      cardId,
    }));
    // Each seat gets its own stream so one deck's size never affects the other's order.
    const deck = shuffle(cards, setup.seed + seat);
    const hand = deck.splice(0, OPENING_HAND_SIZE);
    return { id: p.id, deck, hand, board: [] };
  }) as [PlayerState, PlayerState];

  if (players[0].id === players[1].id) throw new Error("Players must have distinct ids");

  return {
    seed: setup.seed,
    players,
    activePlayer: players[0].id,
    turn: 1,
    status: "active",
    winner: null,
  };
}

/** Pure and deterministic: the same state and action always give the same result. */
export function applyAction(state: MatchState, action: Action): ActionResult {
  if (state.status !== "active") return { ok: false, error: "The match is over" };

  const [first, second] = state.players;
  if (action.player !== first.id && action.player !== second.id) {
    return { ok: false, error: "Unknown player" };
  }
  const playerIndex = action.player === first.id ? 0 : 1;
  const opponentIndex = playerIndex === 0 ? 1 : 0;

  if (action.type === "concede") {
    return {
      ok: true,
      state: produce(state, (draft) => {
        draft.status = "finished";
        draft.winner = draft.players[opponentIndex].id;
      }),
    };
  }

  if (state.activePlayer !== action.player) return { ok: false, error: "Not your turn" };

  if (action.type === "playCard") {
    const handIndex = state.players[playerIndex].hand.findIndex(
      (c) => c.instanceId === action.instanceId,
    );
    if (handIndex === -1) return { ok: false, error: "That card is not in your hand" };
    return {
      ok: true,
      state: produce(state, (draft) => {
        const player = draft.players[playerIndex];
        const [card] = player.hand.splice(handIndex, 1);
        if (card) player.board.push(card);
      }),
    };
  }

  // endTurn: pass priority, then the next player draws a card.
  return {
    ok: true,
    state: produce(state, (draft) => {
      const next = draft.players[opponentIndex];
      draft.activePlayer = next.id;
      draft.turn += 1;
      const drawn = next.deck.shift();
      if (drawn) next.hand.push(drawn);
    }),
  };
}

/** Rebuilds a match from its setup and action log. Stops at the first invalid action. */
export function replay(setup: MatchSetup, actions: readonly Action[]): MatchState {
  let state = createMatch(setup);
  for (const action of actions) {
    const result = applyAction(state, action);
    if (!result.ok) throw new Error(`Replay failed: ${result.error}`);
    state = result.state;
  }
  return state;
}
