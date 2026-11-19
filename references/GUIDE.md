# Visual and Creative Direction

Read this before building any scene. It covers execution — typography, asset animation, transitions, sync, audio. **Visual style starts from the chosen reference video when there is one**; without one, it is designed from the topic and the user's assets. Either way, don't impose one palette or layout everywhere.

## Contents
1. Reading a reference video
2. Kinetic typography
3. Animating assets
4. Transitions
5. Turning ideas into visuals
6. Variation that keeps a system
7. Sync with the voiceover
8. Music and audio mixing

## 1. Reading a reference video

A reference is a floor, not a mould. What transfers is the principle — why the video feels good, not the order of its effects.

Read eight layers — palette, typography, composition, graphic language, motion, rhythm, sound, attention architecture — with the concrete prompts and the four-step read in `RENDER.md` §4. Two of those layers exist only in time: **motion** (easing, entry duration, text granularity) and **rhythm** (cut distribution, event density). A contact sheet cannot show either; read them from motion strips. Write the result as a ten-line brief at the top of the build script, so the read survives to the last scene.

Take at least one measured number per layer where a number exists — a size ratio, a cut interval, a stroke weight — because an adjective cannot be built.

"Look at" means the model actually opens the images. If the main model cannot see them — empty `content`, a refusal, or an `[image omitted: ...]` placeholder — hand the contact sheet and the motion strips to the `vision` subagent in one call and work from its description (`SKILL.md` → *Vision routing*). Never describe a reference you have not seen; say so instead.

Avoid copying shots one by one, reusing the exact composition, placing text in the same positions, or reproducing the animation and transition order frame by frame. The goal is work that is original and tighter than its reference — a frame that takes the principle and serves the content beats a faithful copy.

## 2. Kinetic typography

Typography is a storytelling element, not a subtitle layer.

Techniques, chosen by context: text appearing with the spoken word, mask reveals, staged word or letter reveals, controlled overshoot scaling, letter-spacing animation, text emerging from behind objects, creative clipping and layering, emphasis through weight, colour, or size.

Rules:
- Choose fonts for **legibility first; weight and register follow the topic**. Modern-and-heavy is a common default, not a rule — an elegant serif for an editorial topic, a condensed archival face for history, or a script accent for a personal topic are equally legitimate when the topic calls for them. The real constraint: use real fonts through code (never text rendered by an image generator) so letters never break or turn into fake words.

  **The font catalogue is not a menu.** The list in `RENDER.md` §"Fonts ready to use" is what happens to be installed, not the set of allowed choices. Your job is to pick typography that **fits the topic and the reference mood**, not the first row of the table. If the topic needs something missing (a food topic wanting a fat slab serif, an archive topic wanting a heavy condensed face, a tech topic wanting a narrow grotesk), **download it** — never settle for "close enough" just because it's installed. The download recipe and verification are in `RENDER.md` §1.

  The practical limit is coherence, not a count: **2–3 families is the range that usually holds together** as one system.
- Preserve spelling and meaning exactly as scripted.
- Keep on-screen copy short: a whole paragraph at once rarely reads on video. Highlighting keywords is the usual way to give the eye a path through a line; a line that needs every word emphasised has no emphasis at all.
- Keep clear levels: title, keyword, supporting line, small label.
- **The label layer usually reads best with one voice.** Header, index, kicker, chip, caption and footnote are the frame's *meta-copy* — words about the video, not words of the video. A default that works in most frames:
  - **uppercase in the supporting sans, tracked 4–8 px**, when the line is short (a label, an index, a chip); or
  - **the display face, usually italic**, when the caption reads as a phrase or a sentence rather than a bare label.

  The risk worth a decision: a single sentence-case sans line left alone among caps labels starts reading as a tooltip or a settings note — the interface voice of the face showing through. That is a reason to choose deliberately, not a ban.
  **A display face plus a meta face is a reliable system for most videos.** The display face carries spoken content and emphasis (titles, claims, keywords, stamps, verdict badges); the meta face carries labels, indices, chips, captions and footnotes. Which face carries the meta voice is a per-topic decision: a mono (e.g. `JetBrains Mono`) fits tech and data, a serif italic or small-caps serif fits editorial or historical topics, handwriting can carry annotation when the topic is personal.
