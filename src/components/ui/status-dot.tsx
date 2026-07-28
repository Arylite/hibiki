import { cn } from "@/lib/utils";

export type StatusTone = "ok" | "warning" | "error" | "idle";

const TONES: Record<StatusTone, string> = {
  ok: "bg-accent",
  warning: "bg-warn",
  error: "bg-danger",
  idle: "bg-ink-3",
};

/** Semantic colour lives here and in a badge, never behind content. */
export function StatusDot({ tone, className }: { tone: StatusTone; className?: string }) {
  return <span className={cn("inline-block size-1.5 shrink-0 rounded-full", TONES[tone], className)} />;
}
