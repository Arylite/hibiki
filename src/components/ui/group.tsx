import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface GroupProps {
  /** Sits above the container, not inside it — the heading belongs to the
   *  page, the container belongs to the content. */
  title?: string;
  description?: ReactNode;
  /** Trailing control on the heading line. */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** A titled region of a page. The whole app is built from these. */
export function Group({ title, description, action, children, className }: GroupProps) {
  return (
    <section className={cn("min-w-0", className)}>
      {(title || action) && (
        <div className="mb-2.5 flex items-baseline gap-3 px-0.5">
          <div className="min-w-0 flex-1">
            {title && <h2 className="text-body font-semibold text-ink">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-ink-3">{description}</p>}
          </div>
          {action && <div className="flex shrink-0 items-center gap-1">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

/** The one raised surface in the design: a hairline, a radius, and the
 *  faintest lift off the canvas. Nothing else floats. */
export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-lg border border-line bg-surface shadow-raise", className)}>
      {children}
    </div>
  );
}

/** A panel of rows, divided by rules rather than separated by gaps. */
export function Rows({ children, className }: { children: ReactNode; className?: string }) {
  return <Panel className={cn("divide-y divide-line", className)}>{children}</Panel>;
}

interface RowProps {
  label?: ReactNode;
  description?: ReactNode;
  /** Gives the control a fixed measure — sliders and text fields want it. */
  wide?: boolean;
  /** Puts the control under the label instead of beside it. */
  block?: boolean;
  children?: ReactNode;
  className?: string;
}

/** Label left, control right. One row, one decision. */
export function Row({ label, description, wide, block, children, className }: RowProps) {
  if (block) {
    return (
      <div className={cn("px-3.5 py-3", className)}>
        {label && <p className="text-body text-ink">{label}</p>}
        {description && <p className="mt-0.5 text-sm text-ink-3">{description}</p>}
        <div className="mt-2">{children}</div>
      </div>
    );
  }

  return (
    <div className={cn("flex min-h-12 items-center gap-4 px-3.5 py-2.5", className)}>
      {(label || description) && (
        <div className="min-w-0 flex-1">
          {label && <p className="text-body text-ink">{label}</p>}
          {description && <p className="mt-0.5 text-sm text-ink-3">{description}</p>}
        </div>
      )}
      <div
        className={cn(
          "flex shrink-0 items-center justify-end gap-2",
          wide && "w-[248px] max-w-[55%]",
          !label && !description && "min-w-0 flex-1 justify-start",
        )}
      >
        {children}
      </div>
    </div>
  );
}

/** A row that goes somewhere. Whole row is the target, as it should be. */
export function RowButton({
  onClick,
  disabled,
  children,
  className,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex min-h-12 w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors duration-100",
        "hover:bg-fill disabled:pointer-events-none disabled:opacity-45",
        className,
      )}
    >
      {children}
    </button>
  );
}
