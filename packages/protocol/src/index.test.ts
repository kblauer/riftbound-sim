import { describe, expect, it } from "vitest";
import { decodeClientMessage, decodeServerMessage, encode } from "./index.ts";

describe("protocol", () => {
  it("round-trips a client action", () => {
    const raw = encode({ type: "action", action: { type: "endTurn", player: "a" } });
    expect(decodeClientMessage(raw)).toEqual({
      type: "action",
      action: { type: "endTurn", player: "a" },
    });
  });

  it("rejects malformed input instead of throwing", () => {
    expect(decodeClientMessage("not json")).toBeNull();
    expect(
      decodeClientMessage(JSON.stringify({ type: "action", action: { type: "nope" } })),
    ).toBeNull();
    expect(decodeServerMessage(JSON.stringify({ type: "state" }))).toBeNull();
  });
});
