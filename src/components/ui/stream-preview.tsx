import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/** The overlay is authored at 1080p, so every preview is a scaled copy of that
 *  canvas rather than a second implementation at another size. */
const CANVAS_W = 1920;
const CANVAS_H = 1080;

interface StreamPreviewProps {
  /** The real overlay component, rendered at 1920x1080 and scaled down. */
  children: ReactNode;
  /** Said under the frame, e.g. "Not shown on stream". */
  notice?: string;
  /** Trailing controls on the caption line. */
  action?: ReactNode;
  className?: string;
}

/** Renders the actual overlay component, scaled, so a preview cannot drift
 *  from what goes on stream. Measures its own width, so it works in a narrow
 *  aside and in a full content column alike. */
export function StreamPreview({ children, notice, action, className }: StreamPreviewProps) {
  const frame = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const node = frame.current;
    if (!node) return;
    // Measured synchronously first: waiting on the observer's callback costs a
    // frame of blank preview, and the callback is only delivered as part of the
    // rendering lifecycle - which a backgrounded window does not run.
    setWidth(node.clientWidth);
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const scale = width / CANVAS_W;

  return (
    <div className={cn("min-w-0", className)}>
      {/* The 16:9 box comes from CSS, never from the measured width: driving the
          height off `width` meant the frame started 0px tall, and Chrome does
          not deliver ResizeObserver notifications for a zero-area content box,
          so the width never arrived and the preview stayed collapsed. */}
      <div
        ref={frame}
        className="relative aspect-video w-full overflow-hidden rounded-lg border border-line bg-[#0B0B0B] shadow-raise"
      >
        {width > 0 && (
          <div
            className="absolute top-0 left-0 origin-top-left"
            style={{ width: CANVAS_W, height: CANVAS_H, transform: `scale(${scale})` }}
          >
            {children}
          </div>
        )}
      </div>

      <div className="mt-2 flex min-h-6 items-center gap-2 px-0.5">
        <span className="num text-sm text-ink-3">1920x1080 - {Math.round(scale * 100)}%</span>
        {notice && <span className="text-sm text-warn">{notice}</span>}
        {action && <div className="ml-auto flex items-center gap-1">{action}</div>}
      </div>
    </div>
  );
}
