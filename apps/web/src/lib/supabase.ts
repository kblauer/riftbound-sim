import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * Null when Supabase is not configured, so the app still runs for local play against
 * the AI. Anything that needs sign-in must handle the null case.
 *
 * Egress note (issue #1): use this client for the signed-in user's own data only
 * (profile, decks, match history). The card catalog comes from the match server.
 */
export const supabase = url && key ? createClient(url, key) : null;

export const SERVER_URL = import.meta.env.VITE_SERVER_URL?.replace(/\/$/, "") || null;
