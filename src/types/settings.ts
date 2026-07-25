import { z } from "zod";

import { AlertKindSchema } from "@/types/alert";

export const AlertPositionSchema = z.enum([
  "top-left",
  "top-center",
  "top-right",
  "center-left",
  "center",
  "center-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
]);
export type AlertPosition = z.infer<typeof AlertPositionSchema>;

/** How on-stream text stays readable over arbitrary gameplay. `auto` is the
 *  long-standing behaviour: a shadow while transparent, none once the widget
 *  has a backdrop of its own. */
export const TextShadowSchema = z.enum(["auto", "none", "soft", "strong", "outline"]);
export type TextShadow = z.infer<typeof TextShadowSchema>;

export const TextAlignSchema = z.enum(["auto", "left", "center", "right"]);
export type TextAlign = z.infer<typeof TextAlignSchema>;

/** The frame and type controls every on-stream widget shares. */
const FrameFields = {
  cornerRadius: z.number().int(),
  borderColor: z.string(),
  borderWidth: z.number().int(),
  padding: z.number().int(),
  fontFamily: z.string(),
  fontWeight: z.number().int(),
  textShadow: TextShadowSchema,
};

/** The on-stream music widget, off by default. */
export const NowPlayingWidgetSchema = z.object({
  enabled: z.boolean(),
  position: AlertPositionSchema,
  accent: z.string(),
  textColor: z.string(),
  background: z.string(),
  fontSize: z.number().int(),
  showArtist: z.boolean(),
  showSource: z.boolean(),
  showArt: z.boolean(),
  hideWhenPaused: z.boolean(),
  ...FrameFields,
  /** 0 keeps the responsive default width. */
  width: z.number().int(),
  showAlbum: z.boolean(),
  showEqualizer: z.boolean(),
  /** 0 derives the cover size from the font size. */
  artSize: z.number().int(),
  artRadius: z.number().int(),
  /** Cut the track title at this many characters. 0 leaves it whole. */
  titleMaxChars: z.number().int(),
  /** Scroll a title that does not fit instead of clipping it. */
  titleScroll: z.boolean(),
  /** Pixels per second for that scroll. */
  titleScrollSpeed: z.number().int(),
});
export type NowPlayingWidget = z.infer<typeof NowPlayingWidgetSchema>;

export const GoalKindSchema = z.enum(["follow", "subscribe", "cheer"]);
export type GoalKind = z.infer<typeof GoalKindSchema>;

export const GoalWidgetSchema = z.object({
  enabled: z.boolean(),
  kind: GoalKindSchema,
  target: z.number().int(),
  label: z.string(),
  position: AlertPositionSchema,
  accent: z.string(),
  textColor: z.string(),
  background: z.string(),
  fontSize: z.number().int(),
  /** Counting starts here, so “reset” is a timestamp, not a delete. */
  startedAt: z.number(),
  ...FrameFields,
  /** 0 keeps the responsive default width. */
  width: z.number().int(),
  /** 0 derives the bar height from the font size. */
  barHeight: z.number().int(),
  barRadius: z.number().int(),
  trackColor: z.string(),
  showValue: z.boolean(),
  showPercent: z.boolean(),
});
export type GoalWidget = z.infer<typeof GoalWidgetSchema>;

/** Twitch chat on stream. */
export const ChatWidgetSchema = z.object({
  enabled: z.boolean(),
  position: AlertPositionSchema,
  accent: z.string(),
  textColor: z.string(),
  background: z.string(),
  fontSize: z.number().int(),
  ...FrameFields,
  width: z.number().int(),
  /** How many lines stay on screen. */
  maxMessages: z.number().int(),
  hideCommands: z.boolean(),
  hideBots: z.boolean(),
  showBadges: z.boolean(),
  /** Names in each chatter's own Twitch colour, rather than the accent. */
  useTwitchColors: z.boolean(),
  /** Remove a line this long after it arrives. 0 keeps it until it is pushed
   *  off the bottom. */
  fadeAfterSecs: z.number().int(),
  messageGap: z.number().int(),
});
export type ChatWidget = z.infer<typeof ChatWidgetSchema>;

export const SettingsSchema = z.object({
  wsPort: z.number().int().min(1).max(65535),
  globalVolume: z.number().min(0).max(1),
  overlayUrl: z.string(),
  clientId: z.string(),
  alertPosition: AlertPositionSchema,
  alertGapMs: z.number().int(),
  /** Keeps the window out of OBS display capture and screen shares. */
  hideFromCapture: z.boolean(),
  nowPlaying: NowPlayingWidgetSchema,
  goal: GoalWidgetSchema,
  chat: ChatWidgetSchema,
});
export type Settings = z.infer<typeof SettingsSchema>;

export const AlertAnimationSchema = z.enum(["slide-up", "fade", "pop", "slide-left", "drop"]);
export type AlertAnimation = z.infer<typeof AlertAnimationSchema>;

export const AlertLayoutSchema = z.enum(["image-top", "image-left", "image-right", "image-bottom"]);
export type AlertLayout = z.infer<typeof AlertLayoutSchema>;

/** Everything a streamer can change about one alert's look on stream. */
export const AlertStyleSchema = z.object({
  enabled: z.boolean(),
  title: z.string(),
  message: z.string(),
  /** File name inside the managed media dir, served at /media/<name>. */
  image: z.string().nullable(),
  sound: z.string().nullable(),
  volume: z.number().min(0).max(1),
  durationMs: z.number().int(),
  animation: AlertAnimationSchema,
  layout: AlertLayoutSchema,
  accent: z.string(),
  textColor: z.string(),
  background: z.string(),
  imageSize: z.number().int(),
  fontSize: z.number().int(),
  /** Ignore repeats of this alert for N ms. 0 disables it. */
  cooldownMs: z.number().int(),
  /** Skip events worth less than this — bits, viewers, gifted subs. */
  minAmount: z.number().int(),
  ...FrameFields,
  textAlign: TextAlignSchema,
  uppercaseTitle: z.boolean(),
  /** The heading, as a percentage of the message size. */
  titleSize: z.number().int(),
  imageRadius: z.number().int(),
});
export type AlertStyle = z.infer<typeof AlertStyleSchema>;

/** Keyed by alert kind, not named fields - the backend catalogue decides which
 *  kinds exist and always sends a complete set. */
export const AlertStylesSchema = z.record(AlertKindSchema, AlertStyleSchema);
export type AlertStyles = z.infer<typeof AlertStylesSchema>;

export const OverlayConfigSchema = z.object({
  globalVolume: z.number(),
  alertPosition: AlertPositionSchema,
  alertGapMs: z.number(),
  styles: AlertStylesSchema,
  nowPlaying: NowPlayingWidgetSchema,
  goal: GoalWidgetSchema,
  chat: ChatWidgetSchema,
});

export const GoalStateSchema = z.object({ current: z.number(), target: z.number() });
export type GoalState = z.infer<typeof GoalStateSchema>;

export const WsGoalMessageSchema = z.object({
  type: z.literal("goal"),
  payload: GoalStateSchema,
});
export type OverlayConfig = z.infer<typeof OverlayConfigSchema>;

export const WsConfigMessageSchema = z.object({
  type: z.literal("config"),
  payload: OverlayConfigSchema,
});

export const ServerStatusSchema = z.object({
  wsPort: z.number(),
  overlayUrl: z.string(),
  overlayClients: z.number(),
  eventsubConnected: z.boolean(),
  /** False when the signed-in token predates the chat permission. */
  chatReady: z.boolean(),
});
export type ServerStatus = z.infer<typeof ServerStatusSchema>;
