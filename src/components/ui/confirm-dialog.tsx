import { AlertDialog } from "@base-ui/react/alert-dialog";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  /** The control that opens it - rendered as the trigger. */
  trigger: ReactNode;
  title: string;
  description: string;
  /** Label for the confirming action, e.g. "Clear history". */
  confirmLabel: string;
  onConfirm: () => void;
}

/** Irreversible actions get a gate. On AlertDialog, so focus trapping, Esc and
 *  focus restoration are the primitive's problem. */
export function ConfirmDialog({ trigger, title, description, confirmLabel, onConfirm }: ConfirmDialogProps) {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger render={trigger as React.ReactElement} />
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-40 bg-ink/25 transition-opacity duration-150 data-ending:opacity-0 data-starting:opacity-0" />
        <AlertDialog.Popup className="fixed top-1/2 left-1/2 z-50 w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-line bg-surface p-5 shadow-pop transition-[opacity,transform] duration-150 ease-[var(--ease-out-quiet)] data-ending:scale-[0.98] data-ending:opacity-0 data-starting:scale-[0.98] data-starting:opacity-0">
          <AlertDialog.Title className="text-title text-ink">{title}</AlertDialog.Title>
          <AlertDialog.Description className="mt-1.5 text-body text-ink-2">{description}</AlertDialog.Description>
          <div className="mt-5 flex justify-end gap-2">
            <AlertDialog.Close render={<Button variant="ghost">Cancel</Button>} />
            <AlertDialog.Close
              render={
                <Button variant="danger" className="bg-danger-soft" onClick={onConfirm}>
                  {confirmLabel}
                </Button>
              }
            />
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
