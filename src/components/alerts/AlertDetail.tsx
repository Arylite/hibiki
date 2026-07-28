import { useEffect, useRef, useState } from "react";
import { Play, RotateCcw, Volume2 } from "lucide-react";

import { CopyStyleDialog } from "@/components/alerts/CopyStyleDialog";
import { MediaField } from "@/components/ui/media-field";
import { Block, Masonry } from "@/components/layout/Page";
import { FrameGroup, TypeGroup } from "@/components/widgets/frame-controls";
import { BadgeButton } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ColorInput } from "@/components/ui/color-input";
import { DebouncedInput } from "@/components/ui/debounced-input";
import { Group, Row, Rows } from "@/components/ui/group";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { SliderRow } from "@/components/ui/slider";
import { StreamPreview } from "@/components/ui/stream-preview";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { ALERT_META, sampleAlert, TEMPLATE_TOKENS } from "@/lib/alert-meta";
import { mediaUrl } from "@/lib/media";
import { AlertCard } from "@/overlay/AlertCard";
import { alertsService } from "@/services/alerts/alertsService";
import { useAlertStyleStore } from "@/stores/alertStyleStore";
import type { AlertKind } from "@/types/alert";
import type { AlertAnimation, AlertLayout, AlertStyle, TextAlign } from "@/types/settings";

const ANIMATIONS: { value: AlertAnimation; label: string }[] = [
  { value: "slide-up", label: "Slide up" },
  { value: "drop", label: "Drop" },
  { value: "slide-left", label: "Slide in" },
  { value: "pop", label: "Pop" },
  { value: "fade", label: "Fade" },
];

const LAYOUTS: { value: AlertLayout; label: string }[] = [
  { value: "image-top", label: "Top" },
  { value: "image-bottom", label: "Bottom" },
  { value: "image-left", label: "Left" },
  { value: "image-right", label: "Right" },
];

const ALIGNMENTS: { value: TextAlign; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "left", label: "Left" },
  { value: "center", label: "Centre" },
  { value: "right", label: "Right" },
];

const DEFAULT_BACKDROP = "#111111";

/** Only these kinds carry a number worth filtering on. */
const AMOUNT_LABELS: Partial<Record<AlertKind, string>> = {
  cheer: "bits",
  raid: "viewers",
  subscribeGift: "gifted subs",
};