- **Case is a design decision, not a rule.** Spoken content — a claim, a quote, a sentence the narration also says — keeps its natural case and punctuation in whatever face it uses, and setting a project's plain voice in sentence-case sans is legitimate.
- **Uppercasing a claim changes who appears to say it.** Caps read as the video's own assertion, so a myth, a quote or a reported claim set in caps can look endorsed. If the design wants caps there, check that the meaning survives; proper nouns keep their spelling either way.
- **Caps usually want tracking.** Without it, an uppercase line reads as a form rather than a label. Keep the line short, and measure the **cap height** — not the full ascender-to-descender box, which adds descenders and makes a lowercase-only line look far smaller than its caps — against the size tier. Uppercase lines are uniform height, so the size that clears 2.5% in mixed case will usually not clear it in caps.
- Avoid decorative capitalisation inside sentence-case copy, hard-to-read faces, and ornamental excess.
- Respect the safe area: important elements stay at least **4%** from the frame edge — one number, so there is never a second truth about it (the geometry gate in `RENDER.md` §7 uses 4%).

  **Short-form platforms need more.** 4% is the floor for the file itself; Reels, TikTok, Shorts and Stories overlay their own captions, buttons and progress bar on the bottom and right of the frame, and that band varies by app version and layout. For a **portrait** export (`1080×1920`) the project's floor is **10% from the bottom and 12% from the right**, and the delivery message states the zone used. Treat the 10% as a minimum, not a target: anything that has to be read — a keyword, a number, a verdict — is safer at **15% from the bottom**. Landscape/YouTube keeps the plain 4%. The 4% gate still runs on everything; the platform band is a second, stricter margin applied on top for portrait.
- The smallest text must stay legible at output resolution. **The threshold is cap height, not font size.** Two tiers, measured as a fraction of the **short side** so portrait and landscape share one number:

  | Tier | Cap height | Short side 1920 | Short side 1080 |
  |---|---|---|---|
  | primary / keywords | ≥ 4% | 77 px | 43 px |
  | supporting / labels / chips | ≥ 2.5% | 48 px | 27 px |

  Font size to reach that height depends on the face: measured on DejaVu Sans Bold, capitals are **0.73× the size**. So on a 1080 short side, primary needs **size ≈ 60** and supporting **≈ 37**; on 1920, **≈ 105** and **≈ 66**. A condensed or display face has a different ratio — measure `font.getbbox("H")` for the font you chose and solve for the size; never assume 0.75 or copy a number from a table for a different face.

  Writing only the 1920 figures is what makes a landscape video ship with text half the intended size. Measure the result; don't estimate.

  Measure the **cap height**, not the full string box. Mixed case adds descenders, and a lowercase-only line returns x-height — about 0.58× the size on DejaVu Sans Bold, against 0.73× for capitals — so a gate fed `textbbox` height would demand type roughly 25% larger than this table intends, and would fail a correctly sized word like "sun". Measure `font.getbbox("H")` once per face.

  If a supporting line will not fit at 2.5% alongside other elements, cut words from that line — never lower the threshold.
- Check text-against-background contrast in code, never by judging colour names. Thresholds are measurable and tied to the text's **role**, not its pixel size:
  - **primary text / keywords: 3.0:1**
  - **supporting text / labels / chips: 4.5:1** — stricter than WCAG "large text", because small moving text reads far worse than static text of the same size.

  Compute with the WCAG formula:

