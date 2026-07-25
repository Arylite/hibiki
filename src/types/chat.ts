import { z } from "zod";

import type { ChatWidget } from "@/types/settings";

export const ChatMessageSchema = z.object({
  id: z.string(),
  username: z.string(),
  /** The colour the chatter picked on Twitch. Empty when they never set one. */
  color: z.string(),
  text: z.string(),
  /** Badge set ids: `broadcaster`, `moderator`, `subscriber`, `vip`… */
  badges: z.array(z.string()),
  createdAt: z.number(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const WsChatMessageSchema = z.object({
  type: z.literal("chat"),
  payload: ChatMessageSchema,
});

/** Bots that talk in almost every channel and are never worth stream space. */
const BOTS = ["nightbot", "streamelements", "streamlabs", "moobot", "fossabot", "wizebot", "sery_bot"];

export const isBot = (username: string) => BOTS.includes(username.toLowerCase());

export const isCommand = (text: string) => text.startsWith("!");

/**
 * What the overlay actually shows. The app window holds the whole feed — it is
 * the monitor — and this decides which of it is worth stream space. Filtering
 * happens before the cut, so hiding bots buys back lines rather than leaving
 * gaps where they were.
 */
export function visibleMessages(messages: ChatMessage[], config: ChatWidget): ChatMessage[] {
  return messages
    .filter((message) => !(config.hideCommands && isCommand(message.text)))
    .filter((message) => !(config.hideBots && isBot(message.username)))
    .slice(-Math.max(1, config.maxMessages));
}
