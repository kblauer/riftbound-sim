import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  type Action,
  applyAction,
  createMatch,
  legalActions,
  type MatchSetup,
  type MatchState,
  OPENING_HAND_SIZE,
  replay,
  viewFor,
} from "./index.ts";

const deck = (prefix: string, size = 10) => Array.from({ length: size }, (_, i) => `${prefix}${i}`);

const setup = (seed = 1): MatchSetup => ({
  seed,
  players: [
    { id: "alice", deck: deck("a") },
    { id: "bob", deck: deck("b") },
  ],
});

const totalCards = (state: MatchState) =>
  state.players.reduce((n, p) => n + p.deck.length + p.hand.length + p.board.length, 0);

function must(state: MatchState, action: Action): MatchState {
  const result = applyAction(state, action);
  if (!result.ok) throw new Error(result.error);
  return result.state;
}

describe("createMatch", () => {
  it("deals opening hands and starts with the first seat", () => {
    const state = createMatch(setup());
    expect(state.activePlayer).toBe("alice");
    for (const player of state.players) {
      expect(player.hand).toHaveLength(OPENING_HAND_SIZE);
      expect(player.deck).toHaveLength(10 - OPENING_HAND_SIZE);
    }
  });

  it("is deterministic for a seed and varies between seeds", () => {
    expect(createMatch(setup(7))).toEqual(createMatch(setup(7)));
    expect(createMatch(setup(7)).players[0].hand).not.toEqual(
      createMatch(setup(8)).players[0].hand,
    );
  });
});

describe("applyAction", () => {
  it("moves a played card from hand to board", () => {
    const state = createMatch(setup());
    const card = state.players[0].hand[0];
    if (!card) throw new Error("expected a card in hand");
    const next = must(state, { type: "playCard", player: "alice", instanceId: card.instanceId });
    expect(next.players[0].board).toEqual([card]);
    expect(next.players[0].hand).toHaveLength(OPENING_HAND_SIZE - 1);
  });

  it("rejects moves out of turn and cards not in hand", () => {
    const state = createMatch(setup());
    expect(applyAction(state, { type: "endTurn", player: "bob" }).ok).toBe(false);
    expect(applyAction(state, { type: "playCard", player: "alice", instanceId: "nope" }).ok).toBe(
      false,
    );
  });

  it("passes the turn and draws for the next player", () => {
    const next = must(createMatch(setup()), { type: "endTurn", player: "alice" });
    expect(next.activePlayer).toBe("bob");
    expect(next.players[1].hand).toHaveLength(OPENING_HAND_SIZE + 1);
  });

  it("ends the match on concede and rejects further actions", () => {
    const done = must(createMatch(setup()), { type: "concede", player: "bob" });
    expect(done.status).toBe("finished");
    expect(done.winner).toBe("alice");
    expect(applyAction(done, { type: "endTurn", player: "alice" }).ok).toBe(false);
  });

  it("does not mutate the input state", () => {
    const state = createMatch(setup());
    const snapshot = JSON.parse(JSON.stringify(state));
    must(state, { type: "endTurn", player: "alice" });
    expect(state).toEqual(snapshot);
  });
});

describe("viewFor", () => {
  it("hides the opponent's hand and both decks", () => {
    const state = createMatch(setup());
    const view = viewFor(state, "alice");
    expect(view.you.hand).toEqual(state.players[0].hand);
    expect(view.opponent.handCount).toBe(OPENING_HAND_SIZE);
    const serialized = JSON.stringify(view);
    for (const hidden of [...state.players[1].hand, ...state.players[0].deck]) {
      expect(serialized).not.toContain(`"${hidden.instanceId}"`);
    }
  });
});

describe("invariants", () => {
  it("conserves cards and replays identically for any sequence of legal actions", () => {
    fc.assert(
      fc.property(fc.integer(), fc.array(fc.nat(), { maxLength: 60 }), (seed, picks) => {
        const matchSetup = setup(seed);
        let state = createMatch(matchSetup);
        const log: Action[] = [];
        for (const pick of picks) {
          const options = legalActions(viewFor(state, state.activePlayer));
          const action = options[pick % options.length];
          if (!action) break;
          state = must(state, action);
          log.push(action);
          expect(totalCards(state)).toBe(20);
        }
        expect(replay(matchSetup, log)).toEqual(state);
      }),
    );
  });
});
