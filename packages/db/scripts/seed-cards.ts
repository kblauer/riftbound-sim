/**
 * Refreshes the `cards` table from RiftHunt. Run at most once a day: `pnpm db:seed`.
 * Use `pnpm --filter @riftbound-sim/db seed:dry-run` to fetch and validate without writing.
 *
 * Writes only to the local Supabase stack. Seeding a hosted project needs an explicit
 * `--remote` flag, so a stray .env value cannot send local work to a real database.
 *
 * RiftHunt usage rules this script follows (see issue #1):
 *   - one bulk fetch per run, plus one paged search per set (no per-card crawling)
 *   - about a second between requests
 *   - a User-Agent that identifies the project
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/database.types.ts";
import { isLocalSupabaseUrl } from "../src/local.ts";
import {
  bulkFileSchema,
  type CardRow,
  catalogVersion,
  type SearchCard,
  searchPageSchema,
  toCardRow,
} from "../src/rifthunt.ts";

const API = "https://api.rifthunt.com";
const USER_AGENT = process.env.RIFTHUNT_USER_AGENT ?? "riftbound-sim (private test project)";
const REQUEST_GAP_MS = 1000;
const UPSERT_CHUNK = 500;
const PAGE = 1000;
const dryRun = process.argv.includes("--dry-run");
const allowRemote = process.argv.includes("--remote");

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function getJson(pathOrUrl: string): Promise<unknown> {
  const response = await fetch(new URL(pathOrUrl, API), {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`RiftHunt ${response.status} for ${pathOrUrl}`);
  return response.json();
}

/** Every printing in a set as full card objects. `unique=prints` stops alternate art being merged. */
async function searchSet(setCode: string): Promise<SearchCard[]> {
  const cards: SearchCard[] = [];
  let next: string | null = `/cards/search?q=${encodeURIComponent(`set:${setCode}`)}&unique=prints`;
  while (next) {
    await sleep(REQUEST_GAP_MS);
    const page = searchPageSchema.parse(await getJson(next));
    cards.push(...page.data);
    next = page.has_more ? page.next_page : null;
  }
  return cards;
}

async function buildRows(): Promise<CardRow[]> {
  console.log("Fetching bulk card file...");
  const bulk = bulkFileSchema.parse(await getJson("/bulk/cards"));
  console.log(
    `  ${bulk.cards.length} printings in ${bulk.sets.length} sets (fetched ${bulk.fetched})`,
  );

  const searchById = new Map<string, SearchCard>();
  for (const set of bulk.sets) {
    const code = set.id.toLowerCase();
    const cards = await searchSet(code);
    for (const card of cards) searchById.set(card.printing_id, card);
    console.log(`  ${code}: ${cards.length} of ${set.count} printings from search`);
  }

  const rows = bulk.cards.map((card) => toCardRow(card, searchById.get(card.printing_id)));
  const missingImages = rows.filter((r) => !r.image_small).length;
  if (missingImages > 0) {
    console.warn(
      `  ${missingImages} printings have no sized images and will use the bulk image URL`,
    );
  }
  return rows;
}

/** Checked before any network call, so a wrong target fails fast. */
function resolveTarget(): { url: string; key: string } {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see .env.example)");
  }
  if (!isLocalSupabaseUrl(url) && !allowRemote) {
    throw new Error(
      `Refusing to seed ${new URL(url).host}: it is not the local database. Pass --remote to seed a hosted project on purpose.`,
    );
  }
  console.log(
    `Target database: ${new URL(url).host}${isLocalSupabaseUrl(url) ? " (local)" : " (REMOTE)"}`,
  );
  return { url, key };
}

async function writeRows(
  rows: CardRow[],
  version: string,
  target: { url: string; key: string },
): Promise<void> {
  const { url, key } = target;
  const supabase = createClient<Database>(url, key, { auth: { persistSession: false } });

  // Read only ids and hashes, then write only what changed, to keep egress small.
  const existing = new Map<string, string>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("cards")
      .select("printing_id, content_hash")
      .order("printing_id")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    for (const row of data) existing.set(row.printing_id, row.content_hash);
    if (data.length < PAGE) break;
  }

  const changed = rows.filter((r) => existing.get(r.printing_id) !== r.content_hash);
  const current = new Set(rows.map((r) => r.printing_id));
  const removed = [...existing.keys()].filter((id) => !current.has(id));

  const now = new Date().toISOString();
  for (let i = 0; i < changed.length; i += UPSERT_CHUNK) {
    const chunk = changed.slice(i, i + UPSERT_CHUNK).map((r) => ({ ...r, updated_at: now }));
    const { error } = await supabase.from("cards").upsert(chunk);
    if (error) throw error;
  }
  console.log(
    `Upserted ${changed.length} changed rows (${rows.length - changed.length} unchanged).`,
  );

  if (removed.length > 0) {
    // Not deleted automatically: saved decks may still reference these printings.
    console.warn(
      `${removed.length} printings are no longer upstream: ${removed.slice(0, 5).join(", ")}...`,
    );
  }

  // The version covers what is actually in the table, including rows kept after upstream removal.
  const { data: meta, error: metaError } = await supabase
    .from("catalog_meta")
    .select("version")
    .eq("id", true)
    .single();
  if (metaError) throw metaError;

  if (changed.length === 0 && meta.version) {
    console.log(`Catalog unchanged; version stays ${meta.version}.`);
    return;
  }
  const { error } = await supabase
    .from("catalog_meta")
    .update({ version, updated_at: now })
    .eq("id", true);
  if (error) throw error;
  console.log(`Catalog version is now ${version}.`);
}

const target = dryRun ? null : resolveTarget();
const rows = await buildRows();
const version = catalogVersion(rows);

if (!target) {
  console.log(`Dry run: ${rows.length} rows validated, catalog version would be ${version}.`);
  console.log(JSON.stringify(rows[0], null, 2));
} else {
  await writeRows(rows, version, target);
}
