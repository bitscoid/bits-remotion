# Render and Verification — Remotion

Read this before building and rendering. All commands are examples — adapt filenames to the assets you actually have. Never run a command that depends on a tool you have not checked exists.

Everything here was measured on Node v26.11.1, Remotion 4.0.545, ffmpeg 7.1.5, 34 vCPU, 24 GB RAM.

## Contents
1. Environment check
2. The render pipeline
3. Measuring and analysing the voiceover
4. Analysing a reference video
5. Building frames deterministically
6. Audio mixing and export
7. Verifying the exported file (sync, geometry, audio, loudness)
8. Self-made background music
9. Common traps
10. Cleanup after delivery

## 1. Environment check

Run this first and plan around the result:

```bash
node -v; npm -v                      # need >= 22
ffmpeg -version | head -1; ffprobe -version | head -1
npx remotion --version
ls node_modules/.remotion/chrome-headless-shell/linux64/chrome-headless-shell-linux64/chrome-headless-shell
python3 -c "import faster_whisper; print('word-level ASR: available')" 2>/dev/null || echo "ASR: unavailable"
fc-list | head -20                   # available fonts
[ -n "$GEMINI_API_KEY" ] && echo "GEMINI_API_KEY: present" || echo "GEMINI_API_KEY: absent"
which curl yt-dlp
```

### One browser per machine, not one per project

`npx remotion browser ensure` writes the headless browser into **the project's own**
`node_modules/.remotion`. Measured: 243 MB per project, thrown away when the folder is
deleted, and downloaded again by the next `npm install`.

Run this once per machine instead:

```bash
bash scripts/setup-shared-browser.sh
```

It downloads the browser once, copies it to `~/.cache/remotion/chrome-headless-shell/`, and
removes the per-project copy. `remotion.config.ts` already points there.

| | Per project | Shared |
|---|---|---|
| `node_modules` | **653 MB** | **411 MB** |
| Re-download on a new project | yes, 243 MB | no |
| Survives deleting a project | no | yes |

`BITS_SHARED_BROWSER=0` forces the per-project browser. If the shared path is missing — a new
machine, a different OS — the config warns once and falls back to whatever `browser ensure`
installed, instead of failing the render.

### Vision capability (measured, never assumed)

Stages 4 and 7 need the model to open an image. Provider metadata is not evidence: on one
measured gateway, 15 of 72 models advertising `vision: true` returned an empty `content`
because the router stripped the image. Probe with one real image before relying on it:

```bash
mkdir -p work
ffmpeg -y -v error -f lavfi -i "color=c=white:s=800x400:d=1" \
  -vf "drawbox=x=40:y=40:w=200:h=200:color=blue:t=fill,drawbox=x=280:y=40:w=200:h=200:color=red:t=80,drawtext=text=X7-KILO:x=60:y=300:fontsize=48:fontcolor=black" \
  -frames:v 1 work/vision-probe.png
```

Then ask the main session to read `work/vision-probe.png` and report the text and both
shapes. Pass = it names `X7-KILO`, a blue square, and a red circle. Fail = empty reply,
a refusal, or a placeholder such as `[image omitted: ...]`.

- **Pass** → keep every image call in the main session. No subagent.
- **Fail** → delegate the image call to the `vision` subagent, once.
- **Both fail** → say so plainly and ask the user for a text description.

Batch several images into one delegated call. Timing, scene code, rendering, and every QC
number stay in the main session.

### Fonts

Remotion uses whatever the browser can resolve. Three routes, in order:

1. **`@remotion/google-fonts`** — installed. `import {loadFont} from '@remotion/google-fonts/Inter'`.
   It fetches at bundle time, so the render has no network dependency.
2. **`@remotion/fonts`** — `loadFont()` from a local file in `public/`:
   ```ts
   import {loadFont} from '@remotion/fonts';
   import {staticFile} from 'remotion';
   await loadFont({family: 'Fraunces', url: staticFile('fonts/Fraunces.ttf')});
   ```
3. **`@font-face` in CSS** pointing at `public/fonts/*.ttf`.

A font that is not loaded does not fail — it silently falls back to a system face, and the
text width changes. Measure after loading, never before:

```ts
import {measureText} from '@remotion/layout-utils'; // browser only, not in Node
const {width} = measureText({text: 'KATA', fontFamily: 'Inter', fontSize: 110, fontWeight: '900'});
```

`measureText` throws `measureText() can only be called in a browser` from a Node script.
Call it inside a component.

### Fonts ready to use

This is a starting point, not a menu — pick for the topic, and
download a family that isn't here rather than settling for the first row.

**A film has three type roles, and they should not all share a family.** The pairing is
the design; one family for all three is what makes a video read as a template.

| Role | Carries | Typical register | In `STYLE.type` |
|---|---|---|---|
| **display** | the keyword, the number, the verdict | impact, or rounded for a light topic | `displayFamily` |
| **meta** | labels, indices, chips, footnotes | mono or small-caps serif | `metaFamily` |
| **accent** | an annotation, a scribble | handwriting, sparingly, never body | `accentFamily` |

**The register is a required choice, not a default.** `src/type-presets.ts` holds eight,
each a display + meta + accent triple with the reason it suits a topic:

