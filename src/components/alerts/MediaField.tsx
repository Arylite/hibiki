import { useRef, useState, type ReactNode } from "react";
import { Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { alertsService } from "@/services/alerts/alertsService";

interface MediaFieldProps {
  /** MIME filter for the picker, e.g. "image/*". */
  accept: string;
  value: string | null;
  onChange: (file: string | null) => void;
  /** Rendered next to the buttons when a file is set (thumbnail, play button). */
  preview?: ReactNode;
}

/** A plain file input: browsers hide real paths, so the bytes go to the
 *  backend, which copies them into its media directory and hands back a name. */
export function MediaField({ accept, value, onChange, preview }: MediaFieldProps) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await alertsService.importMedia(file));
    } catch (err) {
      toast.error("Could not import that file", String(err));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-2">
      {value && preview}
      <input ref={input} type="file" accept={accept} className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      <Button onClick={() => input.current?.click()} disabled={busy} aria-busy={busy}>
        <Upload />
        {busy ? "Importing..." : value ? "Replace" : "Choose file"}
      </Button>
      {value && (
        <Button variant="ghost" size="icon-md" onClick={() => onChange(null)} aria-label="Remove">
          <Trash2 />
        </Button>
      )}
    </div>
  );
}
