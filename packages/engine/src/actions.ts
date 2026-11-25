import { z } from "zod";
import { playerIdSchema } from "./state.ts";

export const actionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("playCard"),
    player: playerIdSchema,
    instanceId: z.string(),
  }),
  z.object({ type: z.literal("endTurn"), player: playerIdSchema }),
  z.object({ type: z.literal("concede"), player: playerIdSchema }),
]);

export type Action = z.infer<typeof actionSchema>;
