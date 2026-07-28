import { Pause, Play, SkipBack, SkipForward } from "lucide-react";

import { Block, Masonry, Page, PageHeader, Stack } from "@/components/layout/Page";
import { FrameGroup, TypeGroup } from "@/components/widgets/frame-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ColorInput } from "@/components/ui/color-input";
import { EmptyState } from "@/components/ui/empty-state";
import { Group, Panel, Row, Rows } from "@/components/ui/group";
import { PositionGrid } from "@/components/ui/position-grid";
import { LoadingPane } from "@/components/ui/skeleton";
import { SliderRow } from "@/components/ui/slider";
import { StatusDot } from "@/components/ui/status-dot";
import { StreamPreview } from "@/components/ui/stream-preview";
import { Switch } from "@/components/ui/switch";
import { NowPlayingWidget as StreamWidget } from "@/overlay/NowPlayingWidget";
import { useNowPlayingStore } from "@/stores/nowPlayingStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { sourceLabel, type NowPlaying } from "@/types/nowplaying";
import type { NowPlayingWidget } from "@/types/settings";

const DEFAULT_BACKDROP = "#111111";

const SAMPLE: NowPlaying = {
  title: "Midnight City",
  artist: "M83",
  album: "Hurry Up, We're Dreaming",
  source: "Spotify.exe",
  playing: true,
  art: null,
};

