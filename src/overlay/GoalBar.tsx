import { motion } from "framer-motion";

import { frameStyle, isTransparent, positionStyle, textShadow } from "@/lib/overlay-style";
import { cn } from "@/lib/utils";
import { Backdrop } from "@/overlay/Backdrop";
import type { GoalState, GoalWidget } from "@/types/settings";

/** Progress towards a stream goal. */
export function GoalBar({
  config,
  state,
  pad,
  padX,
}: {
  config: GoalWidget;
  state: GoalState;
  pad: number;
  padX: number;
}) {
  if (!config.enabled) return null;

  const target = Math.max(1, state.target || config.target);
  const ratio = Math.min(1, state.current / target);
  const transparent = isTransparent(config.background);
  const shadow = textShadow(config.textShadow, transparent);
  const barHeight = config.barHeight || Math.max(6, config.fontSize * 0.4);

  return (
    <div
      className={cn(
        "absolute isolate overflow-hidden",
        // The responsive default, unless the streamer pinned a width.
        !config.width && "w-[22vw] min-w-[220px]",
      )}
      style={{
        ...positionStyle(config.position, pad, padX),
        ...frameStyle(config),
        fontSize: config.fontSize,
        width: config.width || undefined,
      }}
    >
      <Backdrop file={config.backgroundMedia} />

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
            {config.showValue && config.showPercent && " - "}
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
