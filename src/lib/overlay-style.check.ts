/** Self-check for the overlay geometry and colour maths:
 *  node --experimental-strip-types src/lib/overlay-style.check.ts */
import assert from "node:assert/strict";

import { positionStyle, sidePadding, withOpacity } from "./overlay-style.ts";

// A picked colour gains an alpha byte; anything else is handed back whole.
assert.equal(withOpacity("#22c55e", 100), "#22c55e");
assert.equal(withOpacity("#22c55e", 0), "#22c55e00");
assert.equal(withOpacity("#22C55E", 50), "#22C55E80");
assert.equal(withOpacity("transparent", 40), "transparent");
assert.equal(withOpacity("rgba(255,255,255,0.22)", 40), "rgba(255,255,255,0.22)");

// Corners sit one padding in from the two edges they touch, and nowhere else.
assert.deepEqual(positionStyle("top-left", 40, 0), {
  top: 40,
  bottom: undefined,
  left: 40,
  right: undefined,
  translate: "0 0",
});
assert.deepEqual(positionStyle("bottom-right", 0, 0), {
  top: undefined,
  bottom: 0,
  left: undefined,
  right: 0,
  translate: "0 0",
});
// A width of its own applies to the sides only.
assert.deepEqual(positionStyle("bottom-right", 40, 120), {
  top: undefined,
  bottom: 40,
  left: undefined,
  right: 120,
  translate: "0 0",
});

// Zero means "follow the height", for the box and for the stream edge alike.
assert.equal(sidePadding(32, 0), 40);
assert.equal(sidePadding(32, 12), 12);
assert.equal(sidePadding(0, 0), 0);

// Centred axes are pinned at the midpoint and pulled back by half the widget,
// so the padding never applies to them.
assert.deepEqual(positionStyle("center", 40, 0), {
  top: "50%",
  bottom: undefined,
  left: "50%",
  right: undefined,
  translate: "-50% -50%",
});
assert.deepEqual(positionStyle("top-center", 24, 0), {
  top: 24,
  bottom: undefined,
  left: "50%",
  right: undefined,
  translate: "-50% 0",
});
assert.deepEqual(positionStyle("center-right", 24, 60), {
  top: "50%",
  bottom: undefined,
  left: undefined,
  right: 60,
  translate: "0 -50%",
});

console.log("overlay-style.ts ok");
