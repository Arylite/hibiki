import { motion } from "framer-motion";

import { frameStyle, isTransparent, textShadow } from "@/lib/overlay-style";
import { cn } from "@/lib/utils";
import type { AlertPosition, GoalState, GoalWidget } from "@/types/settings";

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

/** Progress towards a stream goal. The bar animates to its new width so the
 *  movement itself reads as "someone just did that". */
export function GoalBar({ config, state }: { config: GoalWidget; state: GoalState }) {
  if (!config.enabled) return null;

  const target = Math.max(1, state.target || config.target);
  const ratio = Math.min(1, state.current / target);
  const transparent = isTransparent(config.background);
  const shadow = textShadow(config.textShadow, transparent);
  const barHeight = config.barHeight || Math.max(6, config.fontSize * 0.4);

  return (
    <div
      className={cn(
        "absolute",
        POSITION_CLASSES[config.position],
        // The responsive default, unless the streamer pinned a width.
        !config.width && "w-[22vw] min-w-[220px]",
      )}
      style={{
        ...frameStyle(config),
        fontSize: config.fontSize,
        width: config.width || undefined,
      }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate" style={{ textShadow: shadow }}>
          {config.label}
        </span>
        {(config.showValue || config.showPercent) && (
          <span
            className="shrink-0 tabular-nums"
            style={{ fontSize: config.fontSize * 0.85, textShadow: shadow }}
          >
            {config.showValue && `${state.current}/${target}`}
            {config.showValue && config.showPercent && " · "}
            {config.showPercent && `${Math.round(ratio * 100)}%`}
          </span>
        )}
      </div>
      <div
        className="mt-2 overflow-hidden"
        style={{ height: barHeight, background: config.trackColor, borderRadius: config.barRadius }}
      >
        <motion.div
          className="h-full"
          style={{ background: config.accent, borderRadius: config.barRadius }}
          initial={false}
          animate={{ width: `${ratio * 100}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
      </div>
    </div>
  );
}
