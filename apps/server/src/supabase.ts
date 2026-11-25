import type { Database } from "@riftbound-sim/db";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Service-role client. Server only: this key bypasses Row Level Security. */
export function serviceClient(env: Env): SupabaseClient<Database> | null {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
