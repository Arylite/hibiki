import { Gem, Gift, Rocket, Star, UserPlus, type LucideIcon } from "lucide-react";

import { AlertKindSchema, type AlertKind, type AlertPayload } from "@/types/alert";

interface AlertMeta {
  label: string;
  description: string;
  icon: LucideIcon;
}

export const ALERT_META: Record<AlertKind, AlertMeta> = {
  follow: {
    label: "Follow",
    description: "Fires when someone follows your channel.",
    icon: UserPlus,
  },
  subscribe: {
    label: "Subscription",
    description: "Fires on new subscriptions and resubs.",
    icon: Star,
  },
  subscribeGift: {
    label: "Gifted subs",
    description: "Fires when a viewer gifts subscriptions to the channel.",
    icon: Gift,
  },
  raid: {
    label: "Raid",
    description: "Fires when another streamer raids you with their viewers.",
    icon: Rocket,
  },
  cheer: {
    label: "Cheer",
    description: "Fires when a viewer cheers with bits.",
    icon: Gem,
  },
};

/** Every kind is independently styleable, in the backend's catalogue order. */
export const ALERT_KINDS = AlertKindSchema.options;

export const TEMPLATE_TOKENS = ["{user}", "{amount}", "{tier}", "{message}"] as const;

/** Fills a message template from a payload. Unknown tokens stay literal so a
 *  typo is visible on screen instead of silently vanishing. */
export function renderTemplate(template: string, alert: AlertPayload): string {
  const values: Record<string, string> = {
    "{user}": alert.username,
    "{amount}": String(alert.bits ?? alert.viewers ?? alert.giftCount ?? ""),
    "{tier}": alert.tier ?? "",
    "{message}": alert.message ?? "",
  };
  return template
    .replace(/\{user\}|\{amount\}|\{tier\}|\{message\}/g, (token) => values[token] ?? token)
    .replace(/\s+/g, " ")
    .trim();
}

/** Predicate only - the username is rendered separately so it can carry weight. */
export function describeAlert(alert: AlertPayload): string {
  switch (alert.type) {
    case "follow":
      return "followed";
    case "subscribe":
      return alert.tier ? `subscribed - ${alert.tier}` : "subscribed";
    case "subscribeGift": {
      const count = alert.giftCount ?? 1;
      return `gifted ${count} sub${count > 1 ? "s" : ""}`;
    }
    case "raid":
      return `raided with ${alert.viewers ?? 0} viewers`;
    case "cheer":
      return `cheered ${alert.bits ?? 0} bits`;
  }
}

/** Matches the backend's sample payloads so previews read like the real thing. */
export function sampleAlert(kind: AlertKind): AlertPayload {
  const base: AlertPayload = { id: "preview", type: kind, username: "test_viewer", createdAt: Date.now() };
  switch (kind) {
    case "subscribe":
      return { ...base, tier: "Tier 1" };
    case "subscribeGift":
      return { ...base, tier: "Tier 1", giftCount: 5 };
    case "raid":
      return { ...base, username: "test_streamer", viewers: 25 };
    case "cheer":
      return { ...base, bits: 100, message: "Great stream!" };
    default:
      return base;
  }
}
