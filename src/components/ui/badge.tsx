import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** A state: on/off, live/idle, the kind of an event. */
const badgeVariants = cva(
  "inline-flex h-5 shrink-0 items-center gap-1 rounded-full px-2 text-xs font-medium whitespace-nowrap transition-colors duration-100",
  {
    variants: {
      tone: {
        neutral: "bg-fill text-ink-2",
        ok: "bg-accent-soft text-accent",
        warn: "bg-warn-soft text-warn",
        danger: "bg-danger-soft text-danger",
        idle: "bg-fill text-ink-3",
        solid: "bg-accent text-accent-ink",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

interface BadgeProps extends VariantProps<typeof badgeVariants> {
  children: ReactNode;
  className?: string;
}

function Badge({ children, tone, className }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)}>{children}</span>;
}

interface BadgeButtonProps extends BadgeProps {
  onClick: () => void;
  pressed?: boolean;
  title?: string;
}

/** The same shape as a real button, for history filters and the template
 *  tokens. `aria-pressed` so a screen reader hears the toggle. */
function BadgeButton({ children, tone, className, onClick, pressed, title }: BadgeButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      title={title}
      className={cn(
        badgeVariants({ tone: pressed ? "solid" : (tone ?? "neutral") }),
        "cursor-pointer",
        !pressed && "hover:bg-fill-strong hover:text-ink",
        className,
      )}
    >
      {children}
    </button>
  );
}

export { Badge, BadgeButton, badgeVariants };
