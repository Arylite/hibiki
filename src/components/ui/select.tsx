import { Select as SelectPrimitive } from "@base-ui/react/select";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";

interface SelectProps<T extends string> {
  options: readonly { value: T; label: string; hint?: string }[];
  value: T;
  onChange: (value: T) => void;
  /** Announced name for the trigger, since the label sits in the row. */
  label: string;
  className?: string;
}

/** A dropdown for one choice out of a list too long for a segmented control. */
export function Select<T extends string>({ options, value, onChange, label, className }: SelectProps<T>) {
  return (
    <SelectPrimitive.Root
      value={value}
      onValueChange={(next) => next && onChange(next as T)}
      items={options as { value: T; label: string }[]}
    >
      <SelectPrimitive.Trigger
        aria-label={label}
        className={cn(
          "inline-flex h-8 min-w-0 items-center justify-between gap-2 rounded-md border border-line-strong bg-surface px-2.5",
          "text-body text-ink shadow-raise transition-colors duration-100 select-none hover:bg-fill",
          className,
        )}
      >
        <SelectPrimitive.Value className="truncate" />
        <SelectPrimitive.Icon className="shrink-0 text-ink-3">
          <ChevronsUpDown className="size-3.5" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Positioner sideOffset={4} className="z-50">
          <SelectPrimitive.Popup
            className={cn(
              "max-h-[min(24rem,var(--available-height))] min-w-[var(--anchor-width)] overflow-y-auto rounded-lg border border-line bg-surface p-1 shadow-pop",
              "transition-[opacity,transform] duration-150 ease-[var(--ease-out-quiet)]",
              "data-ending:scale-[0.98] data-ending:opacity-0 data-starting:scale-[0.98] data-starting:opacity-0",
            )}
          >
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-body text-ink-2 select-none",
                  "data-highlighted:bg-fill data-highlighted:text-ink data-selected:text-ink",
                )}
              >
                <SelectPrimitive.ItemIndicator className="shrink-0 text-accent">
                  <Check className="size-3.5" />
                </SelectPrimitive.ItemIndicator>
                <span className="min-w-0 flex-1">
                  <SelectPrimitive.ItemText className="truncate">{option.label}</SelectPrimitive.ItemText>
                  {option.hint && <span className="block text-sm text-ink-3">{option.hint}</span>}
                </span>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
