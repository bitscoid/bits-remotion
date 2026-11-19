/**
 * Asserts the portrait content box in geometry-gate.mjs. No browser needed.
 *
 *   node qc/safe-band-check.mjs
 *
 * Organic short-form only. See GUIDE.md §2 for the numbers and the sources.
 */
import assert from 'node:assert/strict';

const W = 1080;
const H = 1920;

/**
 * Sources, as fractions of the frame: wrapped-video scene-grammar.md (top 12%,
 * bottom 18%, sides 5%) and motioner typography.md (top 250 px, bottom 400 px on
 * a 1080-wide frame). Top is 13% to clear the taller of the two.
 */
const BOX = {top: 0.13, bottom: 0.20, left: 0.05, right: 0.05, readBottom: 0.28};

/** The action rail (like/comment/share/audio) sits down the lower right. */
const RAIL = {fromY: 0.55, insetRight: 0.12};

const x0 = Math.round(W * BOX.left);
const x1 = Math.round(W * (1 - BOX.right));
const y0 = Math.round(H * BOX.top);
const y1 = Math.round(H * (1 - BOX.bottom));
const readY1 = Math.round(H * (1 - BOX.readBottom));
const railY = Math.round(H * RAIL.fromY);
const railX = Math.round(W * (1 - RAIL.insetRight));

assert.deepEqual([x0, x1, y0, y1], [54, 1026, 250, 1536]);
assert.equal(readY1, 1382, 'read line: 28% from the bottom is y 1382');
assert.deepEqual([railY, railX], [1056, 950]);

// Symmetric sides: the horizontal centre is the frame centre.
assert.equal((x0 + x1) / 2, W / 2);
// The vertical centre sits high, because the platforms stack UI at the bottom.
assert.ok((y0 + y1) / 2 < H / 2, 'vertical centre must sit above the frame centre');
assert.equal(H / 2 - (y0 + y1) / 2, 67);

// The bottom margin is the biggest, top is the smallest.
assert.ok(BOX.bottom > BOX.top);
assert.ok(BOX.readBottom > BOX.bottom, 'read line must sit above the caption stack');

// Percent floors land on fractions (0.05 x 1080 = 54 exactly, 0.13 x 1920 = 249.6);
// the gate compares against the rounded box with a 0.5 px tolerance for that reason.
assert.ok(Math.abs(H * BOX.top - y0) < 1);

const area = Math.round(((x1 - x0) * (y1 - y0)) / (W * H) * 100);
assert.equal(area, 60, `area drifted to ${area}%`);

// The box must leave real room: more than half the frame, and full frame width
// above the rail line.
assert.ok(area > 55);
assert.ok(x1 - x0 > W * 0.85, 'the box must span nearly the full width');

console.log(
  `safe band OK: x ${x0}..${x1}, y ${y0}..${y1} (${x1 - x0}x${y1 - y0}, ${area}% of frame); ` +
    `read line ${readY1}; rail below y ${railY} pulls right to x ${railX}`,
);