```python
def lum(c):  # c = (r, g, b) 0-255
    def f(v):
        v /= 255
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = (f(x) for x in c)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b

def ratio(a, b):
    la, lb = sorted((lum(a), lum(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)
```

  On failure: place a solid panel behind the text or adjust the area — darker behind light text, lighter behind dark text — never rely on a thin drop shadow. Text over user images must be measured against the pixels actually behind it (sample the region), not the image's dominant colour.

  **Pick the accent by measurement, not by eye.** A palette pass that removes the whole failure class: choose the topic's hue, then walk its lightness until the measured ratio clears the threshold for the role it will carry.

```python
import colorsys
def fit_accent(rgb, bg, target):
    """Walk lightness in BOTH directions until `rgb` clears `target` against `bg`.
    Darkening alone fails on dark palettes: black on a dark background is ~1.07:1."""
    h, l, s = colorsys.rgb_to_hls(*(c / 255 for c in rgb))
    best, best_r = rgb, ratio(rgb, bg)
    for step in range(1, 101):
        for cand_l in (min(1.0, l + step * 0.01), max(0.0, l - step * 0.01)):
            cand = tuple(round(c * 255) for c in colorsys.hls_to_rgb(h, cand_l, s))
            r = ratio(cand, bg)
            if r >= target:
                return cand
            if r > best_r:
                best, best_r = cand, r
    raise ValueError(f"{target}:1 unreachable on {bg}; best {best_r:.2f} — change hue or saturation")
```

Run it once per role (primary 3.0, supporting 4.5) and use the result everywhere the accent carries text. On a dark background the answer is nearly always **lighter**, not darker; if neither direction reaches the target, the hue or saturation has to change — returning a colour that fails the ratio is exactly the bug this function exists to prevent.
- **Centring is measured, not delegated to `anchor`.** `anchor="mm"` centres the font's em box, not the glyph shape — numerals, capital titles, and text with descenders visibly drift inside a shape. For text sitting inside an object (a numeral in a circle, a label on a card, text in a colour block), offset by the glyph bbox:

```python
bb = d.textbbox((px, py), s, font=f, anchor="mm")
dx = (bb[0] + bb[2]) / 2 - px
dy = (bb[1] + bb[3]) / 2 - py
d.text((px - dx, py - dy), s, font=f, anchor="mm", fill=fill)
```

  Measured: offset 10 px → 0.5 px. If a camera transform is active (scale/shift), divide `dx` and `dy` by the scale before applying. If the text uses per-letter `spacing`, `anchor` no longer applies — measure total width and centre it manually; never mix the two methods.
- **Text stacks are measured, not assumed.** When several lines stack vertically (label, title, subtitle), compute each line's top/bottom from `textbbox` and confirm there is no intersection. Reading order must match narrative order, and the last line must not crowd the object below it — leave at least ~0.8× line height.
- **Chips and badges are centred by construction, not by eye.** Measure the content first (icon width + gap + text width at the real font), then build the box around the group: `left = centre − content/2`, box = `[left − pad, y − h/2, left + content + pad, y + h/2]`. Placing the box and the text independently measured tens of pixels off-centre and a badge that swallowed the icon. And when a diagram line must pass near text, the text moves — a stroke drawn through a label band (a cable crossing a centred caption) measured twice before this rule existed.

## 3. Animating assets

Assets should not sit still *by accident*. When a scene would be still, first ask whether stillness is the right choice here — a held frame after a verdict can land harder than motion. If stillness is intentional, write it in the timeline with how long it holds; if not, add micro camera motion (slow zoom drift or a gentle pan). What fails QC is an *undocumented* static scene (`RENDER.md` §7): motion is the default, stillness is a decision.

The lower bound is not taste, it is the encoder: motion that is too small (radius <15 px, shift <10 px) can be quantised away at CRF 18+, leaving identical frames. Measure the motion; don't assume.

Techniques: scale in/out, directional motion and gentle rotation, parallax and depth layers, mask reveals, controlled camera zoom, creative cropping, floating motion and secondary motion, motion blur and soft shadows, and visual relationships between assets and text.

Vary techniques with content. Use professional easing (acceleration, deceleration, overshoot, anticipation, settling) rather than constant speed.

