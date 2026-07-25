import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";

import { cn } from "@/lib/utils";

interface InputProps extends React.ComponentProps<"input"> {
  /** Ports, client IDs, hex and URLs are data, not prose. */
  mono?: boolean;
  /** Draws the danger border; pair it with a message under the field. */
  invalid?: boolean;
}

/** The border stays put on focus — the ring comes from the global focus rule,
 *  so nothing shifts under the eye at the moment you start typing. */
function Input({ className, type, mono, invalid, ...props }: InputProps) {
  return (
    <InputPrimitive
      type={type}
      aria-invalid={invalid || undefined}
      className={cn(
        "h-8 w-full min-w-0 rounded-md border border-line-strong bg-surface px-2.5 text-body text-ink",
        "shadow-raise transition-colors duration-100 placeholder:text-ink-3 hover:border-ink-3",
        "disabled:pointer-events-none disabled:opacity-45",
        mono && "num text-sm",
        invalid && "border-danger hover:border-danger",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
