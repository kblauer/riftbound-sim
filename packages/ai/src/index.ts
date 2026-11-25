import { type Action, legalActions, type PlayerView } from "@riftbound-sim/engine";
import { uniformInt } from "pure-rand/distribution/uniformInt";
import { xoroshiro128plus } from "pure-rand/generator/xoroshiro128plus";

/** Difficulty levels. Only "random" exists so far; heuristic and tree-search bots come next. */
export type BotLevel = "random";

/**
 * Picks the bot's next action from what it is allowed to see. Bots get a
 * PlayerView, never the full match state, so they cannot cheat by reading
 * the opponent's hand. Returns null when the bot has nothing to do.
 */
export function chooseAction(
  view: PlayerView,
  seed: number,
  _level: BotLevel = "random",
): Action | null {
  // Conceding is always legal but never something the random bot should pick.
  const options = legalActions(view).filter((a) => a.type !== "concede");
  if (options.length === 0) return null;
  const rng = xoroshiro128plus(seed);
  return options[uniformInt(rng, 0, options.length - 1)] ?? null;
}
