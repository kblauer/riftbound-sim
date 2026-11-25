# packages/engine

The game rules as a pure reducer. Runs unchanged in the browser, the bot's Web Worker, and the
match Durable Object.

- **Purity is the contract.** `applyAction(state, action)` returns a new state or an error. No
  I/O, `Date`, `Math.random`, or module-level state. Randomness comes from the seed in
  `MatchSetup` via `rng.ts`. Breaking this breaks replays and reconnects.
- **State must be plain JSON** (it is stored and replayed). No classes, Maps, or Sets in state.
- **Hidden information:** `viewFor(state, player)` is the only thing that may leave the server
  or reach a bot. When adding state, decide what each player may see and update `view.ts` and
  its test.
- **Actions** are zod schemas in `actions.ts`; they double as network validation. Add the
  schema, the reducer case, and `legalActions` support together.
- **Current rules are a placeholder** (draw, play to board, end turn, concede). Card behaviour
  should be keyed on the catalog `oracle_id`; `cardId` on an instance is a `printing_id`.
- **Tests:** `reducer.test.ts` includes a property test (card conservation, replay equality).
  Keep it passing and extend the invariants as rules grow.