| Preset | Display | Meta | Accent | When |
|---|---|---|---|---|
| `playful-rounded` | Fredoka | JetBrains Mono | Caveat | food, habits, kids, everyday science |
| `playful-bold` | Baloo 2 | Nunito | Patrick Hand | fitness, productivity, how-to |
| `poster-display` | Shrikhand | Poppins | Caveat | culture, music, opinion |
| `editorial` | Fraunces | JetBrains Mono | Caveat | essay, history, analysis |
| `archival` | Libre Caslon | Space Mono | Kalam | financial, legal, historical |
| `kinetic-impact` | Anton | JetBrains Mono | Caveat | statistics, records, hooks |
| `technical` | Space Grotesk | IBM Plex Mono | Kalam | systems, code, data |
| `handwritten` | Caveat | Nunito | Indie Flower | first-person, reflective |

Set `TYPE_PRESET` in that file. `node qc/type-gate.mjs` fails on an empty key, on one family
carrying all three roles, on a family `src/fonts.ts` cannot load, and on a family with no
`capRatio` — because a default that ships in the file becomes the pairing on every topic.
Measured on this scaffold: before the gate existed, every film produced Inter + JetBrains Mono
regardless of subject. With two presets rendered from the same template, a vision read described
one as "editorial serif, warm, literary" and the other as "ultra-condensed, punchy, tabloid".

**A family name is the name the font declares, not the file or the module name.** Every preset
here uses the declared name — `Baloo 2`, `Space Grotesk`, `Space Mono`, `IBM Plex Mono`,
`Libre Caslon Text`, `Patrick Hand`, `Indie Flower` — because that is what CSS matches against
and what `@remotion/google-fonts` registers. The module is `Baloo2`; the family is `Baloo Two`.
Getting this wrong type-checks, loads the font, and then renders the fallback in silence.
`src/fonts.ts` throws on a mismatch between its `LOADERS` key and the family the loader reports,
and the gate refuses a loader key that no preset's family matches.

If no preset fits the topic, add one to `src/type-presets.ts`, its loader to `src/fonts.ts`
(keyed by the declared family), and its `capRatio` — the geometry gate reads the ratios from
that file and has no table of its own. Nothing else hardcodes a face.

| Mood / style | Families | Notes |
|---|---|---|
| Modern, neutral, UI-like | Inter, Montserrat, Manrope, DM Sans, Figtree, Poppins | Safe for narration and body |
| Playful, doodle, rounded | Baloo 2, Fredoka, Quicksand, Nunito, Gochi Hand | Light topics, children/youth |
| Handwriting, annotation | Caveat, Patrick Hand, Indie Flower, Kalam | Annotation accents — the accent role, never body |
| Elegant / retro script | Pacifico, Dancing Script, Shrikhand | Wordmarks, casual headlines — rarely body |
| Impact, kinetic type | Bebas Neue, Anton, Archivo Black, Oswald, Archivo, Unbounded, Syne | Big keywords, hooks, statistics |
| Editorial / firm serif | Fraunces, Instrument Serif, Libre Caslon Text, DM Serif Display, Newsreader, Gloock | Quotes, large figures, serious topics |
| Technical / data / mono | JetBrains Mono, Space Mono, Space Grotesk, IBM Plex Mono, Sora, Epilogue | Labels, statistics, data |
| Expressive / display | Bricolage Grotesque, Unbounded, Syne | Titles with personality — usually once |

**Adding a family that is not installed**

```bash
SLUG=fraunces
curl -s "https://api.github.com/repos/google/fonts/contents/ofl/$SLUG" \
  | python3 -c "
import json, sys, urllib.parse
fs = [f['name'] for f in json.load(sys.stdin) if f['name'].endswith('.ttf')]
plain = [f for f in fs if 'italic' not in f.lower()] or fs
print('https://github.com/google/fonts/raw/main/ofl/$SLUG/' + urllib.parse.quote(plain[0]))
" > /tmp/font-url.txt

curl -sL -o "public/fonts/Fraunces.ttf" "$(cat /tmp/font-url.txt)"
```

Under 10 KB means an HTML error page, not a font. Verify it renders before using it: load it
with `@remotion/fonts`, then `measureText` — a silent fallback to a system face is the usual
failure, and it changes every measured width.

## 2. The render pipeline

Every frame is a pure function of the frame number: `useCurrentFrame()` inside a React
component, rendered by headless Chrome, encoded by ffmpeg.

```
src/index.ts          registerRoot(Root)          <- the entry point, not optional
src/Root.tsx          <Composition id=... />      <- one per orientation
src/Timeline.tsx      <Sequence> per beat        <- reads one absolute-time table
src/Scene.tsx         one beat, pure f(frame)
src/cue.ts            CUE, derived from audio/words.json
src/style-brief.ts    STYLE                      <- the ten-line brief
public/               voiceover.wav, music.wav, images, fonts
```

```bash
npm install
npx remotion browser ensure       # once, 102 MB
npx remotion studio src/index.ts  # optional preview
npx remotion render src/index.ts portrait work/render-raw.mp4 --concurrency=8
```

**Measured render times** on a scene with 8 animated shapes, 2 text lines and a progress bar:

