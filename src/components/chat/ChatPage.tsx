import { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";

import { Block, Masonry, Page, PageHeader, Stack } from "@/components/layout/Page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ColorInput } from "@/components/ui/color-input";
import { EmptyState } from "@/components/ui/empty-state";
import { Group, Panel, Row, Rows } from "@/components/ui/group";
import { PositionGrid } from "@/components/ui/position-grid";
import { LoadingPane } from "@/components/ui/skeleton";
import { SliderRow } from "@/components/ui/slider";
import { StreamPreview } from "@/components/ui/stream-preview";
import { Switch } from "@/components/ui/switch";
import { FrameGroup, TypeGroup } from "@/components/widgets/frame-controls";
import { formatClock } from "@/lib/time";
import { ChatBox } from "@/overlay/ChatBox";
import { useAuthStore } from "@/stores/authStore";
import { useChatStore } from "@/stores/chatStore";
import { useServerStatusStore } from "@/stores/serverStatusStore";
import { useSettingsStore } from "@/stores/settingsStore";
import type { ChatMessage } from "@/types/chat";
import type { ChatWidget } from "@/types/settings";

const DEFAULT_BACKDROP = "#111111";

/** Enough of a conversation to see the widget working. */
const SAMPLE: ChatMessage[] = [
  { id: "s1", username: "nova_kai", color: "#FF69B4", text: "that transition was clean", badges: ["subscriber"], createdAt: 0 },
  { id: "s2", username: "mika_dev", color: "", text: "first time catching you live!", badges: [], createdAt: 0 },
  { id: "s3", username: "arcadeowl", color: "#4FC3F7", text: "what keyboard is that", badges: ["moderator"], createdAt: 0 },
];

export function ChatPage() {
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);
  const messages = useChatStore((s) => s.messages);
  const load = useChatStore((s) => s.load);
  const user = useAuthStore((s) => s.user);
  const status = useServerStatusStore((s) => s.status);

  useEffect(() => {
    load();
  }, [load]);

  if (!settings) return <LoadingPane label="Loading chat" />;

  const chat = settings.chat;
  const patch = (values: Partial<ChatWidget>) => update({ chat: { ...chat, ...values } });
  // A token issued before chat existed subscribes to everything else fine, so
  // the feed just stays silent. Say why instead of looking broken.
  const needsReauth = Boolean(user) && status !== null && !status.chatReady;

  return (
    <Page>
      <PageHeader
        title="Chat"
        lede="Your channel's chat, read over the same connection as your alerts — watch it here, put it on stream, or both."
      />

      <Stack>
        {needsReauth && (
          <Panel className="flex items-start gap-3 border-warn/40 bg-warn-soft p-4">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" />
            <div className="min-w-0 flex-1">
              <p className="text-body font-medium text-ink">Chat needs one more permission</p>
              <p className="mt-0.5 text-body text-ink-2">
                Reading chat was added after you signed in. Sign out and back in from Settings to grant it —
                your alerts keep working either way.
              </p>
            </div>
          </Panel>
        )}

        <div className="grid grid-cols-1 gap-7 @[880px]:grid-cols-2">
          <Group
            title="Live"
            description={messages.length > 0 ? `${messages.length} messages this session` : undefined}
            action={
              <Badge tone={status?.chatReady ? "ok" : "idle"}>{status?.chatReady ? "Reading" : "Idle"}</Badge>
            }
          >
            <Panel>
              {messages.length === 0 ? (
                <EmptyState
                  title="No messages yet"
                  description="Chat arrives here as it is posted. Nothing is written to disk — this is a live view, not a log."
                />
              ) : (
                <MessageFeed messages={messages} />
              )}
            </Panel>
          </Group>

          <Group title="On stream">
            <StreamPreview notice={chat.enabled ? undefined : "Not shown on stream"}>
              {/* The real ChatBox, so the preview cannot drift from it. */}
              <ChatBox
                messages={messages.length > 0 ? messages : SAMPLE}
                config={{ ...chat, enabled: true, fadeAfterSecs: 0 }}
                pad={settings.overlayPadding}
              />
            </StreamPreview>
            <p className="mt-1 px-0.5 text-sm text-ink-3">
              {messages.length > 0 ? "Your real chat, at stream scale." : "Sample messages — chat has been quiet."}
            </p>
          </Group>
        </div>

        <Masonry>
          <Block>
            <Group title="Widget">
              <Rows>
                <Row label="Show on stream" description="Adds chat to the overlay OBS is already showing.">
                  <Switch checked={chat.enabled} onCheckedChange={(enabled) => patch({ enabled })} />
                </Row>
                <Row label="Lines on screen" description="Older ones drop off the top." wide>
                  <SliderRow
                    value={chat.maxMessages}
                    onChange={(maxMessages) => patch({ maxMessages })}
                    min={1}
                    max={25}
                    step={1}
                    format={(v) => String(v)}
                  />
                </Row>
                <Row label="Clear after" description="Zero keeps a line until it is pushed off." wide>
                  <SliderRow
                    value={chat.fadeAfterSecs}
                    onChange={(fadeAfterSecs) => patch({ fadeAfterSecs })}
                    min={0}
                    max={300}
                    step={5}
                    format={(v) => (v === 0 ? "Never" : `${v}s`)}
                  />
                </Row>
                <Row label="Hide commands" description="Anything starting with “!”.">
                  <Switch checked={chat.hideCommands} onCheckedChange={(hideCommands) => patch({ hideCommands })} />
                </Row>
                <Row label="Hide bots" description="Nightbot, StreamElements, Streamlabs and friends.">
                  <Switch checked={chat.hideBots} onCheckedChange={(hideBots) => patch({ hideBots })} />
                </Row>
                <Row label="Badges" description="Host, mod, VIP and sub tags before the name.">
                  <Switch checked={chat.showBadges} onCheckedChange={(showBadges) => patch({ showBadges })} />
                </Row>
                <Row label="Twitch name colours" description="Off puts every name in your accent.">
                  <Switch
                    checked={chat.useTwitchColors}
                    onCheckedChange={(useTwitchColors) => patch({ useTwitchColors })}
                  />
                </Row>
                <Row label="Accent" description="Names and badges.">
                  <ColorInput value={chat.accent} onChange={(accent) => patch({ accent })} />
                </Row>
                <Row label="Text">
                  <ColorInput value={chat.textColor} onChange={(textColor) => patch({ textColor })} />
                </Row>
                <Row label="Backdrop" description="Transparent sits straight on the stream.">
                  {chat.background === "transparent" ? (
                    <Button onClick={() => patch({ background: DEFAULT_BACKDROP })}>Add backdrop</Button>
                  ) : (
                    <>
                      <ColorInput value={chat.background} onChange={(background) => patch({ background })} />
                      <Button variant="ghost" onClick={() => patch({ background: "transparent" })}>
                        Clear
                      </Button>
                    </>
                  )}
                </Row>
                <Row label="Text size" wide>
                  <SliderRow
                    value={chat.fontSize}
                    onChange={(fontSize) => patch({ fontSize })}
                    min={12}
                    max={48}
                    step={1}
                    format={(v) => `${v}px`}
                  />
                </Row>
                <Row label="Line spacing" wide>
                  <SliderRow
                    value={chat.messageGap}
                    onChange={(messageGap) => patch({ messageGap })}
                    min={0}
                    max={32}
                    step={2}
                    format={(v) => `${v}px`}
                  />
                </Row>
              </Rows>
            </Group>
          </Block>

          <Block>
            <FrameGroup
              config={chat}
              patch={patch}
              width={{ value: chat.width, onChange: (width) => patch({ width }) }}
            />
          </Block>

          <Block>
            <TypeGroup config={chat} patch={patch} />
          </Block>

          <Block>
            <Group title="Position">
              <PositionGrid value={chat.position} onChange={(position) => patch({ position })} />
              <p className="mt-2.5 px-0.5 text-sm text-ink-3">Independent of the other widgets.</p>
            </Group>
          </Block>
        </Masonry>
      </Stack>
    </Page>
  );
}

/** Newest at the bottom, and it follows — a chat view that does not scroll
 *  itself is a chat view you have to babysit. */
function MessageFeed({ messages }: { messages: ChatMessage[] }) {
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  return (
    <div className="max-h-[420px] min-h-[220px] overflow-y-auto px-3.5 py-3">
      <ul className="flex flex-col gap-2">
        {messages.map((message) => (
          <li key={message.id} className="flex gap-2.5 text-body">
            <time className="num shrink-0 text-sm text-ink-3">{formatClock(message.createdAt)}</time>
            <p className="min-w-0 flex-1 break-words">
              <span className="font-medium" style={{ color: message.color || undefined }}>
                {message.username}
              </span>
              <span className="text-ink-3"> · </span>
              <span className="text-ink-2">{message.text}</span>
            </p>
          </li>
        ))}
      </ul>
      <div ref={end} />
    </div>
  );
}
