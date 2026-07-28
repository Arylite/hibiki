import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/** Four intents, three heights. */
const buttonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap",
    "transition-[background-color,border-color,color] duration-100 select-none",
    "disabled:pointer-events-none disabled:opacity-45",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-ink hover:bg-accent-hover",
        secondary: "border border-line-strong bg-surface text-ink shadow-raise hover:bg-fill",
        ghost: "text-ink-2 hover:bg-fill hover:text-ink",
        danger: "text-danger hover:bg-danger-soft",
      },
      size: {
        sm: "h-7 px-2.5 text-sm [&_svg]:size-3.5",
        md: "h-8 px-3 text-body [&_svg]:size-4",
        lg: "h-9 px-4 text-body [&_svg]:size-4",
        "icon-sm": "size-7 [&_svg]:size-3.5",
        "icon-md": "size-8 [&_svg]:size-4",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

function Button({ className, variant, size, ...props }: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return <ButtonPrimitive className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { Button, buttonVariants };