| Duration | Frames | Concurrency | Wall |
|---|---|---|---|
| 60 s portrait | 1800 | 1 | 127 s |
| 60 s portrait | 1800 | 4 | 47 s |
| 60 s portrait | 1800 | 8 | **42 s** |
| 300 s landscape | 9000 | 8 | **177 s** |
| 15 s with a 1080×1920 video plate | 450 | 6 | 46 s |

Concurrency is the single biggest lever: 1→127 s, 8→42 s on 1800 frames. Default to the
number of physical cores, capped at 8; past that Chrome instances fight for memory
(~256 MB each).

**The CLI argument is the composition `id`, never the component name.** Passing `Root`
where `portrait` is expected fails with `Could not find composition with ID Root`.

## 3. Measuring and analysing the voiceover

Duration:

```bash
ffprobe -v error -show_entries format=duration -of csv=p=0 "public/voiceover.wav"
```

Word timing: **speech recognition first, word-count estimation last.** ~2.5 words/second
exists only to sanity-check script length, never to place text.

Two runtimes are installed. Pick by what is available:

**A. whisper.cpp** — fastest on CPU, no Python. Install once, then keep the binary and the
model outside the project so they are not copied per video:

```bash
# once per machine
WHISPER_DIR="$HOME/.local/share/whisper.cpp"
git clone --depth 1 https://github.com/ggml-org/whisper.cpp "$WHISPER_DIR"
cmake -S "$WHISPER_DIR" -B "$WHISPER_DIR/build" && cmake --build "$WHISPER_DIR/build" -j
"$WHISPER_DIR"/models/download-ggml-model.sh small

# per video
"$WHISPER_DIR/build/bin/whisper-cli" \
  -m "$WHISPER_DIR/models/ggml-small.bin" \
  -f work/voiceover-16k.wav -l id -oj -of work/words
```

`-oj` writes `work/words.json` with per-word offsets. Measured: 3 s of audio transcribed in
14.9 s on this machine with the `small` model, CPU only.

**Move it to the durable path before anything else.** whisper.cpp writes into `work/`, and §10
deletes `work/`; `src/cue.ts` imports `audio/words.json`. Measured failure of skipping this:
the scaffold failed to bundle after a cleanup with `Cannot find module '../audio/words.json'`.

```bash
python3 - <<'PY'
import json
raw = json.load(open("work/words.json"))
# whisper.cpp emits {transcription: [{text, offsets:{from,to}, ...}]} in ms
segs = []
for t in raw["transcription"]:
    segs.append({
        "start": t["offsets"]["from"] / 1000,
        "end": t["offsets"]["to"] / 1000,
        "text": t["text"].strip(),
        "text_display": t["text"].strip(),
        "words": [{"word": w["text"].strip(),
                   "start": w["offsets"]["from"] / 1000,
                   "end": w["offsets"]["to"] / 1000}
                  for w in t.get("tokens", []) if w["text"].strip()],
    })
json.dump({"vo_delay": 1.0, "segments": segs},
          open("audio/words.json", "w"), ensure_ascii=False, indent=1)
print("wrote audio/words.json:", len(segs), "segments")
PY
```

**B. faster-whisper (Python, 1.2.1)**

```bash
ffmpeg -v error -y -i "public/voiceover.wav" -ar 16000 -ac 1 work/voiceover-16k.wav
```

```python
from faster_whisper import WhisperModel
m = WhisperModel("small", device="cpu", compute_type="int8")
segs, _ = m.transcribe("work/voiceover-16k.wav", language=None, word_timestamps=True)
# language=None auto-detects; pin "id" only when the script is Indonesian
```

Take ASR output as-is even when the transcription is wrong — you need the word boundaries,
not the spelling. ASR error of ±0.1 s is invisible; word-count estimation can be off by 2 s.

Write the result to `audio/words.json` — the one artefact every later stage reads:

```python
import json
json.dump({
    "vo_delay": 1.0,          # the single lead-in constant, never re-typed per scene
    "segments": [{"start": s.start, "end": s.end, "text": s.text,
                  "text_display": align_from_script(s),   # script.txt spelling
                  "words": [{"word": w.word, "start": w.start, "end": w.end}
                            for w in s.words]} for s in segs]
}, open("audio/words.json", "w"), ensure_ascii=False, indent=1)
```

`text_display` is the sentence as `script.txt` spells it. The ASR `text` stays exactly as
recognised because only its boundaries matter — but it must never reach a subtitle.

If the voiceover is delayed during mixing, every ASR time must be shifted by that delay
before use. Keep it as one constant (`VO_DELAY`) and derive all times from it.

If the computed total exceeds the cap — **60 s portrait, 300 s landscape** — stop and ask.

### When there is no voiceover

1. **Generate with Gemini TTS** (needs `GEMINI_API_KEY`). Models: `gemini-3.8-flash-tts`
   (best) and `gemini-3.8-flash-lite-tts` (separate quota).
   The API is the **Interactions** endpoint: `POST /v1beta/interactions`, style in
   `input[].content[].annotations[].style`, audio in `steps[].content[].data`.
   Build the payload with `json.dumps` (never inline the script into a curl `-d`),
   and strip `[Hook]` / `[Inti N]` / `[Penutup]` labels before sending — the model reads
   text verbatim and will speak them aloud.
