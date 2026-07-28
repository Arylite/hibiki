import { Switch as SwitchPrimitive } from "@base-ui/react/switch";

import { cn } from "@/lib/utils";

function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "group relative inline-flex h-[18px] w-8 shrink-0 items-center rounded-full p-px",
        "bg-fill-strong transition-colors duration-150 inset-ring inset-ring-line-strong",
        "data-checked:bg-accent data-checked:inset-ring-transparent",
        "data-disabled:pointer-events-none data-disabled:opacity-45",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block size-4 rounded-full bg-surface shadow-raise",
          "transition-transform duration-150 ease-[var(--ease-out-quiet)]",
          "data-unchecked:translate-x-0 data-checked:translate-x-[14px]",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
