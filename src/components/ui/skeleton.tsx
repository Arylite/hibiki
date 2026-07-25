import { cn } from "@/lib/utils";

/** A quiet pulse, not a sweeping highlight. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-fill", className)} aria-hidden />;
}

/** Page-level placeholder. Five pages used to return nothing and flash blank;
 *  this holds the shape of what is coming. */
export function LoadingPane({ label = "Loading" }: { label?: string }) {
  return (
    <div className="mx-auto w-full max-w-[1040px] px-8 py-7" aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}</span>
      <Skeleton className="h-7 w-56" />
      <Skeleton className="mt-3 h-4 w-96" />
      <div className="mt-8 space-y-2.5">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
