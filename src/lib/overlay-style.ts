import type { CSSProperties } from "react";

import type { AlertPosition, TextShadow } from "@/types/settings";

/** Inter and Geist Mono ship with the overlay; the rest are on every Windows
 *  install running OBS. */
export const OVERLAY_FONTS = [
  { value: "inter", label: "Inter", stack: "'Inter', system-ui, sans-serif" },
  { value: "system", label: "System", stack: "system-ui, 'Segoe UI', sans-serif" },
  { value: "mono", label: "Mono", stack: "'Geist Mono', ui-monospace, monospace" },
  { value: "serif", label: "Serif", stack: "Georgia, 'Times New Roman', serif" },
  { value: "impact", label: "Impact", stack: "Impact, 'Arial Black', sans-serif" },
  { value: "verdana", label: "Verdana", stack: "Verdana, Geneva, sans-serif" },
] as const;

export const FONT_WEIGHTS = [
  { value: 400, label: "Regular" },
  { value: 500, label: "Medium" },
  { value: 700, label: "Bold" },
  { value: 900, label: "Black" },
] as const;

export function fontStack(value: string): string {
  return OVERLAY_FONTS.find((font) => font.value === value)?.stack ?? OVERLAY_FONTS[0].stack;
}

const OUTLINE = [-1, 1]
  .flatMap((x) => [-1, 1].map((y) => `${x}px ${y}px 0 rgba(0,0,0,0.95)`))
  .join(", ");

/** `auto` shadows the text only while the widget is transparent. */
export function textShadow(mode: TextShadow, transparent: boolean): string | undefined {
  const resolved = mode === "auto" ? (transparent ? "soft" : "none") : mode;
  switch (resolved) {
    case "soft":
      return "0 2px 12px rgba(0,0,0,0.6)";
    case "strong":
      return "0 2px 6px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.75)";
    case "outline":
      return `${OUTLINE}, 0 2px 8px rgba(0,0,0,0.5)`;
    default:
      return undefined;
  }
}

/** Dims a picked colour with an alpha byte: `#22c55e` at 60% is `#22c55e99`.
 *  Anything else (`transparent`, rgba()) is handed back untouched. */
export function withOpacity(color: string, opacity: number): string {
  if (opacity >= 100 || !/^#[0-9a-f]{6}$/i.test(color)) return color;
  const alpha = Math.round((Math.max(0, opacity) / 100) * 255);
  return color + alpha.toString(16).padStart(2, "0");
}

/** Where a widget sits on the stream. Centring uses the standalone `translate`
 *  property, not a transform: the entrance animations own `transform`. */
export function positionStyle(position: AlertPosition, pad: number): CSSProperties {
  const [vertical, horizontal] = position === "center" ? ["center", "center"] : position.split("-");
  return {
    top: vertical === "top" ? pad : vertical === "center" ? "50%" : undefined,
    bottom: vertical === "bottom" ? pad : undefined,
    left: horizontal === "left" ? pad : horizontal === "center" ? "50%" : undefined,
    right: horizontal === "right" ? pad : undefined,
    translate: `${horizontal === "center" ? "-50%" : "0"} ${vertical === "center" ? "-50%" : "0"}`,
  };
}

interface FrameConfig {
  background: string;
  backgroundOpacity: number;
  textColor: string;
  cornerRadius: number;
  borderColor: string;
  borderWidth: number;
  padding: number;
  fontFamily: string;
  fontWeight: number;
}

/** Padding and radius only apply once the widget has a backdrop or a border,
 *  so a transparent one sits flush on the stream. */
export function frameStyle(config: FrameConfig): CSSProperties {
  const transparent = config.background === "transparent";
  const bordered = config.borderWidth > 0 && config.borderColor !== "transparent";
  const boxed = !transparent || bordered;

  return {
    background: transparent ? undefined : withOpacity(config.background, config.backgroundOpacity),
    color: config.textColor,
    border: bordered ? `${config.borderWidth}px solid ${config.borderColor}` : undefined,
    borderRadius: boxed ? config.cornerRadius : undefined,
    // 1.25 holds the 32/40 vertical-to-horizontal proportion at every size.
    padding: boxed ? `${config.padding}px ${Math.round(config.padding * 1.25)}px` : undefined,
    fontFamily: fontStack(config.fontFamily),
    fontWeight: config.fontWeight,
  };
}

/** True when the widget has no backdrop of its own. */
export const isTransparent = (background: string) => background === "transparent";
