import { applyAction, createMatch, viewFor } from "@riftbound-sim/engine";
import { describe, expect, it } from "vitest";
import { chooseAction } from "./index.ts";

const deck = (p: string) => Array.from({ length: 10 }, (_, i) => `${p}${i}`);

describe("random bot", () => {
  it("only ever picks actions the engine accepts, and can finish its turn", () => {
    let state = createMatch({
      seed: 3,
      players: [
        { id: "bot", deck: deck("a") },
        { id: "human", deck: deck("b") },
      ],
    });
    for (let step = 0; step < 50 && state.activePlayer === "bot"; step++) {
      const action = chooseAction(viewFor(state, "bot"), step);
      if (!action) throw new Error("bot had no action on its own turn");
      const result = applyAction(state, action);
      if (!result.ok) throw new Error(result.error);
      state = result.state;
    }
    expect(state.activePlayer).toBe("human");
    expect(state.status).toBe("active");
  });

  it("does nothing when it is not its turn", () => {
    const state = createMatch({
      seed: 3,
      players: [
        { id: "human", deck: deck("a") },
        { id: "bot", deck: deck("b") },
      ],
    });
    expect(chooseAction(viewFor(state, "bot"), 1)).toBeNull();
  });
});
