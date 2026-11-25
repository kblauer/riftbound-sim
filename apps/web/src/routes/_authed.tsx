import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getSession } from "@/lib/auth";

/**
 * Layout for routes that need a signed-in user. The underscore prefix means it adds no
 * URL segment: `_authed/pvp` is served at `/pvp`. This check is a convenience for the UI;
 * the real enforcement is the match server's token check and Supabase RLS.
 */
export const Route = createFileRoute("/_authed")({
  beforeLoad: async () => {
    if (!(await getSession())) throw redirect({ to: "/login" });
  },
  component: Outlet,
});
