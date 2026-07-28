import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Settings pages read better narrow; pages built around a preview take the
 *  extra width. */
const WIDTH = {
  narrow: "max-w-[760px]",
  wide: "max-w-[1040px]",
} as const;

interface PageProps {
  children: ReactNode;
  width?: keyof typeof WIDTH;
  className?: string;
}

/** The scroll container and the column every page sits in. */
export function Page({ children, width = "wide", className }: PageProps) {
  return (
    <div className="h-full overflow-y-auto">
      <div className={cn("mx-auto w-full px-8 pt-7 pb-16", WIDTH[width], className)}>{children}</div>
    </div>
  );
}

interface PageHeaderProps {
  title: string;
  lede?: ReactNode;
  actions?: ReactNode;
  /** Trailing element, e.g. the mascot on the dashboard. */
  aside?: ReactNode;
  className?: string;
}

/** The page title lives here and only here. */
export function PageHeader({ title, lede, actions, aside, className }: PageHeaderProps) {
  return (
    <header className={cn("mb-8 flex items-start gap-6", className)}>
      <div className="min-w-0 flex-1">
        <h1 className="text-display text-ink">{title}</h1>
        {lede && <p className="mt-2 max-w-[68ch] text-lead text-ink-2">{lede}</p>}
        {actions && <div className="mt-4 flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {aside}
    </header>
  );
}

/** Stacked regions of a page, at one rhythm. */
export function Stack({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-col gap-7", className)}>{children}</div>;
}

/** Two columns of groups on a wide window, one on a narrow one. Columns, not a
 *  grid: the groups keep their own heights instead of matching a neighbour. */
export function Masonry({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("gap-7 @[900px]:columns-2", className)}>{children}</div>;
}

/** One item of a `Masonry`, never split across the fold between columns. */
export function Block({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mb-7 break-inside-avoid", className)}>{children}</div>;
}
