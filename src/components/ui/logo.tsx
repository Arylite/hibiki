import logo from "@/assets/logo.png";
import { cn } from "@/lib/utils";

/**
 * The mascot, always the same shape. The artwork is a square with its own
 * background, so it gets an app-icon corner instead of sitting on the page as
 * a raw tile — and a hairline, so the edge still reads when the logo's
 * background and the surface behind it are close in tone.
 *
 * The radius is a percentage rather than a fixed value: 8px on a 22px mark and
 * 8px on a 56px one are two different shapes, and this is one mark.
 */
export function Logo({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <img
      src={logo}
      alt=""
      draggable={false}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={cn("shrink-0 rounded-[28%] object-cover ring-1 ring-line", className)}
    />
  );
}
