import { Hono } from "hono";
import { routePartykitRequest } from "partyserver";
import { allowedOrigins, verifyAccessToken } from "./auth.ts";
import { catalog } from "./catalog.ts";
import { USER_ID_HEADER } from "./match.ts";

export { Match } from "./match.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const app = new Hono<{ Bindings: Env }>();

app.get("/health", (c) => c.json({ ok: true }));
app.route("/catalog", catalog);
app.onError((error, c) => {
  console.error(error);
  return c.json({ error: "Internal error" }, 500);
});

/**
 * Match sockets: `/parties/match/{matchId}?token={supabase access token}`.
 * Browsers cannot set headers on a WebSocket, so the token travels in the query string.
 * It is verified here, before the Durable Object is reached, and the verified user id is
 * passed on in a header that clients cannot set themselves.
 */
async function handleMatchRequest(request: Request, env: Env): Promise<Response> {
  const response = await routePartykitRequest(request, env, {
    onBeforeConnect: async (req, lobby) => {
      const origin = req.headers.get("Origin");
      if (!origin || !allowedOrigins(env).includes(origin)) {
        return new Response("Origin not allowed", { status: 403 });
      }
      if (!UUID.test(lobby.name)) return new Response("Invalid match id", { status: 400 });
      if (!env.SUPABASE_URL) return new Response("Server auth is not configured", { status: 503 });

      const token = new URL(req.url).searchParams.get("token");
      const user = token ? await verifyAccessToken(token, env.SUPABASE_URL) : null;
      if (!user) return new Response("Unauthenticated", { status: 401 });

      const headers = new Headers(req.headers);
      headers.set(USER_ID_HEADER, user.userId);
      return new Request(req, { headers });
    },
    // Matches are reachable over WebSocket only; plain HTTP to a match is refused.
    onBeforeRequest: () => new Response("Not found", { status: 404 }),
  });
  return response ?? new Response("Not found", { status: 404 });
}

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Response | Promise<Response> {
    // Handled outside Hono: WebSocket upgrade responses must be returned untouched.
    if (new URL(request.url).pathname.startsWith("/parties/")) {
      return handleMatchRequest(request, env);
    }
    return app.fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
