import { z } from "zod";

export const AlertKindSchema = z.enum(["follow", "subscribe", "subscribeGift", "raid", "cheer"]);
export type AlertKind = z.infer<typeof AlertKindSchema>;

export const AlertPayloadSchema = z.object({
  id: z.string(),
  type: AlertKindSchema,
  username: z.string(),
  tier: z.string().optional(),
  bits: z.number().optional(),
  viewers: z.number().optional(),
  message: z.string().optional(),
  giftCount: z.number().optional(),
  createdAt: z.number(),
});
export type AlertPayload = z.infer<typeof AlertPayloadSchema>;

export const WsAlertMessageSchema = z.object({
  type: z.literal("alert"),
  payload: AlertPayloadSchema,
});
export type WsAlertMessage = z.infer<typeof WsAlertMessageSchema>;
