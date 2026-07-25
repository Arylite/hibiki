import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";

interface CopyButtonProps {
  value: string;
  /** Omit for an icon-only button. */
  label?: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
}

/** Confirms in place. A copy is too small a thing to spend a toast on. */
export function CopyButton({ value, label, variant = "ghost", size = "sm" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
  };

  const Icon = copied ? Check : Copy;

  return (
    <Button
      variant={variant}
      size={label ? size : size === "md" ? "icon-md" : "icon-sm"}
      onClick={copy}
      disabled={!value}
      aria-label={label ?? "Copy"}
    >
      <Icon className={copied ? "text-accent" : undefined} />
      {label ? (copied ? "Copied" : label) : null}
    </Button>
  );
}
