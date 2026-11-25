import { CATALOG_COLUMNS } from "@riftbound-sim/db";
import type { Catalog, CatalogVersion } from "@riftbound-sim/protocol";
import { Hono } from "hono";
import { cache } from "hono/cache";
import { cors } from "hono/cors";
import { serviceClient } from "./supabase.ts";

/**
 * Card catalog endpoints. These exist to keep Supabase egress low (issue #1):
 * the full card list leaves Supabase once per catalog version, then Cloudflare's
 * edge cache and each browser's IndexedDB serve it from there.
 *
 * Card data is not secret, so these routes need no sign-in and allow any origin,
 * which also keeps cached responses identical for every caller.
 */

const PAGE = 1000; // PostgREST returns at most 1000 rows per request by default.

export const catalog = new Hono<{ Bindings: Env }>();

catalog.use("*", cors({ origin: "*" }));

async function currentVersion(env: Env): Promise<string | null> {
  const supabase = serviceClient(env);
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("catalog_meta")
    .select("version")
    .eq("id", true)
    .single();
  if (error) throw new Error(`catalog_meta read failed: ${error.message}`);
  return data.version;
}

// Short cache: a new catalog version is picked up within five minutes. "No catalog yet"
// (unseeded or Supabase not configured) is a 404, which is never cached, so the first
// seed shows up immediately.
catalog.get(
  "/version",
  cache({ cacheName: "catalog", cacheControl: "public, max-age=300" }),
  async (c) => {
    const version = await currentVersion(c.env);
    return c.json({ version } satisfies CatalogVersion, version ? 200 : 404);
  },
);

// The URL contains the version, so the response never changes and can be cached forever.
// Only 200s are cached, so an unknown version cannot poison the cache.
catalog.get(
  "/:version",
  cache({ cacheName: "catalog", cacheControl: "public, max-age=31536000, immutable" }),
  async (c) => {
    const supabase = serviceClient(c.env);
    const version = await currentVersion(c.env);
    if (!supabase || !version || version !== c.req.param("version")) {
      return c.json({ error: "Unknown catalog version" }, 404);
    }

    const cards: Catalog["cards"] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from("cards")
        .select(CATALOG_COLUMNS)
        .order("printing_id")
        .range(from, from + PAGE - 1);
      if (error) throw new Error(`cards read failed: ${error.message}`);
      cards.push(...data);
      if (data.length < PAGE) break;
    }
    return c.json({ version, cards } satisfies Catalog);
  },
);
