import {
  type Catalog,
  type CatalogCard,
  catalogSchema,
  catalogVersionSchema,
} from "@riftbound-sim/protocol";
import { useQuery } from "@tanstack/react-query";
import { get, set } from "idb-keyval";
import { SERVER_URL } from "./supabase.ts";

const STORAGE_KEY = "catalog";

/**
 * Loads the card catalog while keeping Supabase egress near zero (issue #1):
 *   1. ask the match server for the current version (a few bytes, edge-cached);
 *   2. if IndexedDB already holds that version, use it and download nothing;
 *   3. otherwise download the versioned catalog (edge-cached, immutable) and store it.
 * Returns null when no server is configured or no catalog has been seeded yet.
 */
export async function loadCatalog(): Promise<Catalog | null> {
  if (!SERVER_URL) return null;
  const cached = await get<Catalog>(STORAGE_KEY).catch(() => undefined);

  try {
    const versionResponse = await fetch(`${SERVER_URL}/catalog/version`);
    if (versionResponse.status === 404) return null; // No catalog has been seeded yet.
    if (!versionResponse.ok) throw new Error(`Catalog version: ${versionResponse.status}`);
    const { version } = catalogVersionSchema.parse(await versionResponse.json());
    if (!version) return null;
    if (cached?.version === version) return cached;

    const response = await fetch(`${SERVER_URL}/catalog/${version}`);
    if (!response.ok) throw new Error(`Catalog download: ${response.status}`);
    const catalog = catalogSchema.parse(await response.json());
    await set(STORAGE_KEY, catalog).catch(() => undefined);
    return catalog;
  } catch (error) {
    // Offline or server down: a stale catalog is better than none.
    if (cached) return cached;
    console.warn("Card catalog unavailable", error);
    return null;
  }
}

export type CardLookup = (cardId: string) => CatalogCard | undefined;

/** The catalog as a lookup by `printing_id`. Fetched once per page load. */
export function useCatalog(): { lookup: CardLookup; cards: CatalogCard[]; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ["catalog"],
    queryFn: async () => {
      const catalog = await loadCatalog();
      const cards = catalog?.cards ?? [];
      return { cards, byId: new Map(cards.map((card) => [card.printing_id, card])) };
    },
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  });
  return {
    lookup: (cardId) => data?.byId.get(cardId),
    cards: data?.cards ?? [],
    isLoading,
  };
}
