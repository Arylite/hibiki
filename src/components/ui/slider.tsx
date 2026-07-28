import { Slider as SliderPrimitive } from "@base-ui/react/slider";

import { cn } from "@/lib/utils";

function Slider({ className, value, min = 0, max = 100, ...props }: SliderPrimitive.Root.Props) {
  return (
    <SliderPrimitive.Root className={cn("w-full", className)} value={value} min={min} max={max} {...props}>
      <SliderPrimitive.Control className="relative flex w-full touch-none items-center py-1.5 select-none data-disabled:opacity-45">
        <SliderPrimitive.Track className="relative h-1 w-full grow rounded-full bg-fill-strong select-none">
          <SliderPrimitive.Indicator className="h-full rounded-full bg-accent select-none" />
        </SliderPrimitive.Track>
        {/* The invisible inset is the real hit target: 14px of thumb is a small
            thing to catch with a mouse while a stream is running. */}
        <SliderPrimitive.Thumb className="relative block size-3.5 shrink-0 rounded-full border border-line-strong bg-surface shadow-raise transition-transform duration-100 select-none after:absolute after:-inset-2 hover:scale-110" />
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

interface SliderRowProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  /** Rendered in the fixed column on the right, so a stack of them lines up. */
  format: (value: number) => string;
  className?: string;
}

/** Slider plus its readout. */
function SliderRow({ value, onChange, min, max, step, format, className }: SliderRowProps) {
  return (
    <div className={cn("flex w-full items-center gap-3", className)}>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(next) => onChange(Array.isArray(next) ? next[0] : next)}
      />
      <span className="num w-12 shrink-0 text-right text-sm text-ink-2">{format(value)}</span>
    </div>
  );
}

export { Slider, SliderRow };
