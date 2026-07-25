/** Self-check for the on-stream chat filter: node --experimental-strip-types src/types/chat.check.ts */
import assert from "node:assert/strict";

import { visibleMessages, type ChatMessage } from "./chat.ts";
import type { ChatWidget } from "./settings.ts";

const line = (username: string, text: string): ChatMessage => ({
  id: `${username}-${text}`,
  username,
  color: "",
  text,
  badges: [],
  createdAt: 0,
});

const feed = [
  line("nova_kai", "hello"),
  line("Nightbot", "follow the rules"),
  line("mika_dev", "!uptime"),
  line("arcadeowl", "nice run"),
  line("quietriver", "o7"),
];

/** Only the fields the filter reads; the rest is styling. */
const config = (patch: Partial<ChatWidget>) =>
  ({ hideCommands: false, hideBots: false, maxMessages: 10, ...patch }) as ChatWidget;

assert.equal(visibleMessages(feed, config({})).length, 5);
assert.equal(visibleMessages(feed, config({ hideBots: true })).length, 4);
assert.equal(visibleMessages(feed, config({ hideCommands: true })).length, 4);
assert.equal(visibleMessages(feed, config({ hideBots: true, hideCommands: true })).length, 3);

// The cut comes after the filters, so hiding a bot buys back a line rather
// than leaving a hole where it was.
const two = visibleMessages(feed, config({ hideBots: true, hideCommands: true, maxMessages: 2 }));
assert.deepEqual(
  two.map((m) => m.username),
  ["arcadeowl", "quietriver"],
);

// Newest last, always - the overlay reads top to bottom.
assert.equal(visibleMessages(feed, config({ maxMessages: 1 }))[0].username, "quietriver");

// A widget set to zero lines would render nothing at all; one is the floor.
assert.equal(visibleMessages(feed, config({ maxMessages: 0 })).length, 1);

console.log("chat.ts ok");
