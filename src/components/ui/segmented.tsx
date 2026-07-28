import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";

import { cn } from "@/lib/utils";

interface SegmentedProps<T extends string> {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/** One choice from a few. On RadioGroup, which brings the role and the
 *  arrow-key navigation with it. */
export function Segmented<T extends string>({ options, value, onChange, className }: SegmentedProps<T>) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(next) => onChange(next as T)}
      className={cn("inline-flex flex-wrap gap-0.5 rounded-md bg-fill p-0.5", className)}
    >
      {options.map((option) => (
        <Radio.Root
          key={option.value}
          value={option.value}
          className={cn(
            // Flex-centred, not padded: the label is a text node inside the
            // primitive's own element, so line-height alone leaves it high.
            "inline-flex h-6 cursor-pointer items-center justify-center rounded-sm px-2 text-sm leading-none",
            "text-ink-2 transition-colors duration-100 hover:text-ink",
            "data-checked:bg-surface data-checked:text-ink data-checked:shadow-raise",
          )}
        >
          {option.label}
        </Radio.Root>
      ))}
    </RadioGroup>
  );
}
