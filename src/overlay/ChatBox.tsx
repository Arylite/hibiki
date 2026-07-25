import { AnimatePresence, motion } from "framer-motion";

import { frameStyle, isTransparent, textShadow } from "@/lib/overlay-style";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import { visibleMessages, type ChatMessage } from "@/types/chat";
import type { AlertPosition, ChatWidget } from "@/types/settings";

/** Chat grows from the bottom when it sits low on the canvas, and from the
 *  top when it sits high — so new lines always arrive from the same edge the
 *  eye is already resting on. */
const POSITION_CLASSES: Record<AlertPosition, string> = {
  "top-left": "top-10 left-10",
  "top-center": "top-10 left-1/2 -translate-x-1/2",
  "top-right": "top-10 right-10",
  "center-left": "top-1/2 left-10 -translate-y-1/2",
  center: "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
  "center-right": "top-1/2 right-10 -translate-y-1/2",
  "bottom-left": "bottom-10 left-10",
  "bottom-center": "bottom-10 left-1/2 -translate-x-1/2",
  "bottom-right": "bottom-10 right-10",
};

const BADGE_LABELS: Record<string, string> = {
  broadcaster: "HOST",
  moderator: "MOD",
  vip: "VIP",
  subscriber: "SUB",
  founder: "SUB",
};

/** Only the badges a viewer reads at a glance; Twitch ships dozens. */
const BADGE_ORDER = ["broadcaster", "moderator", "vip", "subscriber", "founder"];

/** Twitch chat on stream. The lines OBS shows are a filtered view of the same
 *  feed the app window holds — the app is the monitor, this is the broadcast. */
export function ChatBox({ messages, config }: { messages: ChatMessage[]; config: ChatWidget }) {
  // Only ticks when something is actually waiting to expire.
  const now = useNow(config.fadeAfterSecs > 0 ? 1000 : 3_600_000);

  if (!config.enabled) return null;

  const transparent = isTransparent(config.background);
  const shadow = textShadow(config.textShadow, transparent);
  const shown = visibleMessages(messages, config).filter(
    (message) => config.fadeAfterSecs === 0 || now - message.createdAt < config.fadeAfterSecs * 1000,
  );

  return (
    <div
      className={cn("absolute flex flex-col justify-end", POSITION_CLASSES[config.position])}
      style={{
        ...frameStyle(config),
        fontSize: config.fontSize,
        width: config.width || undefined,
        maxWidth: config.width ? undefined : "32vw",
      }}
    >
      <AnimatePresence initial={false}>
        {shown.map((message) => (
          <motion.p
            key={message.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{ marginTop: config.messageGap, textShadow: shadow, lineHeight: 1.35 }}
            className="break-words"
          >
            {config.showBadges &&
              BADGE_ORDER.filter((badge) => message.badges.includes(badge)).map((badge) => (
                <span
                  key={badge}
                  className="mr-1.5 inline-block rounded px-1 align-[0.1em] text-[0.55em] leading-[1.7] font-bold tracking-wider"
                  style={{ background: config.accent, color: config.background === "transparent" ? "#000" : config.background }}
                >
                  {BADGE_LABELS[badge]}
                </span>
              ))}
            <span
              className="font-bold"
              style={{
                color:
                  config.useTwitchColors && message.color ? message.color : config.accent,
              }}
            >
              {message.username}
            </span>
            <span style={{ opacity: 0.6 }}>: </span>
            {message.text}
          </motion.p>
        ))}
      </AnimatePresence>
    </div>
  );
}
