import { forwardRef, useEffect, useState } from "react";

import { Input } from "@/components/ui/input";

interface DebouncedInputProps {
  value: string;
  onCommit: (value: string) => void;
  className?: string;
  placeholder?: string;
}

/** Commits on blur or Enter, so typing does not write to sqlite per keystroke. */
export const DebouncedInput = forwardRef<HTMLInputElement, DebouncedInputProps>(
  ({ value, onCommit, className, placeholder }, ref) => {
    const [draft, setDraft] = useState(value);

    useEffect(() => setDraft(value), [value]);

    return (
      <Input
        ref={ref}
        value={draft}
        className={className}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => draft !== value && onCommit(draft)}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      />
    );
  },
);

DebouncedInput.displayName = "DebouncedInput";
