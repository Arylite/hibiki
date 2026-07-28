import { useEffect, useRef, useState } from "react";
import { Download, Trash2, Upload } from "lucide-react";

import { Page, PageHeader, Stack } from "@/components/layout/Page";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Group, Row, Rows } from "@/components/ui/group";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { exportPreset, importPreset } from "@/lib/preset-file";
import { formatRelative } from "@/lib/time";
import { presetsService, type PresetSummary } from "@/services/presetsService";
import { useAlertStyleStore } from "@/stores/alertStyleStore";
import { useSettingsStore } from "@/stores/settingsStore";
import type { AlertKind } from "@/types/alert";

export function PresetsPage() {
  return (
    <Page width="narrow">
      <PageHeader
        title="Presets"
        lede="A whole look saved under a name: the alerts and the three on-stream widgets. A .rbn file carries one to another machine with its images, sounds and backdrops inside."
      />
      <Stack>
        <PresetsSection />
      </Stack>
    </Page>
  );
}

/** Looks kept by name and swapped in one click, and the `.rbn` they travel in. */
function PresetsSection() {
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);
  const loadSettings = useSettingsStore((s) => s.load);
  const styles = useAlertStyleStore((s) => s.styles);
  const updateStyle = useAlertStyleStore((s) => s.update);
  const loadStyles = useAlertStyleStore((s) => s.load);

  const input = useRef<HTMLInputElement>(null);
  const [presets, setPresets] = useState<PresetSummary[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<"exporting" | "importing" | null>(null);

  const refresh = () => presetsService.list().then(setPresets);
  useEffect(() => {
    refresh();
  }, []);

  const save = async () => {
    try {
      await presetsService.save(name);
      setName("");
      await refresh();
      toast.ok("Preset saved");
    } catch (err) {
      toast.error("Could not save the preset", String(err));
    }
  };

  const apply = async (preset: string) => {
    try {
      await presetsService.apply(preset);
      await Promise.all([loadSettings(), loadStyles()]);
      toast.ok(`Switched to ${preset}`);
    } catch (err) {
      toast.error("Could not apply the preset", String(err));
    }
  };

  const remove = async (preset: string) => {
    await presetsService.remove(preset);
    await refresh();
  };

  const exportFile = async () => {
    if (!settings || !styles) return;
    setBusy("exporting");
    try {
      await exportPreset({
        hibikiStyles: 1,
        styles,
        nowPlaying: settings.nowPlaying,
        goal: settings.goal,
        chat: settings.chat,
      });
    } catch (err) {
      toast.error("Could not export the preset", String(err));
    } finally {
      setBusy(null);
    }
  };

  const importFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy("importing");
    try {
      const incoming = await importPreset(file);
      for (const [kind, style] of Object.entries(incoming.styles ?? {})) {
        updateStyle(kind as AlertKind, style);
      }
      if (settings) {
        update({
          ...(incoming.nowPlaying && { nowPlaying: { ...settings.nowPlaying, ...incoming.nowPlaying } }),
          // The goal's clock belongs to this install, not to the file.
          ...(incoming.goal && {
            goal: { ...settings.goal, ...incoming.goal, startedAt: settings.goal.startedAt },
          }),
          ...(incoming.chat && { chat: { ...settings.chat, ...incoming.chat } }),
        });
      }
      toast.ok("Preset imported");
    } catch (err) {
      toast.error("That file is not a Hibiki preset", String(err));
    } finally {
      setBusy(null);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <Group title="Saved looks">
      <Rows>
        <Row label="Save what is on screen now" wide>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && name.trim() && save()}
            placeholder="Match day"
          />
          <Button onClick={save} disabled={!name.trim()}>
            Save
          </Button>
        </Row>

        {presets.map((preset) => (
          <Row key={preset.name} label={preset.name} description={formatRelative(preset.savedAt)}>
            <Button onClick={() => apply(preset.name)}>Apply</Button>
            <ConfirmDialog
              trigger={
                <Button variant="ghost" size="icon-md" aria-label={`Delete ${preset.name}`}>
                  <Trash2 />
                </Button>
              }
              title={`Delete ${preset.name}?`}
              description="The look itself is not changed, and the images and sounds it used stay where they are."
              confirmLabel="Delete preset"
              onConfirm={() => remove(preset.name)}
            />
          </Row>
        ))}

        <Row label="Export" description="Writes a .rbn to your downloads folder.">
          <Button disabled={!settings || !styles || busy !== null} onClick={exportFile}>
            <Download />
            {busy === "exporting" ? "Collecting media..." : "Export"}
          </Button>
        </Row>
        <Row label="Import" description="Replaces the looks in the file. Everything else is left alone.">
          <input
            ref={input}
            type="file"
            accept=".rbn"
            className="hidden"
            onChange={(e) => importFile(e.target.files?.[0])}
          />
          <Button onClick={() => input.current?.click()} disabled={busy !== null}>
            <Upload />
            {busy === "importing" ? "Importing..." : "Import"}
          </Button>
        </Row>
      </Rows>
    </Group>
  );
}
