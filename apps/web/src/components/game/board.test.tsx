// @vitest-environment jsdom
import { createMatch, placeholderDeck, viewFor } from "@riftbound-sim/engine";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Board } from "./board.tsx";

afterEach(cleanup);

function setup(viewer: "a" | "b") {
  const state = createMatch({
    seed: 1,
    players: [
      { id: "a", deck: placeholderDeck() },
      { id: "b", deck: placeholderDeck() },
    ],
  });
  const onAction = vi.fn();
  render(<Board view={viewFor(state, viewer)} onAction={onAction} />);
  return { state, onAction };
}

describe("Board", () => {
  it("shows the player's hand face up and the opponent's hand face down", () => {
    const { state } = setup("a");
    expect(within(screen.getByTestId("hand")).getAllByTestId("card")).toHaveLength(
      state.players[0].hand.length,
    );
    expect(screen.getAllByTestId("card-back")).toHaveLength(state.players[1].hand.length);
  });

  it("sends an endTurn intent on the player's turn", async () => {
    const { onAction } = setup("a");
    await userEvent.click(screen.getByRole("button", { name: "End turn" }));
    expect(onAction).toHaveBeenCalledWith({ type: "endTurn", player: "a" });
  });

  it("disables ending the turn when it is the opponent's turn", () => {
    setup("b");
    expect(screen.getByRole("button", { name: "End turn" })).toHaveProperty("disabled", true);
    expect(screen.getByTestId("turn-status").textContent).toContain("Opponent's turn");
  });
});
