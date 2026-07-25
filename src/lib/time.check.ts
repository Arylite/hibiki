/** Self-check for the relative-time ladder: node --experimental-strip-types src/lib/time.check.ts */
import assert from "node:assert/strict";

import { formatRelative } from "./time.ts";

const now = Date.UTC(2026, 0, 1, 12, 0, 0);
const ago = (seconds: number) => formatRelative(now - seconds * 1000, now);
/** Same locale as formatRelative, so this checks the unit ladder, not the wording. */
const expect = (value: number, unit: Intl.RelativeTimeFormatUnit) =>
  new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(-value, unit);

assert.equal(ago(12), expect(12, "second"));
assert.equal(ago(90), expect(2, "minute")); // rounds, does not truncate
assert.equal(ago(60 * 45), expect(45, "minute"));
assert.equal(ago(60 * 60 * 3), expect(3, "hour"));
assert.equal(ago(60 * 60 * 24 * 2), expect(2, "day"));
assert.equal(ago(60 * 60 * 24 * 21), expect(3, "week"));

console.log("time.ts ok");
