import { Toast as ToastPrimitive } from "@base-ui/react/toast";
import { X } from "lucide-react";

import { StatusDot, type StatusTone } from "@/components/ui/status-dot";
import { cn } from "@/lib/utils";

/** Created outside React so stores and services can report without a hook. */
export const toastManager = ToastPrimitive.createToastManager();

type Tone = "ok" | "warn" | "error";

const DOT: Record<Tone, StatusTone> = { ok: "ok", warn: "warning", error: "error" };

/** Everything that can fail reports through here. */
export const toast = {
  ok: (title: string, description?: string) => toastManager.add({ title, description, type: "ok" }),
  warn: (title: string, description?: string) => toastManager.add({ title, description, type: "warn" }),
  error: (title: string, description?: string) =>
    toastManager.add({ title, description, type: "error", timeout: 8000 }),
};

function ToastList() {
  const { toasts } = ToastPrimitive.useToastManager();

  return toasts.map((item) => {
    const tone = (item.type as Tone) ?? "ok";
    return (
      <ToastPrimitive.Root
        key={item.id}
        toast={item}
        className={cn(
          "group relative flex w-[320px] gap-2.5 rounded-lg border border-line bg-surface py-2.5 pr-2.5 pl-3 shadow-pop",
          "transition-[opacity,transform] duration-200 ease-[var(--ease-out-quiet)]",
          "data-ending:opacity-0 data-starting:translate-y-2 data-starting:opacity-0",
        )}
      >
        <StatusDot tone={DOT[tone]} className="mt-[7px]" />
        <div className="min-w-0 flex-1">
          <ToastPrimitive.Title className="text-body font-medium text-ink" />
          <ToastPrimitive.Description className="mt-0.5 text-sm text-ink-2" />
        </div>
        <ToastPrimitive.Close
          aria-label="Dismiss"
          className="-mt-0.5 -mr-0.5 flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-sm text-ink-3 opacity-0 transition-opacity hover:bg-fill hover:text-ink group-hover:opacity-100"
        >
          <X className="size-3.5" />
        </ToastPrimitive.Close>
      </ToastPrimitive.Root>
    );
  });
}

/** Mounted once by the app shell. The overlay route never mounts it. */
export function Toaster() {
  return (
    <ToastPrimitive.Provider toastManager={toastManager} limit={4}>
      <ToastPrimitive.Portal>
        <ToastPrimitive.Viewport className="fixed right-4 bottom-4 z-40 flex w-[320px] flex-col-reverse gap-2">
          <ToastList />
        </ToastPrimitive.Viewport>
      </ToastPrimitive.Portal>
    </ToastPrimitive.Provider>
  );
}