You may crop, resize, position, mask, and layer user assets as long as meaning and important detail survive. Never cut through a key subject, never stretch an image, never leave elements colliding awkwardly.

Background removal: if no cut-out tool exists, use manual masking or framing that looks good without a cut-out — and never promise a cut-out you cannot produce.

## 4. Transitions

Options: match cut, whip, directional wipe, mask reveal, shape transition, scale transition, typography-driven transition, layered parallax transition, motion-blur transition, and graphic elements that carry across scenes.

These are options, not a checklist. Pick what fits the content and keep the system coherent. Where possible, connect visual elements across scenes so nothing feels severed.

Rhythm comes from content, not numbers. The "core scenes run a few seconds" note merely describes short video in general — if an idea needs 8 seconds to land, give it 8. What still holds: put the biggest variation in the opening, and never make late-third scenes so short the viewer cannot absorb them.

**The two formats have different rhythms, and both are legitimate.**

| | Portrait, ≤60 s | Landscape, ≤300 s |
|---|---|---|
| Shape | one sharp point, stated and closed | hook → a few sections → close, with breathing room between sections |
| Attention | every second earns the next | a re-hook roughly every 40–60 s: a visual jump, a question, a change of scale |
| Rest | almost none | short beats of calm between sections |

Those are descriptions of how the two formats behave, not scene counts or durations you must hit. Scene count follows the narrative in both; what changes is that a five-minute piece has room for sections and a 60-second piece does not.

A five-minute video that keeps the 60-second rhythm exhausts the viewer by minute two — the same way a 60-second video padded with calm beats feels empty. Change the rhythm with the cap, not the other way around.

Avoid excessive glitch, random spins, unmotivated flashes, and transitions that mask the explanation. Every transition must fit inside the computed total duration. The video never grows because of a transition.

## 5. Turning ideas into visuals

Typography alone makes a video feel like a moving-text presentation. What separates strong motion graphics is a **visual idea** — one way of seeing the concept that can be drawn.

Before building scenes, give each core point one **visual mechanism**, not just a big word in the centre:

| Mechanism | Question it answers | Example form |
|---|---|---|
| Scale / ratio | "how big is it?" | one small figure among hundreds; a huge number against a tiny object |
| Accumulation | "what does it pile into?" | objects multiplying until they fill the frame (obligations, demands, hours) |
| Transformation | "what does it become?" | one shape turning into another (toy → study desk) |
| Splitting | "what is coming apart?" | one shape cleaving, a piece drifting away (child vs demands) |
| Path / motion | "where is it heading?" | timeline, arrow, forking route |
| Container / capacity | "does it fit?" | a glass overflowing, a box crammed, capacity filled |
| Side-by-side contrast | "what is the difference?" | two states adjacent, not sequential |
| Cycle | "how does it repeat?" | a rotating loop, the same day recurring |

Working rules:
- Default to one dominant mechanism per scene — but this is a default, not a ceiling. Layering two mechanisms works when one is clearly subordinate to the other (a cycle that also accumulates, a split that also transforms); what weakens a scene is two mechanisms *competing at equal weight*. Decide deliberately, either way.
- Borrowing visual idioms (bar chart, clock, stack) is fine, but never let them stay generic icons with no meaning specific to this topic.
- If an idea cannot be drawn without text, the idea isn't visual yet — change the mechanism instead of adding words.
- A mechanism may recur as a motif across scenes (accumulation used twice) as long as its form evolves.

This is not a required list. If an idea has a better shape outside the table, use it.

## 6. Variation that keeps a system

A video with a dozen or more scenes slides easily into "same layout, different words" — and the risk grows with the 5-minute landscape cap. How to avoid it without losing coherence:

