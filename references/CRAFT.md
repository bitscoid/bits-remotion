# Craft — curves, morphs, and the review flags

Read this before scene code, and again when a transition looks wrong.

Adapted from `Tarquished/motioner` (MIT, © 2026 Motioner contributors), which is
written for 60 fps and a music-led edit. This workflow runs at **30 fps** and is
**voiceover-led**, so every frame figure below is halved and every beat reference
is replaced by a spoken-word reference.

## 1. Curves by role

Pick the curve by what the move *is*, not by how it feels in the moment.

| Role | Cubic bezier | Note |
|---|---|---|
| Something arrives, the UI responds | `(0.16, 1, 0.3, 1)` | fast start, long settle — the default entrance |
| Object travels A to B, camera move | `(0.65, 0, 0.35, 1)` | symmetric |
| Morph carrier, shared element | `(0.45, 0, 0.15, 1)` | eases out of rest in ~2 frames, decisive middle, gentle landing |
| Reveal growing from an element | `(0.5, 0, 0.15, 1)` | leaves the element gently, fills fast, lands soft |
| Whip, zoom-through | `(0.77, 0, 0.175, 1)` | violent middle, very slow ends |
| Exit that leaves the frame | `ease.in` | only when it really leaves |
| Wind-up before a big move | anticipation, or a small opposite move | 5–10% of the distance |
| Tactile feedback | spring, damping 10–14, stiffness 170–260 | overshoot only on things that are hit |

Never `linear` for visible motion except constant drifts and rotation
loops. Never `scale(0) → 1` for a UI element: start at 0.6–0.85 with opacity.

## 2. Velocity continuity — the cause of "choppy"

The eye sees acceleration, not position. A move reads as choppy when its speed jumps or
drops to zero mid-flight. At 30 fps this is **twice as visible** as at 60: each frame is a
bigger step, so a velocity break lands on a frame the viewer notices.

- **Passing through a key:** do not chain two tweens (each eases to zero at the key). Use a
  single track through the keys, and mark real stops explicitly.
- **One curve per gesture.** Never splice a fast part and a slow part.
- **Start from rest.** Over a 15-frame, 700 px move at 30 fps, `(0.45, 0, 0.15, 1)` travels
  roughly 3, 9, 17, 28, 40 px per frame. The tempting `(0.2, 0, 0, 1)` travels 16, 64,
  140 px/frame, which reads as a teleport. Check a curve by listing its per-frame distance
  for the real move length, not by eye.
- **Idle motion must meet a handoff at zero speed.** A bob drawn with `sin` is at full speed
  when it crosses zero. Shape it with `sin²`, or fade its amplitude out before another move
  picks the object up.
- **Pulses need an attack.** A beat-reactive element that jumps to full height in one frame
  reads as a glitch: ramp over 2 frames, decay over 8–12.
- **Do not round transforms to integer pixels** during motion; it quantises slow moves into
  steps.

## 3. Timing at 30 fps

Halved from the 60 fps source. Use these as starting points, then check the contact sheet.

| Action | Frames |
|---|---|
| Button press in / out | 2–3 / 3–5 |
| Chip, toggle, badge pop | 5–8 |
| Card or panel entrance | 9–14 |
| Large shared-element morph | 15–20 |
| Flood, full-screen reveal | 20–25 |
| Camera push (subtle) | 30–75 |
| Stagger between siblings | 2–4 |
| Readable hold for a line | 24 + 8 per word (0.8 s + 0.25 s/word) |

Snap cuts and morph landings go on **the spoken word**, never on a music beat: the
narration leads. Take the word time from `audio/words.json`, not from the music.

## 4. The carrier contract

Every morph has a **source** (drawn by the outgoing scene), a **carrier** (drawn only
during the morph) and a **target** (drawn by the incoming scene).

```
frame <  start        source only
start <= frame < end  carrier only     (first frame = source pixels, last = target pixels)
frame >= end          target only
```

Rules that make it hold. Each one comes from a real failure:

1. **Compute the source rect from the function that draws the source**, at frame `start` —
   including idle wobble, camera and anticipation. A carrier that starts from the "design"
   position jumps on its first frame.
2. **The target must be pixel-identical to the carrier's last frame**: same rect, radius,
   fill, shadow and content size. Define both from one shared constant, never by eye.
3. **One carrier per travelling element.** A card becoming a screen while its title and rows
   move gets a carrier for the container *and* one per child; the container's carried content
   must exclude them, or the title is drawn twice.
4. **Stagger with a delay inside the window**, never by shifting `start`. A shifted start
   leaves the element drawn by nobody for a frame or two.
