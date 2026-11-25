# packages/ai

Bots for AI matches.

- `chooseAction(view, seed, level)` takes a `PlayerView`, never full match state, so bots
  cannot read hidden information. Search-based bots must sample possible opponent hands.
- Deterministic for a given view and seed; no `Math.random`.
- `worker.ts` exposes the bot through Comlink; `client.ts` starts the worker (browser only).
  Keep heavy search inside the worker.
- Only the `random` level exists. Planned: heuristic bot, then Monte Carlo Tree Search, with
  difficulty mapped to search budget.
