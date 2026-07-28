/** Self-check for the .rbn container:
 *  node --experimental-strip-types src/lib/rbn.check.ts */
import assert from "node:assert/strict";

import { pack, unpack } from "./rbn.ts";

const sheet = { hibikiStyles: 1, styles: { follow: { title: "Nouveau follow" } } };
const image = new Blob([new Uint8Array([137, 80, 78, 71, 0, 1, 2])]);
const sound = new Blob([new Uint8Array(300).fill(7)]);

const media = new Map([
  ["1.png", image],
  ["2.wav", sound],
]);

const packed = pack(sheet, media);
const back = await unpack(packed);

// The manifest survives, and carries the index of what follows it.
const manifest = back.manifest as typeof sheet & { media: { name: string; length: number }[] };
assert.equal(manifest.styles.follow.title, "Nouveau follow");
assert.deepEqual(
  manifest.media.map((entry) => entry.name),
  ["1.png", "2.wav"],
);

// Every blob comes back byte for byte, at its own boundary: an off-by-one in
// the offsets would hand back a file that is silently the wrong bytes.
assert.equal(back.media.size, 2);
assert.deepEqual(
  new Uint8Array(await back.media.get("1.png")!.arrayBuffer()),
  new Uint8Array(await image.arrayBuffer()),
);
assert.equal(back.media.get("2.wav")!.size, 300);
assert.deepEqual(
  new Uint8Array(await back.media.get("2.wav")!.arrayBuffer()),
  new Uint8Array(await sound.arrayBuffer()),
);

// A sheet with no media is still a valid file.
const empty = await unpack(pack({ hibikiStyles: 1 }, new Map()));
assert.equal(empty.media.size, 0);

// Anything else is refused before it is parsed.
await assert.rejects(() => unpack(new Blob([new TextEncoder().encode('{"hibikiStyles":1}')])));
await assert.rejects(() => unpack(new Blob([])));

console.log("rbn.ts ok");