export function AlertDetail({ kind, style }: { kind: AlertKind; style: AlertStyle }) {
  const update = useAlertStyleStore((s) => s.update);
  const [testing, setTesting] = useState(false);

  const { label, description } = ALERT_META[kind];
  const amountLabel = AMOUNT_LABELS[kind];

  const sendTest = async () => {
    setTesting(true);
    try {
      await alertsService.sendTest(kind);
      toast.ok(`Test ${label.toLowerCase()} sent to the overlay`);
    } catch (err) {
      toast.error("Could not send the test alert", String(err));
    } finally {
      setTimeout(() => setTesting(false), 600);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1000px] px-8 pt-7 pb-16">
      <header className="mb-6 flex items-start gap-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-display text-ink">{label}</h1>
          <p className="mt-2 text-lead text-ink-2">{description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3 pt-1.5">
          <CopyStyleDialog source={kind} style={style} />
          <label className="flex items-center gap-2.5">
            <span className="text-body text-ink-2">
              {style.enabled ? "Shown on stream" : "Hidden from stream"}
            </span>
            <Switch checked={style.enabled} onCheckedChange={(enabled) => update(kind, { enabled })} />
          </label>
        </div>
      </header>

      <AlertLivePreview kind={kind} style={style} testing={testing} onTest={sendTest} />

      <Masonry className="mt-8">
        <Block>
          <Group title="Text">
            <Rows>
              <Row label="Heading" description="The small line above the message." wide>
                <DebouncedInput value={style.title} onCommit={(title) => update(kind, { title })} />
              </Row>
              <Row label="Message" description="Click a placeholder to insert it at the caret." block>
                <TokenInput value={style.message} onCommit={(message) => update(kind, { message })} />
              </Row>
            </Rows>
          </Group>
        </Block>

        <Block>
          <Group title="Media">
            <Rows>
              <Row label="Image" description="PNG, GIF or WebP. Animated GIFs work.">
                <MediaField
                  accept="image/*"
                  value={style.image}
                  onChange={(image) => update(kind, { image })}
                  preview={
                    style.image ? (
                      <img
                        src={mediaUrl(style.image)}
                        alt=""
                        className="size-8 rounded-sm border border-line object-contain"
                      />
                    ) : null
                  }
                />
              </Row>
              {style.image && (
                <>
                  <Row label="Image size" wide>
                    <SliderRow
                      value={style.imageSize}
                      onChange={(imageSize) => update(kind, { imageSize })}
                      min={80}
                      max={600}
                      step={10}
                      format={(v) => `${v}px`}
                    />
                  </Row>
                  <Row label="Image corners" wide>
                    <SliderRow
                      value={style.imageRadius}
                      onChange={(imageRadius) => update(kind, { imageRadius })}
                      min={0}
                      max={48}
                      step={2}
                      format={(v) => (v === 0 ? "Square" : `${v}px`)}
                    />
                  </Row>
                </>
              )}
              <Row label="Sound" description="MP3, OGG or WAV. Falls back to a built-in chime.">
                <MediaField
                  accept="audio/*"
                  value={style.sound}
                  onChange={(sound) => update(kind, { sound })}
                  preview={
                    style.sound ? (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Play sound"
                        onClick={() => {
                          const audio = new Audio(mediaUrl(style.sound!));
                          audio.volume = style.volume;
                          audio.play().catch(() => {});
                        }}
                      >
                        <Volume2 />
                      </Button>
                    ) : null
                  }
                />
              </Row>
              <Row label="Volume" wide>
                <SliderRow
                  value={style.volume}
                  onChange={(volume) => update(kind, { volume })}
                  min={0}
                  max={1}
                  step={0.05}
                  format={(v) => `${Math.round(v * 100)}%`}
                />
              </Row>
            </Rows>
          </Group>
        </Block>

        <Block>
          <Group title="Look">
            <Rows>
              <Row label="Accent" description="Heading and the viewer's name.">
                <ColorInput value={style.accent} onChange={(accent) => update(kind, { accent })} />
              </Row>
              <Row label="Text" description="The message itself.">
                <ColorInput value={style.textColor} onChange={(textColor) => update(kind, { textColor })} />
              </Row>
              <Row label="Backdrop" description="Transparent sits straight on the stream.">
                {style.background === "transparent" ? (
                  <Button onClick={() => update(kind, { background: DEFAULT_BACKDROP })}>Add backdrop</Button>
                ) : (
                  <>
                    <ColorInput value={style.background} onChange={(background) => update(kind, { background })} />
                    <Button variant="ghost" onClick={() => update(kind, { background: "transparent" })}>
                      Clear
                    </Button>
                  </>
                )}
              </Row>
              <Row label="Text size" wide>
                <SliderRow
                  value={style.fontSize}
                  onChange={(fontSize) => update(kind, { fontSize })}
                  min={16}
                  max={96}
                  step={2}
                  format={(v) => `${v}px`}
                />
              </Row>
              <Row label="Heading size" description="Relative to the message." wide>
                <SliderRow
                  value={style.titleSize}
                  onChange={(titleSize) => update(kind, { titleSize })}
                  min={20}
                  max={120}
                  step={5}
                  format={(v) => `${v}%`}
                />
              </Row>
              <Row label="Heading in capitals">
                <Switch
                  checked={style.uppercaseTitle}
                  onCheckedChange={(uppercaseTitle) => update(kind, { uppercaseTitle })}
                />
              </Row>
              <Row label="Image placement" block>
                <Segmented options={LAYOUTS} value={style.layout} onChange={(layout) => update(kind, { layout })} />
              </Row>
              <Row label="Text alignment" description="Auto follows the image placement." block>
                <Segmented
                  options={ALIGNMENTS}
                  value={style.textAlign}
                  onChange={(textAlign) => update(kind, { textAlign })}
                />
              </Row>
            </Rows>
          </Group>
        </Block>

        <Block>
          <FrameGroup config={style} patch={(values) => update(kind, values)} />
        </Block>

        <Block>
          <TypeGroup config={style} patch={(values) => update(kind, values)} />
        </Block>

        <Block>
          <Group title="Motion">
            <Rows>
              <Row label="Entrance" block>
                <Segmented
                  options={ANIMATIONS}
                  value={style.animation}
                  onChange={(animation) => update(kind, { animation })}
                />
              </Row>
              <Row label="Duration" description="How long it stays on screen." wide>
                <SliderRow
                  value={style.durationMs}
                  onChange={(durationMs) => update(kind, { durationMs })}
                  min={2000}
                  max={20000}
                  step={500}
                  format={(v) => `${(v / 1000).toFixed(1)}s`}
                />
              </Row>
            </Rows>
          </Group>
        </Block>

        <Block>
          <Group title="Filters">
            <Rows>
              <Row
                label="Cooldown"
                description="Ignores repeats of this alert for a while. Test alerts always go through."
                wide
              >
                <SliderRow
                  value={style.cooldownMs}
                  onChange={(cooldownMs) => update(kind, { cooldownMs })}
                  min={0}
                  max={120000}
                  step={5000}
                  format={(v) => (v === 0 ? "Off" : `${v / 1000}s`)}
                />
              </Row>

              {amountLabel && (
                <Row
                  label={`Minimum ${amountLabel}`}
                  description="Skip events under this. Zero lets everything through."
                  wide
                >
                  <SliderRow
                    value={style.minAmount}
                    onChange={(minAmount) => update(kind, { minAmount })}
                    min={0}
                    max={kind === "cheer" ? 1000 : 50}
                    step={kind === "cheer" ? 50 : 1}
                    format={(v) => (v === 0 ? "Off" : String(v))}
                  />
                </Row>
              )}
            </Rows>
          </Group>
        </Block>
      </Masonry>

      {/* Follows the scroll: trying a change should never mean going back up
          for the button. Only the button takes clicks, not the strip. */}
      <div className="pointer-events-none sticky bottom-5 z-10 mt-6 flex justify-end">
        <Button
          variant="primary"
          size="lg"
          className="pointer-events-auto shadow-pop"
          onClick={sendTest}
          disabled={testing}
        >
          <Play />
          {testing ? "Sent to the overlay" : "Test on stream"}
        </Button>
      </div>
    </div>
  );
}

/** The real AlertCard against a sample payload. */
function AlertLivePreview({
  kind,
  style,
  testing,
  onTest,
}: {
  kind: AlertKind;
  style: AlertStyle;
  testing: boolean;
  onTest: () => void;
}) {
  // Bumping the key remounts the card, which replays its entrance animation.
  const [replay, setReplay] = useState(0);

  return (
    <StreamPreview
      notice={style.enabled ? undefined : "Not shown on stream"}
      action={
        <>
          <Button variant="ghost" size="sm" onClick={() => setReplay((n) => n + 1)}>
            <RotateCcw />
            Replay
          </Button>
          <Button variant="secondary" size="sm" onClick={onTest} disabled={testing}>
            <Play />
            {testing ? "Sent" : "Test on stream"}
          </Button>
        </>
      }
    >
      {/* The overlay centres its card; the preview mirrors that framing. */}
      <div className="flex size-full items-center justify-center p-10">
        <AlertCard key={replay} alert={sampleAlert(kind)} style={style} />
      </div>
    </StreamPreview>
  );
}

/** The message field. The template tokens insert at the caret, so the syntax
 *  never has to be typed by hand. */
function TokenInput({ value, onCommit }: { value: string; onCommit: (value: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(value);

  useEffect(() => setDraft(value), [value]);

  const insert = (token: string) => {
    const node = input.current;
    const at = node?.selectionStart ?? draft.length;
    const next = `${draft.slice(0, at)}${token}${draft.slice(node?.selectionEnd ?? at)}`;
    setDraft(next);
    onCommit(next);
    requestAnimationFrame(() => {
      node?.focus();
      node?.setSelectionRange(at + token.length, at + token.length);
    });
  };

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Input
        ref={input}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => draft !== value && onCommit(draft)}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      />
      <div className="flex flex-wrap gap-1">
        {TEMPLATE_TOKENS.map((token) => (
          <BadgeButton key={token} onClick={() => insert(token)} title={`Insert ${token}`}>
            <span className="num">{token}</span>
          </BadgeButton>
        ))}
      </div>
    </div>
  );
}
