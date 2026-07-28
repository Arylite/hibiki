import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";

import { Block, Masonry, Page, PageHeader, Stack } from "@/components/layout/Page";
import { FrameGroup, TypeGroup } from "@/components/widgets/frame-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ColorInput } from "@/components/ui/color-input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DebouncedInput } from "@/components/ui/debounced-input";
import { Group, Panel, Row, Rows } from "@/components/ui/group";
import { Input } from "@/components/ui/input";
import { PositionGrid } from "@/components/ui/position-grid";
import { Segmented } from "@/components/ui/segmented";
import { LoadingPane } from "@/components/ui/skeleton";
import { SliderRow } from "@/components/ui/slider";
import { StreamPreview } from "@/components/ui/stream-preview";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { GoalBar } from "@/overlay/GoalBar";
import { settingsService } from "@/services/settingsService";
import { useSettingsStore } from "@/stores/settingsStore";
import type { GoalKind, GoalWidget } from "@/types/settings";

const KINDS: { value: GoalKind; label: string; unit: string }[] = [
  { value: "follow", label: "Follows", unit: "follows" },
  { value: "subscribe", label: "Subs", unit: "subs" },
  { value: "cheer", label: "Bits", unit: "bits" },
];

const BAR_SHAPES = [
  { value: "0", label: "Square" },
  { value: "6", label: "Rounded" },
  { value: "999", label: "Pill" },
];

/** The translucent white the bar sits on. */
const DEFAULT_TRACK = "rgba(255,255,255,0.22)";

