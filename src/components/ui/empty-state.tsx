import type { ReactNode } from "react";

import logo from "@/assets/logo.png";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/** One shape for every empty state in the app. The mascot appears here and
 *  nowhere else at size — an empty screen is the right place for a face. */
export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-12 text-center", className)}>
      <img src={logo} alt="" draggable={false} className="size-11 opacity-90" />
      <h3 className="mt-4 text-title text-ink">{title}</h3>
      {description && <p className="mt-1.5 max-w-[46ch] text-body text-ink-3">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