2. **No API key / failure:** never fabricate a voice. Ask the user to record the approved
   script. If they want a draft without voice, estimate timing from word count and label
   it a draft.

## 4. Analysing a reference video

The reference comes from the user (file or URL) or is found on Pinterest. For a URL,
download with `yt-dlp "<url>" -o "assets/reference.mp4"` before analysing. Read it in four
steps: a **contact sheet** for the design layers, **motion strips** for the temporal ones,
an eight-layer read, and a brief written into `src/style-brief.ts`.

A still cannot show easing, entry duration or text granularity — those only exist in
consecutive frames.

```bash
REF="assets/reference.mp4"
ffprobe -v error -show_entries stream=width,height,r_frame_rate,duration -of default=nw=1 "$REF"
```

The reference must match the orientation chosen in stage 1 — a mismatch fails the filter
below and never changes `MAX_DUR`.

### Pass 1 — contact sheet over the whole clip

```bash
RDUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$REF")

# ~60 thumbnails across the whole clip, never coarser than one every 2 s
DIMS=$(python3 -c "import math; d=max(float('$RDUR'),1); f=min(2.0, 60/d); c=max(1, round(d*f)); print(f'{f:.3f} {math.ceil(math.sqrt(c))}')")
FPS=${DIMS% *}; GRID=${DIMS#* }

mkdir -p work/ref
ffmpeg -i "$REF" -vf "fps=$FPS,scale=240:-1,tile=${GRID}x${GRID}" -frames:v 1 -update 1 work/ref/contact.png
```

The grid is sized from the clip's duration. A fixed `tile=6x5` at `fps=2` covers the first
**15 s** of any clip and then fails on the remaining tiles.

### Pass 2 — motion strips around three cuts

```bash
ffmpeg -i "$REF" -vf "select='gt(scene,0.3)',showinfo" -an -f null - 2>&1 \
  | grep -o "pts_time:[0-9.]*" | cut -d: -f2 > work/ref/cuts.txt

awk 'NR==1{f=$1} {a[NR]=$1; n=NR}
     END{if(!n){print "no cuts found" > "/dev/stderr"; exit}
         printf "%s\n", f
         if(n>2) printf "%s\n", a[int((n+1)/2)]
         if(n>1) printf "%s\n", a[n]}' work/ref/cuts.txt > work/ref/pick.txt

# 0.5 s before each cut, 1.0 s after: 45 frames in a 15x3 tile
while read -r T; do
  S=$(awk -v t="$T" 'BEGIN{x=t-0.5; if(x<0)x=0; printf "%.3f", x}')
  ffmpeg -ss "$S" -i "$REF" -t 1.5 -vf "fps=30,scale=200:-1,tile=15x3" \
    -frames:v 1 -update 1 "work/ref/strip-$T.png"
done < work/ref/pick.txt
```

`showinfo` writes at info level — adding `-v error` silences the very lines this pipeline
greps, and an empty `cuts.txt` then reads as "a reference with no cuts".

### Pass 3 — the eight-layer read

Read the sheet and the strips layer by layer. Every layer answers one question and produces
one line of the brief. "Warm palette" is not a reading; "70% near-black, 20% cream, 10%
orange, orange on one word per frame" is.

| Layer | What to read | Where it lands |
|---|---|---|
| **Palette** | roles (ground / ink / accent), the share of frame each holds, whether the accent marks one word or a whole field, whether the palette shifts between chapters, texture over the colour | `STYLE.palette` |
| **Typography** | title-to-meta size ratio, families and the axis varied, tracking on caps, whether type is used as an image | `STYLE.type` |
| **Composition** | empty-space ratio, where the mass sits, layer count, full-bleed vs card | `STYLE.layout` |
| **Graphic language** | shape vocabulary, corner radius, stroke weight, fill style, icon grid, diagram grammar, texture | `STYLE.graphics` |
| **Motion** | entry duration in frames, easing shape, overshoot, what moves, text granularity, secondary motion | `STYLE.motion` |
| **Rhythm** | cut distribution, event density per second, whether cuts land on speech or music | `STYLE.rhythm` |
| **Sound** | whoosh / impact / riser / tick vocabulary, silence as punctuation | `STYLE.sound` |
| **Attention** | what is on screen at 1.5 s, the chapter system, withholding, interruptions, callbacks | `STYLE.attention` |

Two closing reads, both required:

- **Signature device.** Name the one or two things that are this reference's fingerprint.
  Write the principle, not the form, and then use it differently.
- **Weakness.** Name what the reference does badly. That is where the build beats it.

The reference is a **floor, not a ceiling**. At least one decision must come from the topic
and be absent from the reference.

### Pass 4 — write the brief into `src/style-brief.ts`

Ten lines as typed constants. Not a separate JSON file — the build already has one source
of truth per value, and `STYLE` is where the scene reads it. Update a constant when a
decision changes; stage 7 checks the export against it.

### Finding a reference on Pinterest (when the user gives none)

If the user supplies no reference file or URL, searching is **mandatory before self-design**
— the budget and failure modes are specified in `SKILL.md` stage 3: ≥5 pin candidates across
≥2 searches as the floor, ~8 as the working target, one download attempt at a time, discard
by the filter below, report each failure in one line.

