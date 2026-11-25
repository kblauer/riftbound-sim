import { type Remote, wrap } from "comlink";
import type { BotWorkerApi } from "./worker.ts";

export interface BotHandle {
  bot: Remote<BotWorkerApi>;
  terminate(): void;
}

/** Starts the bot in a Web Worker so search never blocks the UI thread. Browser only. */
export function createBotWorker(): BotHandle {
  const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
  return { bot: wrap<BotWorkerApi>(worker), terminate: () => worker.terminate() };
}
