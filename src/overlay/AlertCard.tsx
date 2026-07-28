import { motion, type Variants } from "framer-motion";

import { renderTemplate } from "@/lib/alert-meta";
import { mediaUrl } from "@/lib/media";
import { frameStyle, isTransparent, textShadow } from "@/lib/overlay-style";
import { Backdrop } from "@/overlay/Backdrop";
import { cn } from "@/lib/utils";
import type { AlertPayload } from "@/types/alert";
import type { AlertAnimation, AlertLayout, AlertStyle } from "@/types/settings";

const ANIMATIONS: Record<AlertAnimation, Variants> = {
  "slide-up": { hidden: { opacity: 0, y: 60 }, shown: { opacity: 1, y: 0 }, gone: { opacity: 0, y: -40 } },
  fade: { hidden: { opacity: 0 }, shown: { opacity: 1 }, gone: { opacity: 0 } },
  pop: { hidden: { opacity: 0, scale: 0.5 }, shown: { opacity: 1, scale: 1 }, gone: { opacity: 0, scale: 0.8 } },
  "slide-left": { hidden: { opacity: 0, x: 120 }, shown: { opacity: 1, x: 0 }, gone: { opacity: 0, x: -80 } },
  drop: { hidden: { opacity: 0, y: -120 }, shown: { opacity: 1, y: 0 }, gone: { opacity: 0, y: 60 } },
};

const DIRECTION: Record<AlertLayout, string> = {
  "image-top": "flex-col",
  "image-bottom": "flex-col-reverse",
  "image-left": "flex-row",
  "image-right": "flex-row-reverse",
};

const STACKED: AlertLayout[] = ["image-top", "image-bottom"];

/** The graphic OBS composites over the stream. */
export function AlertCard({ alert, style }: { alert: AlertPayload; style: AlertStyle }) {
  const message = renderTemplate(style.message, alert);
  const transparent = isTransparent(style.background);
  const shadow = textShadow(style.textShadow, transparent);
  const stacked = STACKED.includes(style.layout);
  const align = style.textAlign === "auto" ? (stacked ? "center" : "left") : style.textAlign;

  return (
    <motion.div
      variants={ANIMATIONS[style.animation]}
      initial="hidden"
      animate="shown"
      exit="gone"
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className={cn("relative isolate flex max-w-[80vw] items-center gap-6 overflow-hidden", DIRECTION[style.layout])}
      style={frameStyle(style)}
    >
      <Backdrop file={style.backgroundMedia} />

      {style.image && (
        <img
          src={mediaUrl(style.image)}
          alt=""
          style={{
            width: style.imageSize,
            maxHeight: style.imageSize * 1.5,
            borderRadius: style.imageRadius || undefined,
          }}
          className="object-contain"
        />
      )}

      <div className="min-w-0" style={{ textAlign: align }}>
        <p
          className={cn("tracking-[0.12em]", style.uppercaseTitle && "uppercase")}
          style={{
            color: style.accent,
            fontSize: (style.fontSize * style.titleSize) / 100,
            textShadow: shadow,
          }}
        >
          {style.title}
        </p>
        <p style={{ fontSize: style.fontSize, lineHeight: 1.15, textShadow: shadow }}>
          {highlight(message, alert.username, style.accent)}
        </p>
      </div>
    </motion.div>
  );
}

/** Names read as the subject of the sentence, so they get the accent. */
function highlight(text: string, username: string, accent: string) {
  if (!username || !text.includes(username)) return text;
  return text.split(username).flatMap((part, i) =>
    i === 0
      ? [part]
      : [
          <span key={i} style={{ color: accent }}>
            {username}
          </span>,
          part,
        ],
  );
}
