import { createHash } from "node:crypto";
import { z } from "zod";
import type { Json } from "./database.types.ts";

/**
 * RiftHunt API shapes, limited to the fields the seed script stores. Both schemas are
 * validated on every run so an upstream shape change fails loudly instead of writing
 * bad rows. Field notes are in issue #1 ("Card data and images").
 */

/** A record in `GET /bulk/cards`. camelCase, capitalised values, Riot-CDN image URL. */
export const bulkCardSchema = z.object({
  printing_id: z.uuid(),
  oracle_id: z.uuid(),
  name: z.string(),
  type: z.string(),
  supertype: z.string().nullable(),
  domains: z.array(z.string()),
  energy: z.number().nullable(),
  power: z.number().nullable(),
  might: z.number().nullable(),
  text: z.string().nullable(),
  rich: z.string().nullable(),
  set: z.string(),
  num: z.number(),
  rarity: z.string(),
  variant: z.string().nullable(),
  orientation: z.string(),
  artist: z.string().nullable(),
  tags: z.array(z.string()),
  imgUrl: z.string(),
  imgBackUrl: z.string().nullable().optional(),
});
export type BulkCard = z.infer<typeof bulkCardSchema>;

export const bulkFileSchema = z.object({
  fetched: z.string(),
  sets: z.array(z.object({ id: z.string(), name: z.string(), count: z.number() })),
  cards: z.array(bulkCardSchema),
});

/** A card object from `GET /cards/search`. snake_case, with sized image URLs and keywords. */
export const searchCardSchema = z.object({
  printing_id: z.uuid(),
  collector_number: z.string(),
  keywords: z.array(z.string()),
  legalities: z.record(z.string(), z.unknown()).nullish(),
  images: z
    .object({
      small: z.string().optional(),
      normal: z.string().optional(),
      large: z.string().optional(),
      back: z.string().optional(),
    })
    .nullish(),
});
export type SearchCard = z.infer<typeof searchCardSchema>;

export const searchPageSchema = z.object({
  total_cards: z.number(),
  has_more: z.boolean(),
  next_page: z.string().nullable(),
  data: z.array(searchCardSchema),
});

/** A row of the `cards` table, minus `updated_at`. */
export interface CardRow {
  printing_id: string;
  oracle_id: string;
  name: string;
  type: string;
  supertype: string | null;
  domains: string[];
  energy: number | null;
  power: number | null;
  might: number | null;
  keywords: string[];
  tags: string[];
  rules_text: string | null;
  rules_html: string | null;
  set_code: string;
  collector_number: string;
  rarity: string | null;
  variant: string | null;
  orientation: string | null;
  artist: string | null;
  legalities: Json | null;
  image_small: string | null;
  image_normal: string | null;
  image_large: string | null;
  image_back: string | null;
  image_source: string | null;
  content_hash: string;
}

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

/**
 * Joins a bulk record with its search record. The bulk file is the base because it lists
 * every printing; search adds sized images, keywords, and legality. A printing missing
 * from search still gets a row and falls back to `image_source` (the bulk image URL).
 */
export function toCardRow(bulk: BulkCard, search: SearchCard | undefined): CardRow {
  const row: Omit<CardRow, "content_hash"> = {
    printing_id: bulk.printing_id,
    oracle_id: bulk.oracle_id,
    name: bulk.name,
    type: bulk.type,
    supertype: bulk.supertype,
    domains: bulk.domains.map((d) => d.toLowerCase()),
    energy: bulk.energy,
    power: bulk.power,
    might: bulk.might,
    keywords: search?.keywords ?? [],
    tags: bulk.tags,
    rules_text: bulk.text,
    rules_html: bulk.rich,
    set_code: bulk.set.toLowerCase(),
    collector_number: search?.collector_number ?? String(bulk.num).padStart(3, "0"),
    rarity: bulk.rarity.toLowerCase(),
    variant: bulk.variant,
    orientation: bulk.orientation,
    artist: bulk.artist,
    legalities: (search?.legalities ?? null) as Json | null,
    image_small: search?.images?.small ?? null,
    image_normal: search?.images?.normal ?? null,
    image_large: search?.images?.large ?? null,
    image_back: search?.images?.back ?? bulk.imgBackUrl ?? null,
    image_source: bulk.imgUrl,
  };
  // Keys are written in a fixed order above, so the JSON form is stable between runs.
  return { ...row, content_hash: sha256(JSON.stringify(row)) };
}

/** Changes whenever any row changes, is added, or is removed. Short enough to use in a URL. */
export function catalogVersion(
  rows: readonly Pick<CardRow, "printing_id" | "content_hash">[],
): string {
  const lines = rows.map((r) => `${r.printing_id}:${r.content_hash}`).sort();
  return sha256(lines.join("\n")).slice(0, 16);
}
