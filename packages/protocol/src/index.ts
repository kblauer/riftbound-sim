import { actionSchema, playerViewSchema } from "@riftbound-sim/engine";
import { z } from "zod";

/** The Durable Object binding is `Match`, which partyserver exposes as this party name. */
export const MATCH_PARTY = "match";

/** Messages the browser sends over the match WebSocket. */
export const clientMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ping"), nonce: z.string() }),
  /** A move intent. The server ignores `action.player` and uses the authenticated user. */
  z.object({ type: z.literal("action"), action: actionSchema }),
]);
export type ClientMessage = z.infer<typeof clientMessageSchema>;

/** Messages the match server sends to one player. */
export const serverMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("pong"), nonce: z.string() }),
  z.object({ type: z.literal("waiting"), players: z.number().int() }),
  z.object({ type: z.literal("state"), view: playerViewSchema }),
  z.object({ type: z.literal("error"), message: z.string() }),
]);
export type ServerMessage = z.infer<typeof serverMessageSchema>;

/** One card as served by `GET /catalog/{version}`. Mirrors the `cards` table columns the app uses. */
export const catalogCardSchema = z.object({
  printing_id: z.string(),
  oracle_id: z.string(),
  name: z.string(),
  type: z.string(),
  supertype: z.string().nullable(),
  domains: z.array(z.string()),
  energy: z.number().nullable(),
  power: z.number().nullable(),
  might: z.number().nullable(),
  keywords: z.array(z.string()),
  rules_text: z.string().nullable(),
  set_code: z.string(),
  collector_number: z.string(),
  rarity: z.string().nullable(),
  variant: z.string().nullable(),
  orientation: z.string().nullable(),
  image_small: z.string().nullable(),
  image_normal: z.string().nullable(),
  image_large: z.string().nullable(),
});
export type CatalogCard = z.infer<typeof catalogCardSchema>;

export const catalogSchema = z.object({
  version: z.string(),
  cards: z.array(catalogCardSchema),
});
export type Catalog = z.infer<typeof catalogSchema>;

export const catalogVersionSchema = z.object({ version: z.string().nullable() });
export type CatalogVersion = z.infer<typeof catalogVersionSchema>;

export function encode(message: ClientMessage | ServerMessage): string {
  return JSON.stringify(message);
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

export function decodeClientMessage(raw: string): ClientMessage | null {
  const result = clientMessageSchema.safeParse(parseJson(raw));
  return result.success ? result.data : null;
}

export function decodeServerMessage(raw: string): ServerMessage | null {
  const result = serverMessageSchema.safeParse(parseJson(raw));
  return result.success ? result.data : null;
}
