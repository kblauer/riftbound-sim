# riftbound-sim

Web app for playing the Riftbound card game vs AI or PvP. Private test build for a few invited
users. Design and rationale: GitHub issue #1. Setup and deploy steps: `README.md`.

## Hard rules

- **Local database only.** All dev, test, seed, and migration work targets the local Supabase
  stack (`http://127.0.0.1:54321`, needs Docker). Never run `supabase link`, `supabase db push`,
  `pnpm db:seed -- --remote`, `wrangler deploy`, or point any env file at a hosted project
  unless the user specifically asks for that in the current request.
- **No card data or art in the repo.** Cards are seeded into Supabase from RiftHunt; images load
  by URL from RiftHunt's CDN.
- **Supabase is never on a hot path** (free-tier egress). Live matches use no Supabase traffic;
  browsers get cards from the match server's cached `/catalog` endpoints, not the `cards` table.
  Name columns in queries; no `select *`.
- **The engine is pure.** No I/O, clock, or randomness in `packages/engine`; randomness enters
  as a stored seed.
- **The server is the authority in PvP.** Clients send intents; the acting player is the
  authenticated user, never a message field.
- **Never commit secrets.** Env files are git-ignored; only `*.example` files are tracked.

## Layout

| Path                | Purpose                                              |
| ------------------- | ---------------------------------------------------- |
| `apps/web`          | Vite + React app (Vercel)                            |
| `apps/server`       | Cloudflare Worker + one Durable Object per match     |
| `packages/engine`   | Rules reducer shared by browser, bot, server         |
| `packages/ai`       | Bots, run in a Web Worker                            |
| `packages/protocol` | zod schemas for socket messages and the card catalog |
| `packages/db`       | Supabase types, card seed script                     |
| `supabase`          | Migrations, RLS, local config                        |

Packages are consumed as TypeScript source (`exports` points at `src/index.ts`); there is no
package build step. Relative imports include the `.ts` extension.

## Commands

- `pnpm dev` — web (5173) + match server (8787)
- `pnpm check` — Biome + typecheck; `pnpm format` to fix
- `pnpm test` — unit tests; `pnpm e2e` — Playwright
- `pnpm db:start` / `db:reset` / `db:types` / `db:seed` — local Supabase only

Run `pnpm check && pnpm test` before calling work done. Run `pnpm build` first on a fresh
checkout: it generates `apps/web/src/routeTree.gen.ts`, which typecheck needs.

## Conventions

- pnpm enforces a minimum release age and blocks dependency build scripts. Do not add
  `minimumReleaseAgeExclude` entries or new `allowBuilds` entries; pick a slightly older version
  or ask.
- TypeScript is strict with `noUncheckedIndexedAccess`. Biome formats (2 spaces, 100 columns).
- Game rules are currently a placeholder (draw, play, end turn, concede).