Search in this order — do not stop at the first failure:

1. `https://id.pinterest.com/search/pins/?rs=typed&q=motion+graphics+<topik>`
2. Judge fit, not relevance: palette, type register, motion pace.
3. If nothing fits, take something loosely related — same mood, not same subject.
4. If even that fails, design the style yourself and say so in one line.

Filter before use — discard candidates that run under 5 s or over 180 s, have the wrong
aspect ratio, have no video stream, or are visually unusable.

**Aspect ratio, not resolution.** 720×1280 is a valid reference for a 1080×1920 build.
Orientation must match; aspect ratio within ±2%; resolution is irrelevant.

**When the user supplies the Pinterest URL themselves**, skip the search entirely.

### Sourcing images

Three sources; choose per scene by whatever communicates fastest: user images, images found
and downloaded, code-drawn graphics.

When downloading, verify before use: subject matches the script, resolution at least the
output size in the dimension it occupies, no watermark, licence permits use. Save as
`public/image-01.png`, `image-02.png`, … and record every source URL for the delivery
message.

Remotion note: files in `public/` are referenced with `staticFile('image-01.png')`, not by
path.

## 5. Building frames deterministically

Remotion gives determinism for free — a frame is a function of `useCurrentFrame()`. What
still has to be enforced:

- **No clock, no unseeded randomness.** `Date.now()`, `Math.random()`, `setTimeout` and
  `requestAnimationFrame` all break frame-parity. Use `random()` from `remotion` (seeded by
  the frame) or `@remotion/noise`.
- **No `play()`.** `<OffthreadVideo>` and `<Audio>` are driven by the renderer. For local
  video files that are already H.264, `OffthreadVideo` is the fastest and the most stable;
  measured 450 frames of a 1080×1920 plate in 46 s at concurrency 6.
- **One absolute-time table.** `CUE` in `src/cue.ts` holds every beat start in video
  seconds. `Timeline.tsx` derives each `<Sequence>` duration from it; a scene never keeps its own
  offset. Scene boundaries come from ASR sentence boundaries, not typed twice.
- **Text must be a DOM node.** The sync gate reads `getBoundingClientRect()` — text drawn
  into a canvas or an SVG path is invisible to it.

**Easing.** Use `Easing` from remotion or a `spring()`. Measured entry of 8–12 frames with
`spring({damping: 200})` reads as a snap; longer than 20 frames reads as a drift.
`CRAFT.md` §1 gives the curve to pick per role — entrance, travel, morph carrier, reveal,
whip — and §2 explains why a spliced curve reads as choppy at 30 fps.

**Scene handoffs.** A beat boundary does not have to be a cut. `CRAFT.md` §4 gives the
carrier contract — source, carrier, target, never visible at the same time — and §5 the
recipe to pick by what two scenes share. A handoff is a stage-5 decision, not a scene
detail.

**Sub-pixel drift.** CSS animates transform values with sub-pixel precision, so a 0.4 px
per-frame drift does change pixels. Keep drift in `translateX`/`translateY`,
not `left`/`top`, so the compositor handles it.

**Motion that survives the encoder.** Every second needs at least one element whose
**position** changes. Shape pulses that only change radius can quantise away at CRF 18+.
This is an encoding requirement, not a ban on held frames — a documented hold is a
legitimate edit.

**Render with resume.** Remotion has no partial-render resume, but `--frames=0-499` renders
a range into the same output. For a long build, render ranges and concatenate:

```bash
for r in 0-2999 3000-5999 6000-8999; do
  npx remotion render src/index.ts landscape "work/part-$r.mp4" --frames=$r --concurrency=8
done
```

**Memory.** Each concurrent Chrome is ~256 MB. On a 24 GB machine, 8 is comfortable; past
12 the OS starts swapping and the render slows down.

## 6. Audio mixing and export

Duration follows the voiceover. Compute total duration and frame count first:

```bash
ORIENT=landscape                # portrait | landscape — read it from stage 2, never guess
case "$ORIENT" in
  portrait)  MAX_DUR=60 ;;
  landscape) MAX_DUR=300 ;;
esac
VO_DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "public/voiceover.wav")
DUR=$(awk -v v="$VO_DUR" 'BEGIN{t=v+2.5; d=int(t); if (d<t) d++; print d}')
FRAMES=$((DUR*30))
echo "orient=$ORIENT voiceover=$VO_DUR total=$DUR s frames=$FRAMES cap=$MAX_DUR"
```

Put `DUR` and `FRAMES` into `src/Root.tsx` as `durationInFrames`.

**The cap is a ceiling, not a target.** Derive the number from the last beat, never from the
orientation. `cue.ts` already does this: `DURATION_SECONDS` is the last word, plus `vo_delay`,
plus a 1.5 s tail. `Root.tsx` multiplies it by 30.

Measured failure on this scaffold: a 1800-frame composition against a CUE ending at 7 s held
the closing beat for 53 s, so 87% of the video was one still frame and the contact sheet showed
nine near-identical thumbnails. The shipped scaffold now derives 10 s from a 7.5 s script, and
`qc/make-player-host.mjs` reads the same number, so the host and the composition cannot drift
apart in silence.