- **Vary composition**, not just content: text left + image right, plain centred text, text hugging an edge, text layered behind an object, very small text in a wide space.
- **Vary density**: dense scenes (many elements) alternating with airy ones (one element, lots of space). Uniform density exhausts the viewer.
- **Vary background**: light/dark may alternate. Holding one accent colour across the video is the most reliable way to keep it reading as one family, and changing the background per section rather than per scene usually behaves better on a long piece. Both are defaults, not obligations — a deliberately multi-hue palette is legitimate when the concept is sectional.
- **Vary scale**: one scene with an oversized element bleeding off-frame makes the rest feel airy even at normal size.
- **Hold one thing constant** — an accent, a display face, a dominant motion type. That constant is what makes the variation feel intentional rather than random.

**Make the check quantitative.** Rate each scene on four axes and keep the vector beside the timeline; three consecutive scenes on the same vector is the flag, not two.

```python
scene["vary"] = dict(
    zone   = "left | centre | right | edge | full",   # where the mass sits
    density= "airy | medium | dense",
    scale  = "small | normal | oversized",            # oversized = bleeds off-frame
    bg     = "light | dark",
)
```

Two identical neighbours can be a deliberate pair (a before/after, a repeat motif). Three in a row is the signature of a template unless you have a written reason. `RENDER.md` §7's repetition gate measures the same thing from the rendered pixels and prints it; this vector is what you consult while planning, before any frame is drawn.

## 7. Sync with the voiceover

The voiceover is the primary timing source; total duration is set in stage 4 of `SKILL.md` (voice + lead-in + tail, capped by `MAX_DUR` — **60 s portrait, 300 s landscape**).

Word timing comes from the audio itself through speech recognition with per-word timestamps, not from word count (`RENDER.md` §3). Every text appearance reads from one absolute-time table (`RENDER.md` §5), and the result is proven by the sync gate (`RENDER.md` §7): text may never appear before its word.

For each key phrase: show the text as the word is spoken, reveal assets when relevant, emphasise keywords through scale/colour/weight/position/motion, allow a brief visual pause when the viewer needs to absorb, and match animation speed to the speaker's pace.

Motion must feel like a response to the voice, not random spinning. Visual effects never pull attention away from the information being explained.

Text without a supporting word in the voiceover remains legitimate (silent emphasis) — record the reason in the timeline; do not delete it merely because the sync gate cannot verify it.

**Captions are a second, separate layer.** Kinetic typography is the design; burned-in captions are the accessibility and retention baseline every short-form platform expects. If the user wants them, they come from the same `audio/words.json` (`RENDER.md` §3) and never replace the kinetic type — style them small, low, and steady, in the covering safe zone (`§2`); three words per cue is a good default, not a limit. A subtitle file and the upload copy are free from the same data; `publish.txt` is written on every delivery (`SKILL.md`), and the `.srt` is offered whenever the video is going to a platform.

## 8. Music and audio mixing

- The voiceover stays clear and dominant. Duck the music under speech, especially during important information.
- Align some transitions or animation accents to the beat when it genuinely suits the narration.
- Use sound effects sparingly; they never compete with the narrator.
- Never speed up speech or cut words to hit a duration. Preserve natural rhythm and pauses.
- Fade music out smoothly so it ends with the picture — no audio beyond the final frame, no abrupt cut. Fade **to a floor, not to absolute zero**: measured, ending the fade exactly on the last frame leaves the final 0.8 s at −61.7 dB, which is indistinguishable from the music having died. The recipe in `RENDER.md` §6 does this with a `volume` expression.
- Prevent clipping, distortion, sudden level changes, and unintended silence. Measure the finished mix: **I between −17 and −14 LUFS, true peak ≤ −1 dBTP** (`RENDER.md` §7). A quiet mix passes every other gate and still plays badly on every platform.
- Music must be **looped to the video length**, not played once (`-stream_loop -1`). A 10 s track on a 28 s video otherwise leaves 18 s of silence.
- If you download a track instead of synthesising one, apply the same licence rule as images (`RENDER.md` §4): public domain, CC0, or an explicit permissive licence, credited in the delivery message.

If the user has no music: build simple background music that fits the visual style (`RENDER.md` §8) and say plainly that it is synthesised music. Alternatively render silent and suggest the user add royalty-free music.