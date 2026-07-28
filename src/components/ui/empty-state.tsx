import type { ReactNode } from "react";

import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/** One shape for every empty state in the app. */
export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-12 text-center", className)}>
      <Logo size={44} />
      <h3 className="mt-4 text-title text-ink">{title}</h3>
      {description && <p className="mt-1.5 max-w-[46ch] text-body text-ink-3">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
