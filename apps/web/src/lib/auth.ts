import type { Session } from "@supabase/supabase-js";
import { create } from "zustand";
import { supabase } from "./supabase.ts";

interface AuthState {
  session: Session | null;
  /** False until the stored session has been read, so the UI does not flash "signed out". */
  ready: boolean;
}

export const useAuth = create<AuthState>(() => ({ session: null, ready: !supabase }));

if (supabase) {
  // Fires once with the stored session on load, then on every sign-in, sign-out, and refresh.
  supabase.auth.onAuthStateChange((_event, session) => {
    useAuth.setState({ session, ready: true });
  });
}

/** Reads the session from local storage. Does not call the Supabase Auth API. */
export async function getSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function signInWithGoogle(): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  await supabase?.auth.signOut();
}
