import type { CSSProperties } from "react";

import type { TextShadow } from "@/types/settings";

/**
 * Shared look for the three on-stream widgets. Every value here is the
 * streamer's decision, so this module only turns their choices into CSS —
 * it never decides anything itself.
 */

/** Inter and Geist Mono ship with the overlay; the rest are faces every
 *  Windows install running OBS already has. */
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

/** `auto` is the behaviour the overlay always had: readable over gameplay
 *  while transparent, clean once the widget carries its own backdrop. */
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

interface FrameConfig {
  background: string;
  textColor: string;
  cornerRadius: number;
  borderColor: string;
  borderWidth: number;
  padding: number;
  fontFamily: string;
  fontWeight: number;
}

/**
 * The box itself. Padding and radius only apply once the widget has something
 * to be a box of — a backdrop or a border — so a transparent widget still
 * sits flush on the stream the way it always did.
 */
export function frameStyle(config: FrameConfig): CSSProperties {
  const transparent = config.background === "transparent";
  const bordered = config.borderWidth > 0 && config.borderColor !== "transparent";
  const boxed = !transparent || bordered;

  return {
    background: transparent ? undefined : config.background,
    color: config.textColor,
    border: bordered ? `${config.borderWidth}px solid ${config.borderColor}` : undefined,
    borderRadius: boxed ? config.cornerRadius : undefined,
    // 1.25 keeps the classic 32/40 proportion at every size.
    padding: boxed ? `${config.padding}px ${Math.round(config.padding * 1.25)}px` : undefined,
    fontFamily: fontStack(config.fontFamily),
    fontWeight: config.fontWeight,
  };
}

/** True when the widget has no backdrop of its own. */
export const isTransparent = (background: string) => background === "transparent";