export function MusicPage() {
  const track = useNowPlayingStore((s) => s.track);
  const control = useNowPlayingStore((s) => s.control);
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);

  if (!settings) return <LoadingPane label="Loading music" />;

  const widget = settings.nowPlaying;
  const patch = (values: Partial<NowPlayingWidget>) => update({ nowPlaying: { ...widget, ...values } });

  return (
    <Page>
      <PageHeader
        title="Music"
        lede="Hibiki reads the same session Windows shows in its media flyout - Spotify, a browser, anything that answers the media keys."
      />

      <Stack>
        <div className="grid grid-cols-1 gap-7 @[880px]:grid-cols-2">
          <Group title="Now playing">
            <Panel>
              {track ? (
                <div className="flex items-start gap-3.5 p-4">
                  {track.art ? (
                    <img src={track.art} alt="" className="size-16 shrink-0 rounded-md object-cover" />
                  ) : (
                    <div className="flex size-16 shrink-0 items-center justify-center rounded-md bg-fill">
                      <Play className="size-5 text-ink-3" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <StatusDot tone={track.playing ? "ok" : "idle"} />
                      <p className="truncate text-title text-ink">{track.title}</p>
                    </div>
                    <p className="mt-1 flex items-center gap-2 truncate text-body text-ink-2">
                      {[track.artist, track.album].filter(Boolean).join(" - ")}
                      <Badge>{sourceLabel(track.source)}</Badge>
                    </p>
                    <div className="mt-2.5 flex items-center gap-1">
                      <Button variant="ghost" size="icon-md" onClick={() => control("previous")} aria-label="Previous">
                        <SkipBack />
                      </Button>
                      <Button
                        size="icon-md"
                        onClick={() => control("playpause")}
                        aria-label={track.playing ? "Pause" : "Play"}
                      >
                        {track.playing ? <Pause /> : <Play />}
                      </Button>
                      <Button variant="ghost" size="icon-md" onClick={() => control("next")} aria-label="Next">
                        <SkipForward />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <EmptyState
                  title="Nothing playing"
                  description="Start a track in any player that answers the Windows media keys and it shows up here."
                />
              )}
            </Panel>
          </Group>

          <Group title="On stream">
            <StreamPreview notice={widget.enabled ? undefined : "Not shown on stream"}>
              <StreamWidget
                track={track ?? SAMPLE}
                config={{ ...widget, enabled: true, hideWhenPaused: false }}
                pad={settings.overlayPadding}
                padX={settings.overlayPaddingX}
              />
            </StreamPreview>
            <p className="mt-1 px-0.5 text-sm text-ink-3">
              {track ? "Your current track, at stream scale." : "Sample track - nothing is playing right now."}
            </p>
          </Group>
        </div>

        <Masonry>
          <Block>
            <Group title="Widget">
              <Rows>
                <Row label="Show on stream" description="Adds the widget to the overlay OBS is already showing.">
                  <Switch checked={widget.enabled} onCheckedChange={(enabled) => patch({ enabled })} />
                </Row>
                <Row label="Artist" description="Second line under the title.">
                  <Switch checked={widget.showArtist} onCheckedChange={(showArtist) => patch({ showArtist })} />
                </Row>
                <Row label="Album" description="Added to the same second line.">
                  <Switch checked={widget.showAlbum} onCheckedChange={(showAlbum) => patch({ showAlbum })} />
                </Row>
                <Row label="Player name" description="Adds 'Spotify', 'Chrome'...">
                  <Switch checked={widget.showSource} onCheckedChange={(showSource) => patch({ showSource })} />
                </Row>
                <Row label="Cover art" description="Falls back to the equaliser when the player sends none.">
                  <Switch checked={widget.showArt} onCheckedChange={(showArt) => patch({ showArt })} />
                </Row>
                <Row label="Equaliser" description="The three animated bars.">
                  <Switch
                    checked={widget.showEqualizer}
                    onCheckedChange={(showEqualizer) => patch({ showEqualizer })}
                  />
                </Row>
                <Row label="Hide when paused" description="Pull it off screen while the music stops.">
                  <Switch
                    checked={widget.hideWhenPaused}
                    onCheckedChange={(hideWhenPaused) => patch({ hideWhenPaused })}
                  />
                </Row>
                <Row label="Accent" description="The equaliser bars.">
                  <ColorInput value={widget.accent} onChange={(accent) => patch({ accent })} />
                </Row>
                <Row label="Text">
                  <ColorInput value={widget.textColor} onChange={(textColor) => patch({ textColor })} />
                </Row>
                <Row label="Backdrop" description="Transparent sits straight on the stream.">
                  {widget.background === "transparent" ? (
                    <Button onClick={() => patch({ background: DEFAULT_BACKDROP })}>Add backdrop</Button>
                  ) : (
                    <>
                      <ColorInput value={widget.background} onChange={(background) => patch({ background })} />
                      <Button variant="ghost" onClick={() => patch({ background: "transparent" })}>
                        Clear
                      </Button>
                    </>
                  )}
                </Row>
                <Row label="Text size" wide>
                  <SliderRow
                    value={widget.fontSize}
                    onChange={(fontSize) => patch({ fontSize })}
                    min={12}
                    max={48}
                    step={1}
                    format={(v) => `${v}px`}
                  />
                </Row>
                <Row label="Cover size" description="Zero scales it with the text." wide>
                  <SliderRow
                    value={widget.artSize}
                    onChange={(artSize) => patch({ artSize })}
                    min={0}
                    max={200}
                    step={4}
                    format={(v) => (v === 0 ? "Auto" : `${v}px`)}
                  />
                </Row>
                <Row label="Title limit" description="Cuts a long title short. Zero leaves it whole." wide>
                  <SliderRow
                    value={widget.titleMaxChars}
                    onChange={(titleMaxChars) => patch({ titleMaxChars })}
                    min={0}
                    max={80}
                    step={1}
                    format={(v) => (v === 0 ? "Off" : `${v} ch`)}
                  />
                </Row>
                <Row label="Scroll long titles" description="Slides back and forth instead of clipping.">
                  <Switch checked={widget.titleScroll} onCheckedChange={(titleScroll) => patch({ titleScroll })} />
                </Row>
                {widget.titleScroll && (
                  <Row label="Scroll speed" wide>
                    <SliderRow
                      value={widget.titleScrollSpeed}
                      onChange={(titleScrollSpeed) => patch({ titleScrollSpeed })}
                      min={10}
                      max={160}
                      step={5}
                      format={(v) => `${v}px/s`}
                    />
                  </Row>
                )}
                <Row label="Cover corners" wide>
                  <SliderRow
                    value={widget.artRadius}
                    onChange={(artRadius) => patch({ artRadius })}
                    min={0}
                    max={48}
                    step={2}
                    format={(v) => (v === 0 ? "Square" : `${v}px`)}
                  />
                </Row>
              </Rows>
            </Group>
          </Block>

          <Block>
            <FrameGroup
              config={widget}
              patch={patch}
              width={{ value: widget.width, onChange: (width) => patch({ width }) }}
            />
          </Block>

          <Block>
            <TypeGroup config={widget} patch={patch} />
          </Block>

          <Block>
            <Group title="Position">
              <PositionGrid value={widget.position} onChange={(position) => patch({ position })} />
              <p className="mt-2.5 px-0.5 text-sm text-ink-3">Independent of where alerts and the goal bar land.</p>
            </Group>
          </Block>
        </Masonry>
      </Stack>
    </Page>
  );
}
