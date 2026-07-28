import { AnimatePresence, motion } from "framer-motion";

import { frameStyle, isTransparent, positionStyle, textShadow } from "@/lib/overlay-style";
import { useNow } from "@/lib/use-now";
import { Backdrop } from "@/overlay/Backdrop";
import { visibleMessages, type ChatMessage } from "@/types/chat";
import type { ChatWidget } from "@/types/settings";

const BADGE_LABELS: Record<string, string> = {
  broadcaster: "HOST",
  moderator: "MOD",
  vip: "VIP",
  subscriber: "SUB",
  founder: "SUB",
};

/** Only the badges a viewer reads at a glance; Twitch ships dozens. */
const BADGE_ORDER = ["broadcaster", "moderator", "vip", "subscriber", "founder"];

/** Twitch chat on stream: a filtered view of the feed the app window holds. */
export function ChatBox({
  messages,
  config,
  pad,
  padX,
}: {
  messages: ChatMessage[];
  config: ChatWidget;
  pad: number;
  padX: number;
}) {
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
      className="absolute isolate flex flex-col justify-end overflow-hidden"
      style={{
        ...positionStyle(config.position, pad, padX),
        ...frameStyle(config),
        fontSize: config.fontSize,
        width: config.width || undefined,
        maxWidth: config.width ? undefined : "32vw",
      }}
    >
      <Backdrop file={config.backgroundMedia} />

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
