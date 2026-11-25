import type { PlayerView } from "@riftbound-sim/engine";
import { expose } from "comlink";
import { type BotLevel, chooseAction } from "./index.ts";

const api = {
  chooseAction(view: PlayerView, seed: number, level: BotLevel = "random") {
    return chooseAction(view, seed, level);
  },
};

export type BotWorkerApi = typeof api;

expose(api);