export function GoalPage() {
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);
  const load = useSettingsStore((s) => s.load);
  const [current, setCurrent] = useState(0);

  // The live count is pushed to the overlay over the socket; the app reads the
  // stored target and shows progress against it after a reload.
  useEffect(() => {
    setCurrent(0);
  }, [settings?.goal.startedAt]);

  if (!settings) return <LoadingPane label="Loading goal" />;

  const goal = settings.goal;
  const patch = (values: Partial<GoalWidget>) => update({ goal: { ...goal, ...values } });
  const unit = KINDS.find((k) => k.value === goal.kind)?.unit ?? "";
  const progress = goal.target > 0 ? Math.min(1, current / goal.target) : 0;

  const reset = async () => {
    await settingsService.resetGoal();
    await load();
    toast.ok("Goal progress reset", "Counting restarts from now; the history is kept.");
  };

  return (
    <Page>
      <PageHeader
        title="Goal"
        lede="A progress bar viewers can push. It counts events from the moment you last reset it."
      />

      <Stack>
        <div className="grid grid-cols-1 gap-7 @[880px]:grid-cols-2">
          <Group title="Progress">
            <Panel className="p-4">
              <div className="flex items-baseline gap-3">
                <span className="num text-[28px] leading-none font-medium tracking-tight text-ink">
                  {current}
                  <span className="text-ink-3"> / {goal.target}</span>
                </span>
                <span className="text-body text-ink-3">{unit}</span>
                <Badge tone={goal.enabled ? "ok" : "idle"} className="ml-auto">
                  {goal.enabled ? "On stream" : "Hidden"}
                </Badge>
              </div>
              <div className="mt-3.5 h-1.5 w-full overflow-hidden rounded-full bg-fill-strong">
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-300 ease-[var(--ease-out-quiet)]"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              {goal.label && <p className="mt-2.5 text-sm text-ink-3">{goal.label}</p>}
            </Panel>
          </Group>

          <Group title="On stream">
            <StreamPreview notice={goal.enabled ? undefined : "Not shown on stream"}>
              <GoalBar
                config={{ ...goal, enabled: true }}
                state={{ current, target: goal.target }}
                pad={settings.overlayPadding}
              />
            </StreamPreview>
          </Group>
        </div>

        <Masonry>
          <Block>
            <Group title="Widget">
              <Rows>
                <Row label="Show on stream" description="Adds the bar to the overlay OBS is already showing.">
                  <Switch checked={goal.enabled} onCheckedChange={(enabled) => patch({ enabled })} />
                </Row>
                <Row label="Counts">
                  <Segmented options={KINDS} value={goal.kind} onChange={(kind) => patch({ kind })} />
                </Row>
                <Row label="Label" description="Shown above the bar." wide>
                  <DebouncedInput value={goal.label} onCommit={(label) => patch({ label })} />
                </Row>
                <Row label="Target" description={`Counted in ${unit}.`}>
                  <Input
                    type="number"
                    min={1}
                    mono
                    value={goal.target}
                    onChange={(e) => patch({ target: Math.max(1, Number(e.target.value) || 1) })}
                    className="w-24"
                  />
                </Row>
                <Row label="Progress" description="Counting restarts from now; the history is kept.">
                  <ConfirmDialog
                    trigger={
                      <Button variant="danger">
                        <RotateCcw />
                        Reset
                      </Button>
                    }
                    title="Reset the goal?"
                    description="The counter goes back to zero and starts again from now. Recorded events are not deleted."
                    confirmLabel="Reset progress"
                    onConfirm={reset}
                  />
                </Row>
                <Row label="Text">
                  <ColorInput value={goal.textColor} onChange={(textColor) => patch({ textColor })} />
                </Row>
                <Row label="Backdrop" description="Transparent sits straight on the stream.">
                  {goal.background === "transparent" ? (
                    <Button onClick={() => patch({ background: "#111111" })}>Add backdrop</Button>
                  ) : (
                    <>
                      <ColorInput value={goal.background} onChange={(background) => patch({ background })} />
                      <Button variant="ghost" onClick={() => patch({ background: "transparent" })}>
                        Clear
                      </Button>
                    </>
                  )}
                </Row>
                <Row label="Text size" wide>
                  <SliderRow
                    value={goal.fontSize}
                    onChange={(fontSize) => patch({ fontSize })}
                    min={12}
                    max={64}
                    step={1}
                    format={(v) => `${v}px`}
                  />
                </Row>
              </Rows>
            </Group>
          </Block>

          <Block>
            <Group title="Bar">
              <Rows>
                <Row label="Bar colour">
                  <ColorInput value={goal.accent} onChange={(accent) => patch({ accent })} />
                </Row>
                <Row label="Track" description="What the bar fills up.">
                  {goal.trackColor === DEFAULT_TRACK ? (
                    <Button onClick={() => patch({ trackColor: "#2A2A2A" })}>Pick a colour</Button>
                  ) : (
                    <>
                      <ColorInput value={goal.trackColor} onChange={(trackColor) => patch({ trackColor })} />
                      <Button variant="ghost" onClick={() => patch({ trackColor: DEFAULT_TRACK })}>
                        Reset
                      </Button>
                    </>
                  )}
                </Row>
                <Row label="Height" description="Zero scales it with the text." wide>
                  <SliderRow
                    value={goal.barHeight}
                    onChange={(barHeight) => patch({ barHeight })}
                    min={0}
                    max={64}
                    step={2}
                    format={(v) => (v === 0 ? "Auto" : `${v}px`)}
                  />
                </Row>
                <Row label="Shape">
                  <Segmented
                    options={BAR_SHAPES}
                    value={String(goal.barRadius)}
                    onChange={(value) => patch({ barRadius: Number(value) })}
                  />
                </Row>
                <Row label="Show the count" description="'12/50' beside the label.">
                  <Switch checked={goal.showValue} onCheckedChange={(showValue) => patch({ showValue })} />
                </Row>
                <Row label="Show the percentage">
                  <Switch checked={goal.showPercent} onCheckedChange={(showPercent) => patch({ showPercent })} />
                </Row>
              </Rows>
            </Group>
          </Block>

          <Block>
            <FrameGroup
              config={goal}
              patch={patch}
              width={{ value: goal.width, onChange: (width) => patch({ width }) }}
            />
          </Block>

          <Block>
            <TypeGroup config={goal} patch={patch} />
          </Block>

          <Block>
            <Group title="Position">
              <PositionGrid value={goal.position} onChange={(position) => patch({ position })} />
              <p className="mt-2.5 px-0.5 text-sm text-ink-3">
                Independent of where alerts and the music strip land.
              </p>
            </Group>
          </Block>
        </Masonry>
      </Stack>
    </Page>
  );
}
