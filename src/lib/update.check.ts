/** Self-check for the release comparison:
 *  node --experimental-strip-types src/lib/update.check.ts */
import assert from "node:assert/strict";

import { isNewer } from "./update.ts";

assert.equal(isNewer("0.2.0", "0.1.0"), true);
assert.equal(isNewer("v0.2.0", "0.2.0"), false); // the tag's v is not a version
assert.equal(isNewer("0.1.0", "0.2.0"), false);
assert.equal(isNewer("0.10.0", "0.9.9"), true); // numbers, not strings
assert.equal(isNewer("1.0.0", "0.99.99"), true);
assert.equal(isNewer("0.2.1", "0.2.0"), true);
// The dev builds published from main carry the version they were built from.
assert.equal(isNewer("0.2.0", "0.2.0-dev.7"), false);
// Garbage from an unreachable or unexpected release must not offer an update.
assert.equal(isNewer("", "0.2.0"), false);

console.log("update.ts ok");
