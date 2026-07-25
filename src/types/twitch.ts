import { z } from "zod";

export const TwitchUserSchema = z.object({
  userId: z.string(),
  login: z.string(),
  displayName: z.string(),
  profileImageUrl: z.string(),
});
export type TwitchUser = z.infer<typeof TwitchUserSchema>;
