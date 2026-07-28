import { cn } from "@/lib/utils";

/** The native picker, with the hex beside it: matching a brand colour means
 *  reading the value, not just seeing it. */
export function ColorInput({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="num text-sm text-ink-2 uppercase">{value}</span>
      <span className="relative size-7 shrink-0 overflow-hidden rounded-md border border-line-strong shadow-raise">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Colour"
          /* Scaled up inside a clipping mask: browsers draw a border and inner
             padding on colour inputs that no property removes. */
          className="absolute -inset-2 size-[calc(100%+16px)] cursor-pointer border-0 bg-transparent p-0"
        />
      </span>
    </span>
  );
}
