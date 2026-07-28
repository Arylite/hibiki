import logo from "@/assets/logo.png";
import { cn } from "@/lib/utils";

/** The mascot. The radius is a percentage, not a fixed value: 8px on a 22px
 *  mark and 8px on a 56px one are two different shapes. */
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
