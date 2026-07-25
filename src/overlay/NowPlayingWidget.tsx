import { useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { frameStyle, isTransparent, textShadow } from "@/lib/overlay-style";
import { cn } from "@/lib/utils";
import { sourceLabel, type NowPlaying } from "@/types/nowplaying";
import type { AlertPosition, NowPlayingWidget as WidgetConfig } from "@/types/settings";

/** Corner placement, independent of where alerts land. */
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

/** The music strip on stream. Bars animate only while audio is actually
 *  playing — a frozen equaliser next to a paused track would be a lie. */
export function NowPlayingWidget({ track, config }: { track: NowPlaying | null; config: WidgetConfig }) {
  const visible = Boolean(track) && config.enabled && (track!.playing || !config.hideWhenPaused);
  const transparent = isTransparent(config.background);
  const shadow = textShadow(config.textShadow, transparent);
  const artSize = config.artSize || config.fontSize * 2.6;

  const meta = track
    ? [
        config.showArtist ? track.artist : "",
        config.showAlbum ? (track.album ?? "") : "",
        config.showSource ? sourceLabel(track.source) : "",
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  const showArt = config.showArt && track?.art;

  return (
    <AnimatePresence>
      {visible && track && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            "absolute flex items-center gap-3",
            POSITION_CLASSES[config.position],
            !config.width && "max-w-[36vw]",
          )}
          style={{
            ...frameStyle(config),
            fontSize: config.fontSize,
            width: config.width || undefined,
          }}
        >
          {showArt ? (
            <img
              src={track.art!}
              alt=""
              className="shrink-0 object-cover"
              style={{ width: artSize, height: artSize, borderRadius: config.artRadius || undefined }}
            />
          ) : (
            config.showEqualizer && (
              <Equalizer color={config.accent} playing={track.playing} size={config.fontSize} />
            )
          )}
          <div className="min-w-0">
            <p className="flex items-center gap-2" style={{ lineHeight: 1.2, textShadow: shadow }}>
              {showArt && config.showEqualizer && (
                <Equalizer color={config.accent} playing={track.playing} size={config.fontSize * 0.8} />
              )}
              <Title text={track.title} config={config} />
            </p>
            {meta && (
              <p
                className="truncate font-normal"
                style={{ fontSize: config.fontSize * 0.72, opacity: 0.75, textShadow: shadow }}
              >
                {meta}
              </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Pause at each end before turning back, so the start of the title is
 *  readable rather than always sliding away from you. */
const SCROLL_HOLD_S = 1.2;

/**
 * The track title. Long ones either get cut at a character count, or slide
 * back and forth inside the widget — a station name plate rather than an
 * ellipsis. The scroll only runs when the text really does not fit, so a
 * short title never twitches.
 */
function Title({ text, config }: { text: string; config: WidgetConfig }) {
  const viewport = useRef<HTMLSpanElement>(null);
  const inner = useRef<HTMLSpanElement>(null);
  const [overflow, setOverflow] = useState(0);

  const clipped =
    config.titleMaxChars > 0 && text.length > config.titleMaxChars
      ? `${text.slice(0, config.titleMaxChars).trimEnd()}…`
      : text;

  // Measured after layout, and re-measured whenever the text or the type
  // changes, because the same title is a different width in another face.
  useLayoutEffect(() => {
    if (!config.titleScroll) {
      setOverflow(0);
      return;
    }
    const measure = () => {
      const box = viewport.current?.clientWidth ?? 0;
      const content = inner.current?.scrollWidth ?? 0;
      setOverflow(Math.max(0, content - box));
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (viewport.current) observer.observe(viewport.current);
    return () => observer.disconnect();
  }, [clipped, config.titleScroll, config.fontSize, config.fontFamily, config.fontWeight, config.width]);

  if (!config.titleScroll) {
    return <span className="min-w-0 flex-1 truncate">{clipped}</span>;
  }

  // Out and back, with a rest at each end: travel · hold · travel · hold.
  const travel = overflow / Math.max(10, config.titleScrollSpeed);
  const cycle = travel * 2 + SCROLL_HOLD_S * 2;
  const at = (seconds: number) => seconds / cycle;

  return (
    <span ref={viewport} className="block min-w-0 flex-1 overflow-hidden">
      <motion.span
        ref={inner}
        className="inline-block whitespace-nowrap"
        animate={overflow > 0 ? { x: [0, -overflow, -overflow, 0, 0] } : { x: 0 }}
        transition={
          overflow > 0
            ? {
                duration: cycle,
                times: [
                  0,
                  at(travel),
                  at(travel + SCROLL_HOLD_S),
                  at(travel * 2 + SCROLL_HOLD_S),
                  1,
                ],
                repeat: Infinity,
                ease: "linear",
              }
            : { duration: 0 }
        }
      >
        {clipped}
      </motion.span>
    </span>
  );
}

const BAR_DELAYS = [0, 0.15, 0.3];

function Equalizer({ color, playing, size }: { color: string; playing: boolean; size: number }) {
  return (
    <div className="flex shrink-0 items-end gap-[2px]" style={{ height: size }}>
      {BAR_DELAYS.map((delay) => (
        <motion.span
          key={delay}
          className="w-[3px] rounded-full"
          style={{ background: color, height: size * 0.4 }}
          animate={playing ? { scaleY: [0.4, 1, 0.55, 0.9, 0.4] } : { scaleY: 0.4 }}
          transition={playing ? { duration: 1.1, repeat: Infinity, ease: "easeInOut", delay } : { duration: 0.2 }}
        />
      ))}
    </div>
  );
}
