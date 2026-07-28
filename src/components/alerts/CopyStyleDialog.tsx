import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Row, Rows } from "@/components/ui/group";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { ALERT_KINDS, ALERT_META } from "@/lib/alert-meta";
import { useAlertStyleStore } from "@/stores/alertStyleStore";
import type { AlertKind } from "@/types/alert";
import type { AlertStyle } from "@/types/settings";

/** One alert's look, in the pieces a streamer thinks in. `enabled` is never in
 *  here: whether an alert fires is a decision about the alert, not its style. */
const ASPECTS = [
  { id: "text", label: "Wording", fields: ["title", "message"] },
  { id: "media", label: "Image and sound", fields: ["image", "imageSize", "imageRadius", "sound", "volume"] },
  {
    id: "look",
    label: "Colours and size",
    fields: [
      "accent",
      "textColor",
      "background",
      "backgroundOpacity",
      "backgroundMedia",
      "fontSize",
      "titleSize",
      "uppercaseTitle",
      "layout",
      "textAlign",
    ],
  },
  {
    id: "frame",
    label: "Frame",
    fields: ["cornerRadius", "borderColor", "borderWidth", "padding", "paddingX"],
  },
  { id: "type", label: "Typography", fields: ["fontFamily", "fontWeight", "textShadow"] },
  { id: "motion", label: "Motion", fields: ["animation", "durationMs"] },
  { id: "filters", label: "Filters", fields: ["cooldownMs", "minAmount"] },
] as const satisfies readonly { id: string; label: string; fields: readonly (keyof AlertStyle)[] }[];

type AspectId = (typeof ASPECTS)[number]["id"];

const ALL_ASPECTS = ASPECTS.map((aspect) => aspect.id);

function toggle<T>(values: Set<T>, value: T): Set<T> {
  const next = new Set(values);
  if (!next.delete(value)) next.add(value);
  return next;
}

/** Sends one alert's look to the others: everything, or only the parts you
 *  picked, so copying a frame does not overwrite four different images. */
export function CopyStyleDialog({ source, style }: { source: AlertKind; style: AlertStyle }) {
  const update = useAlertStyleStore((s) => s.update);
  const [open, setOpen] = useState(false);
  const [targets, setTargets] = useState<Set<AlertKind>>(new Set());
  const [mode, setMode] = useState<"all" | "some">("all");
  const [aspects, setAspects] = useState<Set<AspectId>>(new Set(ALL_ASPECTS));

  const chosen = ASPECTS.filter((aspect) => mode === "all" || aspects.has(aspect.id));
  const ready = targets.size > 0 && chosen.length > 0;

  const copy = () => {
    const patch = Object.fromEntries(
      chosen.flatMap((aspect) => aspect.fields.map((field) => [field, style[field]])),
    ) as Partial<AlertStyle>;
    for (const kind of targets) update(kind, patch);
    toast.ok(`Copied to ${targets.size === 1 ? "1 alert" : `${targets.size} alerts`}`);
    setOpen(false);
  };

  return (
    <Dialog.Root
      open={open}
      // Each visit starts from nothing selected: copying onto the wrong alert
      // is a mistake you only notice on stream.
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setTargets(new Set());
      }}
    >
      <Dialog.Trigger
        render={
          <Button variant="ghost" size="sm">
            <Copy />
            Copy style
          </Button>
        }
      />
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-ink/25 transition-opacity duration-150 data-ending:opacity-0 data-starting:opacity-0" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 flex max-h-[85vh] w-[420px] -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg border border-line bg-surface shadow-pop transition-[opacity,transform] duration-150 ease-[var(--ease-out-quiet)] data-ending:scale-[0.98] data-ending:opacity-0 data-starting:scale-[0.98] data-starting:opacity-0">
          <div className="p-5 pb-3">
            <Dialog.Title className="text-title text-ink">Copy this style</Dialog.Title>
            <Dialog.Description className="mt-1.5 text-body text-ink-2">
              Sends {ALERT_META[source].label.toLowerCase()}'s look to the alerts you pick. Whether they are
              shown on stream is left alone.
            </Dialog.Description>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pb-1">
            <div>
              <p className="label mb-2 text-ink-3">Copy to</p>
              <Rows>
                {ALERT_KINDS.filter((kind) => kind !== source).map((kind) => (
                  <Row key={kind} label={ALERT_META[kind].label}>
                    <Switch
                      checked={targets.has(kind)}
                      onCheckedChange={() => setTargets((current) => toggle(current, kind))}
                    />
                  </Row>
                ))}
              </Rows>
            </div>

            <div>
              <p className="label mb-2 text-ink-3">What to copy</p>
              <Segmented
                options={[
                  { value: "all", label: "Everything" },
                  { value: "some", label: "Choose" },
                ]}
                value={mode}
                onChange={setMode}
              />
              {mode === "some" && (
                <Rows className="mt-2">
                  {ASPECTS.map((aspect) => (
                    <Row key={aspect.id} label={aspect.label}>
                      <Switch
                        checked={aspects.has(aspect.id)}
                        onCheckedChange={() => setAspects((current) => toggle(current, aspect.id))}
                      />
                    </Row>
                  ))}
                </Rows>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 p-5 pt-4">
            <Dialog.Close render={<Button variant="ghost">Cancel</Button>} />
            <Button variant="primary" disabled={!ready} onClick={copy}>
              {targets.size > 1 ? `Copy to ${targets.size} alerts` : "Copy"}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
