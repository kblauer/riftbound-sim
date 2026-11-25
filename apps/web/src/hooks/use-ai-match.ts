import { type BotHandle, createBotWorker } from "@riftbound-sim/ai/client";
import {
  type Action,
  applyAction,
  createMatch,
  type MatchState,
  type PlayerView,
  placeholderDeck,
  viewFor,
} from "@riftbound-sim/engine";
import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";

export const HUMAN = "you";
export const BOT = "bot";

/** Pause before each bot move so the player can follow what it does. */
const BOT_MOVE_DELAY_MS = 600;

const randomSeed = () => crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;

function newMatch(deck: readonly string[]): MatchState {
  return createMatch({
    seed: randomSeed(),
    players: [
      { id: HUMAN, deck },
      { id: BOT, deck },
    ],
  });
}

interface LocalMatch {
  match: MatchState;
  error: string | null;
}

type Event = { type: "apply"; action: Action } | { type: "restart"; match: MatchState };

function reduce(current: LocalMatch, event: Event): LocalMatch {
  if (event.type === "restart") return { match: event.match, error: null };
  const result = applyAction(current.match, event.action);
  return result.ok ? { match: result.state, error: null } : { ...current, error: result.error };
}

const DEFAULT_DECK = placeholderDeck();

/**
 * A match against the bot, run entirely in the browser: the engine holds the full state
 * here and the bot thinks in a Web Worker. No server or sign-in involved.
 */
export function useAiMatch(deck: readonly string[] = DEFAULT_DECK) {
  const [{ match, error }, dispatch] = useReducer(reduce, deck, (d) => ({
    match: newMatch(d),
    error: null,
  }));

  const botRef = useRef<BotHandle | null>(null);
  useEffect(() => {
    const handle = createBotWorker();
    botRef.current = handle;
    return () => {
      botRef.current = null;
      handle.terminate();
    };
  }, []);

  useEffect(() => {
    if (match.status !== "active" || match.activePlayer !== BOT) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      // The bot only ever receives its own view, never the full state.
      const action = await botRef.current?.bot.chooseAction(viewFor(match, BOT), randomSeed());
      if (!cancelled && action) dispatch({ type: "apply", action });
    }, BOT_MOVE_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [match]);

  const view: PlayerView = useMemo(() => viewFor(match, HUMAN), [match]);
  const act = useCallback((action: Action) => dispatch({ type: "apply", action }), []);
  const restart = useCallback(() => dispatch({ type: "restart", match: newMatch(deck) }), [deck]);

  return { view, act, error, restart };
}