```bash
node -e "const {DURATION_SECONDS}=require('./src/cue'); console.log(DURATION_SECONDS*30)"
```

**Audio is placed in the composition, then normalised after export.** Remotion mixes through
`<Audio>` and does **not** normalise loudness — measured −34.4 LUFS for a sine at 0.8 volume,
which fails every platform. The fix is one ffmpeg pass on the exported file:

```bash
ffmpeg -y -i work/render-raw.mp4 \
  -af "loudnorm=I=-16:TP=-1.5:LRA=11" \
  -c:v copy -c:a aac -b:a 192k -ar 48000 \
  out/<slug>.mp4
```

`-c:v copy` means the video is never re-encoded, so this costs seconds. Measured: −34.4
LUFS before, **−15.9 LUFS** after. The raw render goes to `work/` and only the normalised
file carries the deliverable name — no `-final` suffix, a re-render overwrites the same path.

Ducking music under speech is done in the mix, not in ffmpeg — set `volume` on each
`<Audio>` and animate it with `interpolate()` on the frame:

```tsx
<Audio src={staticFile('music.wav')} volume={(f) =>
  interpolate(
    f,
    [0, fps, durationInFrames - fps * 2.5, durationInFrames],
    [0, 0.25, 0.25, 0.004],   // never exactly 0 — see below
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
  )} />
```

The final value is `0.004`, not `0`. A fade that reaches absolute zero on the last frame is
indistinguishable from the music having died: measured on a 28 s film, it left the final 0.8 s
at **−61.7 dB** and the tail-floor check failed. Ending at about −48 dB keeps the bed audible
under the last held frame.

A three-step `loudnorm` → `apad` → `amix` chain exists for pipelines that have no mixer of
their own. Remotion mixes, so the only post-pass needed is the loudness line above. Do not
stack both.

Output is H.264 + AAC 48 kHz stereo automatically. `-ac 2` is not needed.

## 7. Verifying the exported file

Never trust the duration shown by the studio. Measure the MP4 itself:

```bash
ffprobe -v error -count_frames -select_streams v:0 \
  -show_entries stream=nb_read_frames,width,height,r_frame_rate -of csv=p=0 out/<slug>.mp4
ffprobe -v error -show_entries format=duration:stream=duration,codec_name,channels \
  -of default=nw=1 out/<slug>.mp4
```

Target: container ≈ `DUR` seconds, `FRAMES` video frames, 30 fps, H.264 + AAC, resolution as
planned. Report the real numbers. If they miss, fix and re-export — never round the report.

### Sync gate

Every text must be **proven** to appear at its word time and not before. The text is DOM, so
read it back instead of trusting the timeline.

Two routes were measured:

| Route | Cost | Verdict |
|---|---|---|
| `remotion still` per sample | 19.4 s cold, 6.4 s warm | too slow for 20 samples |
| `@remotion/player` in a headless page + `seekTo` + DOM query | **251 ms per sample** | use this |

The scaffold ships this as `qc/make-player-host.mjs` + `qc/sync-gate.mjs`:

```bash
node qc/make-player-host.mjs          # writes work/player-host.html
node qc/sync-gate.mjs                 # derived keywords + optional extras
```

The keywords come from `src/cue.ts` through the bundled page, so the gate can never check a
time the video does not use. `qc/sync-cases.json` may **add** cases — a stamp mid-sentence, a
number on its own beat — as `{text, t_vo}` or `{text, wordAt}`. It cannot remove a derived
case: a gate you can quietly shrink is not a gate.

The gate converts each `t_vo` to video time with `VO_DELAY`, then proves two things:

- the text **is** present at `t + 0.10`
- the text is **not** present at `t − 0.15`

The asymmetry matters: 0.1 s late is invisible, appearing early is a visible defect.

Measured behaviour of the DOM read-back:

```
frame 0   ["harga", "label pendukung 0"]
frame 45  ["naik", "label pendukung 45"]
frame 120 ["kali", "label pendukung 120"]
```

Text changes per frame and boxes move, so this is a real gate, not a stub.

### Geometry gate

Run in the same headless page. The thresholds are the numbers in `GUIDE.md` §2; only the way
you get the box changes.

```js
await page.evaluate(async (seconds) => {
  await window.__seekTo(seconds);
  const out = [];
  for (const el of document.querySelectorAll('[data-qc]')) {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    out.push({
      text: el.textContent.trim(),
      x: r.x, y: r.y, w: r.width, h: r.height,
      color: cs.color,
      fontSize: parseFloat(cs.fontSize),
      varName: el.dataset.qc,
    });
  }
  return out;
}, t);
```

- **Safe area** — no box crosses 4% of the frame edge. For portrait, the stricter 10% bottom
  and 12% right also apply; anything that must be read sits at 15% from the bottom.
- **Cap height** — CSS `fontSize` is not cap height. The ratio is font-specific: on DejaVu
  Sans Bold, capitals are 0.73× the size. Measure a capital once per face with
  `measureText` and solve for the size. Threshold: 4% of the short side for primary,
  2.5% for supporting.
- **Contrast** — 3.0:1 primary, 4.5:1 supporting, measured against the pixels actually
  behind the text, not the page background.
- **Collision** — coverage of two boxes; exclude identical boxes (deliberate overlap).

