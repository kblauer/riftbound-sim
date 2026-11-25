import type { Database } from "./database.types.ts";

export type { Database, Json } from "./database.types.ts";

type Tables = Database["public"]["Tables"];
export type Row<T extends keyof Tables> = Tables[T]["Row"];
export type Insert<T extends keyof Tables> = Tables[T]["Insert"];

/**
 * The card columns the app needs, in the shape of `CatalogCard` from the protocol package.
 * Queries name their columns (never `select *`) to keep Supabase egress down.
 */
export const CATALOG_COLUMNS =
  "printing_id, oracle_id, name, type, supertype, domains, energy, power, might, keywords, rules_text, set_code, collector_number, rarity, variant, orientation, image_small, image_normal, image_large" as const;
