import { describe, expect, it } from "vitest";
import { type BulkCard, catalogVersion, type SearchCard, toCardRow } from "./rifthunt.ts";

const bulk: BulkCard = {
  printing_id: "6bbcb227-3bcd-46f7-8421-0a6a60acbaf2",
  oracle_id: "4d7dca5d-5c5a-42fe-a843-baecb0412c32",
  name: "Test Card",
  type: "Unit",
  supertype: null,
  domains: ["Fury"],
  energy: 2,
  power: null,
  might: 3,
  text: "Text",
  rich: "<p>Text</p>",
  set: "OGN",
  num: 25,
  rarity: "Common",
  variant: "base",
  orientation: "portrait",
  artist: null,
  tags: [],
  imgUrl: "https://example.com/full.png",
};

const search: SearchCard = {
  printing_id: bulk.printing_id,
  collector_number: "025",
  keywords: ["assault"],
  legalities: { standard: { status: "legal" } },
  images: { small: "https://example.com/s.webp", normal: "https://example.com/n.webp" },
};

describe("toCardRow", () => {
  it("merges search data over the bulk record and normalises case", () => {
    const row = toCardRow(bulk, search);
    expect(row).toMatchObject({
      set_code: "ogn",
      domains: ["fury"],
      rarity: "common",
      collector_number: "025",
      keywords: ["assault"],
      image_small: "https://example.com/s.webp",
      image_large: null,
      image_source: "https://example.com/full.png",
    });
  });

  it("still produces a row, with the bulk image as fallback, when search has no match", () => {
    const row = toCardRow(bulk, undefined);
    expect(row.image_small).toBeNull();
    expect(row.image_source).toBe(bulk.imgUrl);
    expect(row.collector_number).toBe("025");
  });

  it("hashes content stably and changes the hash when data changes", () => {
    expect(toCardRow(bulk, search).content_hash).toBe(toCardRow(bulk, search).content_hash);
    expect(toCardRow({ ...bulk, might: 4 }, search).content_hash).not.toBe(
      toCardRow(bulk, search).content_hash,
    );
  });
});

describe("catalogVersion", () => {
  it("ignores row order and reacts to any change", () => {
    const a = { printing_id: "a", content_hash: "1" };
    const b = { printing_id: "b", content_hash: "2" };
    expect(catalogVersion([a, b])).toBe(catalogVersion([b, a]));
    expect(catalogVersion([a, b])).not.toBe(catalogVersion([a, { ...b, content_hash: "3" }]));
    expect(catalogVersion([a, b])).not.toBe(catalogVersion([a]));
  });
});