Add `data-qc="role"` to every text node you want the gate to see.

### Audio gate

```bash
# 1) no dead air inside the speech region
VO_DELAY=$(python3 -c "import json;print(json.load(open('audio/words.json'))['vo_delay'])")
VO_DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 public/voiceover.wav)
SE=$(awk -v a="$VO_DELAY" -v b="$VO_DUR" 'BEGIN{printf "%.2f", a+b}')

ffmpeg -i out/<slug>.mp4 -af silencedetect=noise=-50dB:d=0.5 -vn -f null - 2>&1 \
  | grep -E "silence_(start|end)" \
  | awk -v s="$VO_DELAY" -v se="$SE" '
      /silence_start/ { st=$NF; next }
      /silence_end/   { en=$NF; if (en > s+0.25 && st < se-0.2) { print "FAIL dead air " st "-" en "s"; bad=1 } }
      END { if (bad) exit 1; print "audio gate 1 OK (speech " s "-" se "s)" }'

# 2) loudness and true peak
ffmpeg -hide_banner -nostats -i out/<slug>.mp4 -af ebur128=peak=true -f null - 2>&1 \
  | grep -E "^\s+(I|Peak):" | sed 's/^ *//'
```

Target: **I between −17 and −14 LUFS**, true peak ≤ −1 dBTP.

**Tail floor.** When the film has music, the last half second must still carry sound: a bed that
stops early reads as the music having died. Measure the export, not the timeline:

```bash
T=$(ffmpeg -hide_banner -sseof -0.5 -i out/<slug>.mp4 -af volumedetect -vn -f null - 2>&1 \
    | sed -n 's/.*mean_volume: \(-\?[0-9.]*\) dB/\1/p')
awk -v t="$T" 'BEGIN{if (t < -50) {print "FAIL tail floor " t " dB"; exit 1} print "tail floor " t " dB OK"}'
```

Without music the tail is silent by definition and this check does not apply — say so in the
delivery message instead of reporting a pass. Measured: a bed that stops 1 s early reads
**−61.7 dB**; the same film with the bed carried to the end reads **−45 dB**.

`silence_start` prints the time as the last field; `$3` matches nothing and every gate
appears to pass.

### Picture gates

```bash
ffmpeg -i out/<slug>.mp4 -vf "freezedetect=n=0:d=1.0" -an -f null - 2>&1 | grep freeze_
ffmpeg -i out/<slug>.mp4 -vf "blackdetect=d=0.5:pix_th=0.02" -an -f null - 2>&1 | grep black_
```

`freezedetect` needs `n=0`. Its default `n=0.001` (about −60 dB) false-positives on flat
graphics, and `n=-60dB` is not a legal argument — `n` is a linear 0–1 ratio.
`blackdetect` needs `pix_th=0.02`: a `0x0B0B0F` background reads as black from `0.05` up.

A deliberate hold is legitimate when it is written in the timeline. Undocumented freezes
are defects.

### Repetition gate

Two beats that put the same role in the same box at the same size are a template, not a
motif. Compare the `data-qc` boxes between consecutive beats: same role, same size, same
position means the layout did not change. A deliberate pair is legitimate — a before/after,
a repeated motif. Three in a row is the signature of a template. When it is deliberate, write
the reason in `CUE` beside the beats so the next revision does not "fix" it.

### Contact sheet

```bash
mkdir -p work/check
CELLS=$(( (DUR + 2) / 3 ))
GRID=$(python3 -c "import math; print(max(1, math.ceil(math.sqrt($CELLS))))")
ffmpeg -i out/<slug>.mp4 -vf "fps=1/3,scale=240:-1,tile=${GRID}x${GRID}" \
  -frames:v 1 work/check/sheet.png
```

Measured: 60 s → 20 cells in 5×5; 300 s → 100 cells in 10×10.

**Read the sheet against the review flags** in `CRAFT.md` §6 — POP, STUTTER, HITCH, BLANK,
COLORJUMP, GHOST, HANDOFF-JUMP and the rest. Those are the defects no number reports.

**Read the sheet; do not only count cells.** Two defects reached a render on this scaffold
and passed every numeric gate:

- a large word straddling the edge of its block, half on black — unreadable, and no
  bbox check fired because the box itself was inside the frame;
- rows of identical thumbnails, because the drift stopped after one second.

If the main model cannot see the sheet, hand it to the `vision` subagent in one call and
work from the description. A gate that measures numbers cannot tell you a word is
illegible.

### What is a hard requirement

Two checks protect the file itself and are not advice:

- **frame count matches `DUR × 30`** — a truncated render passes every visual check;
- **loudness and tail floor** — a quiet mix passes every other gate and plays badly.

Everything else is reported with its number and a decision.

## 8. Self-made background music

Only when the user supplies none. Generate a simple ambient pad with ffmpeg —
several chord tones layered at low volume, plus a light pulse. Export as 48 kHz WAV into
`public/music.wav` and reference it with `staticFile`.

Tell the user plainly that this is simple synthesised music, not a professional composition.

Optional synthetic SFX for transitions:

```bash
ffmpeg -f lavfi -i "anoisesrc=d=0.4:c=pink:a=0.5" \
  -af "afade=t=in:d=0.1,afade=t=out:st=0.2:d=0.2,volume=0.3" -ar 48000 public/whoosh.wav
```

