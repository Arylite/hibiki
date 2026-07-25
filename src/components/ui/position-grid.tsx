import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";

import { cn } from "@/lib/utils";
import type { AlertPosition } from "@/types/settings";

const POSITIONS: AlertPosition[] = [
  "top-left",
  "top-center",
  "top-right",
  "center-left",
  "center",
  "center-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
];

/** A 16:9 stand-in for the stream canvas: pick a cell, that is where it lands.
 *  On RadioGroup, so arrow keys move between cells. */
export function PositionGrid({
  value,
  onChange,
  className,
}: {
  value: AlertPosition;
  onChange: (position: AlertPosition) => void;
  className?: string;
}) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(next) => onChange(next as AlertPosition)}
      aria-label="Position on the stream canvas"
      className={cn(
        "grid aspect-video w-full grid-cols-3 grid-rows-3 gap-1 rounded-lg border border-line bg-surface p-1 shadow-raise",
        className,
      )}
    >
      {POSITIONS.map((position) => {
        const name = position.replace("-", " ");
        return (
          <Radio.Root
            key={position}
            value={position}
            aria-label={name}
            title={name}
            className={cn(
              "group flex cursor-pointer items-center justify-center rounded-sm transition-colors duration-100",
              "hover:bg-fill data-checked:bg-accent-soft",
            )}
          >
            <span className="size-1.5 rounded-full bg-line-strong transition-colors group-data-checked:bg-accent" />
          </Radio.Root>
        );
      })}
    </RadioGroup>
  );
}
