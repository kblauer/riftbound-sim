# supabase

Schema, Row Level Security, and local stack config.

- **Local only.** Use `pnpm db:start`, `pnpm db:reset`, and `pnpm db:types`. Never run
  `supabase link`, `db push`, or any command with `--linked` / `--db-url` unless the user
  specifically asks.
- **Migrations:** add a new timestamped file in `migrations/`; do not edit one that has been
  applied to a hosted project. After changing schema run `pnpm db:reset && pnpm db:types`.
- **Access model:** every table has RLS enabled. `cards`, `catalog_meta`, and `allowed_users`
  have no policies on purpose (service role only). Browsers may touch only `profiles`, `decks`,
  and their own `matches` / `match_replays`. Use `(select auth.uid())` in policies.
- **Sign-up allowlist:** `public.hook_restrict_signup` runs as the Auth "before user created"
  hook (enabled in `config.jsonc`). Emails in `allowed_users` are stored lowercase.
- **Config:** `config.jsonc` is the CLI-generated file with project edits marked
  `riftbound-sim:`. Google OAuth credentials go in `supabase/.env` (git-ignored).