## 9. Common traps

- **Missing `registerRoot`.** `remotion render` on a file that does not call it fails with
  `this file does not contain "registerRoot"`. Keep `src/index.ts` as the entry point and
  never pass a component file to the CLI.
- **Missing `tsconfig.json`.** Remotion refuses to start without one. The scaffold ships it.
- **Composition id vs component name.** The third CLI argument is the `id`, not the exported
  component.
- **Browser not installed.** Every render fails with a protocol error. `npx remotion browser ensure`.
- **A font that is not loaded falls back silently.** Text width changes, the cap-height gate
  passes the wrong size. Await `loadFont()` before the first frame that uses it.
- **`measureText` outside a browser** throws. It is a component-time call, not a Node one.
- **`Date.now()` or `Math.random()`** breaks frame-parity: two renders of the same file
  differ. Use `random()` from remotion.
- **`<Video>` instead of `<OffthreadVideo>`** is markedly slower and can drop frames under
  load. Use `@remotion/media` or `OffthreadVideo`.
- **Concurrency past ~12 on 24 GB** swaps and slows down. Measure before raising it.
- **A long render with no resume.** Render ranges with `--frames=` and concatenate.
- **Loudness is not normalised.** Remotion mixes; it does not master. One `loudnorm` pass
  after export, with `-c:v copy`.
- **`npx remotion still` in a loop** for a sync gate costs 6.4 s per sample. Use the Player.
- **`<Series>` is the wrong tool here: it stacks children back to back, ignoring a start
  time.** A 1 s
  lead-in needs its own `<Sequence>`, or every beat fires one second early. Measured
  symptom: a reveal scheduled at 4.72 s appeared at 3.72 s. Use `<Sequence from=...>`.
- **`useCurrentFrame()` inside a `<Sequence>` is already sequence-local.** Subtracting
  `beat.start` a second time makes the reveal frame hugely negative and the text never
  appears. Measured symptom: computed opacity stayed 0 for the whole beat.
- **A drift that stops early leaves duplicate frames.** Animating position only over the
  first second produced identical thumbnails for the rest of a 15 s video — the contact
  sheet showed rows 2 and 3 as duplicates. Drift across the whole beat.
- **A card revealed only at `wordAt` leaves the cut empty.** Measured: the ~0.4 s between a
  cut and its word showed one small meta label and nothing else, and the contact sheet flagged
  it as a near-empty frame. Keep a shape moving across the whole composition — a progress rule
  at `scaleX 0→1` over `durationInFrames`. It fills the gap and guarantees the encoder sees a
  position change, so a beat can never be read as a freeze.
- **A large word placed by `top` sits on its baseline box, not inside a block.** Measured
  on the render: a 132 px display word at `top: 1040` with a block at `top: 1120` straddled
  the block's top edge, half on black and half on orange. Give the block a `lineHeight: 1`
  box and place the text inside it, then check on the contact sheet.
- **`opacity: 0` still has `textContent`.** A sync gate that only reads text finds every
  future word on screen at frame 0. Walk the parent chain and multiply computed `opacity`,
  and require a non-zero box, or an invisible element still counts as on screen.
- **An empty lead-in reads as a blank opening.** Measured on the contact sheet: the first
  two thumbnails were empty canvas. Put the title card in the lead-in `<Sequence>`.

## 10. Cleanup after delivery

`work/` holds every intermediate file: bundles, `ref/`, `check/`, `voiceover-16k.wav`,
player host, `render-raw.mp4`. It can reach hundreds of megabytes. Once the video is
verified and delivered, delete the whole `work/`.

**Keep — everything a later revision needs:**

| Path | Why it must survive |
|---|---|
| `script.txt` | the narration source |
| `src/` | the whole visual design: `Root.tsx`, `Timeline.tsx`, `Scene.tsx`, `style-brief.ts` |
| `public/voiceover.wav` | timing source; the composition plays it |
| `audio/words.json` | **the only non-reproducible derived file** — a fresh ASR pass returns ±0.1 s different timestamps and desyncs a re-render |
| `public/music.wav` | re-mix without regenerating |
| `public/` | images, fonts, plates, music |
| `qc/sync-cases.json` | optional extra cases; the derived keywords run without it |
| `package.json`, `tsconfig.json` | the toolchain |
| `out/<slug>.mp4` | the deliverable |
| `out/<slug>.srt` | subtitle track, when generated |
| `out/publish.txt` | caption, description, hashtags |

Before deleting, confirm the required checks passed — duration, frame count, loudness, tail
floor, black/freeze — measured from the exported MP4, never from the timeline.

**Verify the kept set is self-sufficient:**

```bash
# assets the composition reads
grep -rhoE "staticFile\('([^']+)'\)" src | sed "s/staticFile('//;s/')//" | sort -u | while read p; do
  [ -e "public/$p" ] || echo "MISSING for re-render: public/$p"
done

# the timing table the build imports — not a staticFile(), so the check above misses it
[ -e audio/words.json ] || echo "MISSING for re-render: audio/words.json"
```

An empty result means `rm -rf work` cost nothing that matters: the bundle rebuilds in one
command, and a re-render restores the full video with identical timing.