5. **Content swaps sequentially**: outgoing content ends before incoming begins.
6. **Geometry, not scale.** Animate rect, radius, position. `transform: scale` distorts
   corners, borders and shadows, and softens text.
7. **One curve for the whole group**, so the handoff reads as a single move.
8. **The rest of the incoming scene arrives around or after the carrier**, staggered
   outward. Never already sitting behind it.
9. **Only the carrier moves at full speed.** Everything else has left or converged.
10. **Carried content stays live.** Render it with the *current* frame, not `start`. A frozen
    snapshot stops moving for the whole morph and then teleports on the last frame.
11. **Match every property at both handoff frames**: rect, radius, fill, border, shadow,
    glow, decorations, and motion.
12. **Things outside the carrier leave with an animation**, faded over 4–6 frames around the
    start. They never vanish on the handoff frame.

## 5. Choosing the recipe

Pick from what the two scenes share, and vary recipes across the film.

| Scenes share… | Recipe |
|---|---|
| a container that grows, shrinks or moves | shared-element morph (one carrier, plus one per child) |
| many small objects that become one | converge: satellites fly on arcs under a hero carrier |
| a coloured element whose colour can become the next background | flood or iris from that element, same colour |
| two different shapes | path morph |
| a word and a word with a common chunk | letter morph, travel mode |
| two lines with nothing in common | text roll — out, then in |
| a point of interest inside the scene | zoom-through until its fill is the next scene |
| a continuous world | whip-pan along one strip with directional blur |
| an action (tap, drop, burst) | action-driven reveal |
| nothing | an intentional **cut on the word**, with a sound — better than a fake morph |

Default windows at 30 fps: container morph 15–20 frames, converge 18–24, flood 20–25,
path morph 15–20, letter roll 18–23, whip 7–9, zoom-through 10–15.

## 6. Review flags

Render a draft, cut a contact sheet, and look for these. The names come from the source
skill; the detection here is manual, from consecutive frames.

| Flag | Means | Usual cause |
|---|---|---|
| **POP** | one frame changes far more than its neighbours | a snap, a mismatched layer swap, an off-by-one Sequence, a spliced curve |
| **STUTTER** | a frame repeats while its neighbours move | a hold key mid-travel, rounded positions, a frame-rate mismatch |
| **HITCH** | speed collapses for 1–2 frames then resumes | chained eases passing through a key |
| **FLASH** | brightness spikes and returns | an unintended white or black frame, a layer missing for one frame |
| **BLANK** | a nearly uniform frame | nothing on screen: a gap between two scenes |
| **COLORJUMP** | mean colour jumps in one frame | an unmotivated hue switch |
| **GHOST** | a region loses detail while barely moving | double exposure, a crossfade, ghost text |
| **MUDDY** | contrast sags mid-window below both ends | carrier colour close to the background |
| **SOFT** | settled frames after are less sharp than before | an upscaled raster, leftover blur |
| **HANDOFF-JUMP** | a small region jumps on the morph's first or last frame | frozen carrier content, a shadow that differs, an element that vanished |
| **TELEPORT** | a small region changes in one frame | an object jump; also legitimate glyph pops — zoom in and decide |
| **JERK** | a still region goes to full speed in one frame | a move without ease-in on something already visible |

Expected, not defects: COLORJUMP on the middle frames of a deliberate flood; one POP at a
push-through swap whose colour already matches; BLANK on the first frames of a film that
opens before its seed appears.

## 7. What this workflow cannot measure

The source skill ships detectors for every flag above, run on the encoded file
(`transition_review.py` computes frame-to-frame deltas, motion events and speed curves). This
workflow has no such script, so:

- **POP, STUTTER, FLASH, BLANK** are caught by `freezedetect` and `blackdetect`, and by
  comparing consecutive frames of the contact sheet.
- **COLORJUMP and GHOST** need a strip of consecutive frames at each cut — take one with
  `ffmpeg -ss <t> -frames:v 30` and look at it.
- **HANDOFF-JUMP, TELEPORT, JERK and MUDDY** need zoomed crops of the object, not the full
  frame. Small things — dots, shadows, badges — are where handoffs break.

Say in the delivery message which of these you checked and which you did not. A gate that
silently reports "clean" without looking is worse than no gate.

## 8. Where this fits the workflow

- Stage 5 (timeline): decide the handoffs and their windows here; a morph is a timeline
  decision, not a scene detail.
- Stage 6 (build): the carrier contract governs the scene code.
- Stage 7 (QC): the flags are advisory. Read them, write a verdict per boundary
  (`name (frames): GOOD/WEAK/BROKEN — what you saw, cause, fix`), and fix what is BROKEN.

Nothing here overrides the hard requirements in `RENDER.md` §7.