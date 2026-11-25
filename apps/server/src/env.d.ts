// Secrets are not in wrangler.jsonc, so `wrangler types` cannot see them. Declared optional
// because the server must still start (health, match sockets) before Supabase is configured.
interface SecretEnv {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}
interface Env extends SecretEnv {}
declare namespace Cloudflare {
  interface Env extends SecretEnv {}
}
