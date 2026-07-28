import { Button } from "@/components/ui/button";
import { ColorInput } from "@/components/ui/color-input";
import { Group, Row, Rows } from "@/components/ui/group";
import { Segmented } from "@/components/ui/segmented";
import { SliderRow } from "@/components/ui/slider";
import { FONT_WEIGHTS, OVERLAY_FONTS } from "@/lib/overlay-style";
import type { TextShadow } from "@/types/settings";

/** On stream, alerts and the three widgets are the same kind of object: a box
 *  of text over gameplay. These are the controls they share. */

const DEFAULT_BORDER = "#FFFFFF";

export interface FrameFields {
  /** Read, never written here - it decides whether the widget is a box. */
  background: string;
  backgroundOpacity: number;
  cornerRadius: number;
  borderColor: string;
  borderWidth: number;
  padding: number;
}

export interface TypeFields {
  fontFamily: string;
  fontWeight: number;
  textShadow: TextShadow;
}

const FONT_OPTIONS = OVERLAY_FONTS.map((font) => ({ value: font.value, label: font.label }));
const WEIGHT_OPTIONS = FONT_WEIGHTS.map((weight) => ({ value: String(weight.value), label: weight.label }));

const SHADOW_OPTIONS: { value: TextShadow; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "none", label: "None" },
  { value: "soft", label: "Soft" },
  { value: "strong", label: "Strong" },
  { value: "outline", label: "Outline" },
];

interface FrameGroupProps {
  config: FrameFields;
  patch: (values: Partial<FrameFields>) => void;
  /** Widgets that can be pinned to a width pass their own control in. */
  width?: { value: number; onChange: (value: number) => void };
}

export function FrameGroup({ config, patch, width }: FrameGroupProps) {
  const bordered = config.borderWidth > 0 && config.borderColor !== "transparent";
  const hasBackdrop = config.background !== "transparent";
  /** Padding and radius only mean anything once the widget is a box. */
  const boxed = hasBackdrop || bordered;

  return (
    <Group title="Frame" description="The box around it, once it has a backdrop or a border.">
      <Rows>
        {hasBackdrop && (
          <Row label="Backdrop opacity" description="Lower lets the stream through it." wide>
            <SliderRow
              value={config.backgroundOpacity}
              onChange={(backgroundOpacity) => patch({ backgroundOpacity })}
              min={0}
              max={100}
              step={5}
              format={(v) => `${v}%`}
            />
          </Row>
        )}

        <Row label="Border" description="Sits on the edge of the backdrop.">
          {bordered ? (
            <>
              <ColorInput value={config.borderColor} onChange={(borderColor) => patch({ borderColor })} />
              <Button
                variant="ghost"
                onClick={() => patch({ borderWidth: 0, borderColor: "transparent" })}
              >
                Clear
              </Button>
            </>
          ) : (
            <Button onClick={() => patch({ borderColor: DEFAULT_BORDER, borderWidth: 2 })}>Add border</Button>
          )}
        </Row>

        {bordered && (
          <Row label="Border width" wide>
            <SliderRow
              value={config.borderWidth}
              onChange={(borderWidth) => patch({ borderWidth })}
              min={1}
              max={12}
              step={1}
              format={(v) => `${v}px`}
            />
          </Row>
        )}

        <Row
          label="Corner radius"
          description={boxed ? undefined : "Applies once there is a backdrop or a border."}
          wide
        >
          <SliderRow
            value={config.cornerRadius}
            onChange={(cornerRadius) => patch({ cornerRadius })}
            min={0}
            max={48}
            step={2}
            format={(v) => `${v}px`}
          />
        </Row>

        <Row label="Padding" description={boxed ? undefined : "Applies once there is a backdrop."} wide>
          <SliderRow
            value={config.padding}
            onChange={(padding) => patch({ padding })}
            min={0}
            max={72}
            step={2}
            format={(v) => `${v}px`}
          />
        </Row>

        {width && (
          <Row label="Width" description="Zero lets it size itself to the stream." wide>
            <SliderRow
              value={width.value}
              onChange={width.onChange}
              min={0}
              max={900}
              step={20}
              format={(v) => (v === 0 ? "Auto" : `${v}px`)}
            />
          </Row>
        )}
      </Rows>
    </Group>
  );
}

export function TypeGroup({
  config,
  patch,
}: {
  config: TypeFields;
  patch: (values: Partial<TypeFields>) => void;
}) {
  return (
    <Group title="Typography" description="How the text is set and how it survives a bright scene.">
      <Rows>
        <Row label="Typeface" block>
          <Segmented
            options={FONT_OPTIONS}
            value={config.fontFamily}
            onChange={(fontFamily) => patch({ fontFamily })}
          />
        </Row>
        <Row label="Weight" block>
          <Segmented
            options={WEIGHT_OPTIONS}
            value={String(config.fontWeight)}
            onChange={(value) => patch({ fontWeight: Number(value) })}
          />
        </Row>
        <Row
          label="Readability"
          description="Auto shadows the text only while the widget is transparent."
          block
        >
          <Segmented
            options={SHADOW_OPTIONS}
            value={config.textShadow}
            onChange={(textShadow) => patch({ textShadow })}
          />
        </Row>
      </Rows>
    </Group>
  );
}
