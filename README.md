<div align="center">

# 🎬 BITS Motion — Remotion

**Turn a single topic into a finished motion-graphics video.**

No storyboard. No editing advice. A rendered MP4 you can publish.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
![Format](https://img.shields.io/badge/output-MP4%20H.264%20%2B%20AAC-blue)
![Frame rate](https://img.shields.io/badge/fps-30%20CFR-informational)
![Duration](https://img.shields.io/badge/duration-60s%20portrait%20%7C%20300s%20landscape-brightgreen)
![Docs](https://img.shields.io/badge/docs-English%20only-lightgrey)

</div>

---

## ✨ What it does

Give it a topic. It writes the voiceover script, gathers your assets, syncs every word to the picture, renders the video, and proves the result with real numbers.

```
topic ──► script ──► voice ──► word timing ──► scenes ──► MP4 ──► verified
```

The output is an **MP4 (H.264 + AAC, 30 fps, constant frame rate)** whose length is derived from the voiceover, capped by orientation:

| Orientation | Cap | Target |
|---|---|---|
| Portrait `1080×1920` | **60 s** | Reels / TikTok / Shorts |
| Landscape `1920×1080` | **300 s** (5 min) | YouTube explainer |

Longer only when you ask. Orientation is chosen in stage 1, before the script is written, because it sets the cap; a supplied reference must match that orientation and never changes it. Without an answer it asks once, then defaults to **1920×1080** landscape.

---

## 🚀 Quick start

```bash
# 1. install into your agent's skill directory
git clone https://github.com/bitscoid/bits-remotion.git \
  ~/.config/opencode/skills/bits-remotion

# 2. install the browser once per machine (not once per project)
node -v
ffmpeg -version | head -1
bash <skill>/scaffold/scripts/setup-shared-browser.sh

# 3. ask for a video
"buatkan motion graphic tentang kenapa kopi bikin ngantuk"
```

That's the whole interface. No config file, no CLI flags, no build step. The full environment probe — ASR, fonts, network, API key — is `references/RENDER.md` §1.

---

## 🧭 Where it runs, and what a full run looks like

### Any directory, one folder per video

Run the agent from any directory — your home, a projects folder, a client folder. You create
nothing first. Stage 1 derives a slug from the topic title, tells you the slug, then creates
that folder and works inside it.

```
~/projects/
├── tiga-mitos-otak/      ← created by run 1
└── kopi-dan-tidur/       ← created by run 2
```

Three rules govern collisions:

| Situation | What happens |
|---|---|
| Same topic again | Continues in the existing folder and overwrites the same file names — a revision, not a copy |
| Different topic, same slug | Stops and asks before touching anything |
| Anything else | Creates a new folder, never `-2`, `-3` or a date suffix |

Nothing is shared between projects: no global config, no state file, no daemon. Two folders can
be rendered side by side and cannot affect each other.

### The run, stage by stage

| Stage | What happens | What you see |
|---|---|---|
| 1 · Script | Orientation and cap decided first, because the cap sets the script length. Script written with `[Hook]`/`[Inti N]`/`[Penutup]` labels | The script in Indonesian, with format and word count |
| 2 · Assets | One message asking for recording, music, reference, images, orientation, captions — **once** | Six numbered questions, all optional except the voice |
| 3 · Readiness | Confirms, or fills gaps from documented defaults | One line, or a single clarifying question |
| 4 · Measure | Real voiceover duration, ASR word timing, reference read, font choice | The style brief and the exact duration |
| 5 · Timeline | One absolute-time table | Nothing — internal planning |
| 6 · Build | Scene code, then render, then one `loudnorm` pass | Progress, then the raw file |
| 7 · QC | Gates measured from the exported file | The delivery numbers and `publish.txt` |

### End to end, with the commands

```bash
mkdir -p ~/projects && cd ~/projects
```

Then ask the agent, in Indonesian:

```
buatkan motion graphic tentang kenapa kopi bikin ngantuk
```

It replies with the script and, in the same message, the six asset questions. Answer them or
say `buat semuanya otomatis`. From there it creates `~/projects/kenapa-kopi-bikin-ngantuk/`,
fills it, and runs the build:

```bash
cd ~/projects/kenapa-kopi-bikin-ngantuk
cp -r <skill>/scaffold/. .        # once per project, before the first render
npm install
bash <skill>/scaffold/scripts/setup-shared-browser.sh   # once per machine, not per project
node qc/make-player-host.mjs
npx remotion render src/index.ts portrait work/render-raw.mp4 --concurrency=8
ffmpeg -y -i work/render-raw.mp4 -af "loudnorm=I=-16:TP=-1.5:LRA=11" \
  -c:v copy -c:a aac -b:a 192k -ar 48000 out/kenapa-kopi-bikin-ngantuk.mp4
node qc/sync-gate.mjs && node qc/geometry-gate.mjs
```

| Path | What it is |
|---|---|
| `out/<slug>.mp4` | the video |
| `out/publish.txt` | caption, description, hashtags |
| `src/` | the whole visual design |
| `audio/words.json` | the timing table, durable |
| `qc/` | the two gates |

Re-running the render in the same folder produces the same video from the same inputs.

## 🧠 Design philosophy

This skill is **rules, not a template.**

| Layer | Divided how |
|---|---|
| 🎯 **Accuracy** | Measurable and reported with numbers — timing follows the spoken word, text stays in the safe area, cap height meets threshold, contrast meets WCAG, no dead air inside the narration, mix loudness in band, frame count is exact. Two are hard requirements: frame count equals duration × 30 in the exported file, and the finished loudness/tail floor |
| 🎨 **Taste** | Entirely yours — palette, scene count, transitions, typeface, mood, motion rhythm |

The test applied to every rule before it entered these documents:

> **① Can it be proven by measurement?** &nbsp;and&nbsp; **② Does it leave creative choice alive?**

A rule that passes ① but fails ② is a restriction, not a standard. Rejected examples that live on as warnings in the docs: *"overshoot must be 1.16"*, *"the hook must be 3 seconds"*, *"scenes must be 2–6 seconds"*.

**One skill, no shared library.** The agent writes the render code and the QC checks per project. Every video gets code shaped to its own content instead of being squeezed into a shared engine.

**Vision routing.** Every image call — asset verification, reference frames, QC contact sheets — is attempted by the main model first. Provider metadata is not trusted: a model that advertises `vision: true` can still return empty content. On a real fail (`content` empty, refusal, or an `[image omitted: ...]` placeholder) that one call goes to the `vision` subagent, which owns a failover chain of models proven to read images. Text, timing, scene code, rendering and every number stay in the main session. Detail in `SKILL.md` → *Vision routing*, probe in `RENDER.md` §1.

---

## 🎯 What it actually enforces

<details open>
<summary><b>⏱ Timing</b></summary>

Word timing comes from **automatic speech recognition with per-word timestamps**, not from counting words. Every text appearance reads from one absolute-time table, and a sync gate proves no text appears before its word.

Word-count estimation is the documented fallback, clearly labelled as approximate.

</details>

<details open>
<summary><b>📐 Typography geometry</b></summary>

- Safe area: **4%** from every edge — and for portrait short-form, **10% from the bottom / 12% from the right** as the floor, with anything that must be read kept at **15% from the bottom** because the platform UI sits over that band
- **Cap height**, not font size: **4%** of the short side for primary text, **2.5%** for supporting text (1080p landscape → 43 px / 27 px). Measured once per face with `measureText`, never from a string's box
- Centring is measured from the rendered box, never delegated to `text-align` alone
- Text collision checked by **coverage of the smaller box (< 0.02)**, not IoU — IoU 0.16 lets a 20% line overlap pass

</details>

<details open>
<summary><b>🌗 Contrast</b></summary>

Thresholds are tied to the text's **role**, not its pixel size — small moving text reads far worse than static text of the same size.

- Primary text: **3.0:1**
- Supporting text: **4.5:1**

Measured with the WCAG formula: a light salmon `(238,150,130)` on cream `(245,241,234)` reaches only **2.00:1** — a hard fail; darkening the accent to `(166,82,70)` reaches **4.76:1** and passes for supporting text. The docs ship a `fit_accent()` helper that walks lightness in **both directions** and raises when the target is unreachable, so the palette is chosen by measurement rather than by eye.

</details>

<details open>
<summary><b>🔊 Audio</b></summary>

- Voiceover and music mixed in the composition, then **one** `loudnorm` pass on the export
- Music **ducked under speech** with a fading `volume` curve that returns to its bed level, then faded to a floor at the end
- Audio gate is **windowed**: no dead air inside the speech region, and with music the tail must still carry sound
- Finished mix measured: **I ∈ [−17, −14] LUFS**, true peak ≤ −1 dBTP

Measured trap that produced the loudness rule: Remotion mixes but does not master — a sine at 0.8 volume exported at **−34.4 LUFS**, and one `loudnorm` pass on the export brought it to **−15.9**. The video is never re-encoded (`-c:v copy`).

</details>

<details open>
<summary><b>🎞 Motion</b></summary>

Every second of video keeps at least one element moving. Verified with `freezedetect=n=0` — never the default `n=0.001` (about −60 dB), which false-positives on flat graphics. The 1 s lead-in before speech is exempt.

The exported frame count is asserted: it must equal duration × 30. A truncated render passes every visual check and only the metadata shows it.

The lower bound is the encoder, not taste: motion under ~10 px can be quantised away at CRF 18+, leaving identical frames.

</details>

<details>
<summary><b>🔁 Repetition gate (flags, never judges)</b></summary>

Scenes with the same structural signature get flagged so you can decide: *deliberate motif* or *coincidence to fix*. The gate forces that decision to be written down; it never homogenises the output.

Signatures are the `data-qc` boxes: same role, same size, same position on consecutive beats means the layout did not change. No pixels are read, so a dark theme with light text is not a special case.

</details>

---

## 📁 Project output

Each video becomes a self-contained folder:

```
tiga-mitos-otak/
├── script.txt              voiceover script, clean text, no labels
├── package.json            Remotion + React toolchain
├── tsconfig.json           required by Remotion
├── remotion.config.ts      points at the shared browser
├── scripts/
│   └── setup-shared-browser.sh  one-time, per machine
├── src/
│   ├── index.ts            registerRoot(Root) — the entry point
│   ├── Root.tsx            one <Composition> per orientation
│   ├── Timeline.tsx        <Sequence> per beat + the audio tracks
│   ├── Scene.tsx           one beat, pure f(frame)
│   ├── cue.ts              CUE, derived from words.json
│   └── style-brief.ts      STYLE
├── qc/
│   ├── player-entry.tsx    the in-page harness
│   ├── make-player-host.mjs
│   ├── sync-gate.mjs       proves text appears after its word
│   ├── geometry-gate.mjs   safe area, cap height, collision
│   └── sync-cases.json     optional extra cases
├── audio/
│   └── words.json          word-level timing; DURABLE, never deleted
├── assets/
│   └── reference.mp4       style reference video
├── public/                 everything the composition reads by staticFile()
│   ├── voiceover.wav       narration, 48 kHz mono — the timing source
│   ├── music.wav           optional, 48 kHz
│   ├── image-01.png        first supporting image
│   └── fonts/              only for a family that is not on Google Fonts
├── out/
│   ├── tiga-mitos-otak.mp4 deliverable; name equals folder name
│   ├── tiga-mitos-otak.srt subtitle track, optional
│   └── publish.txt         caption, description, hashtags
└── work/                   every intermediate file; safe to delete entirely
    ├── render-raw.mp4      the render before loudness normalisation
    ├── player-host.html    the page the gates drive
    ├── check/
    ├── ref/                contact sheet + motion strips
    └── voiceover-16k.wav   16 kHz mono, for speech recognition
```

`audio/words.json` sits outside `work/` deliberately: it is the only derived file a revision cannot faithfully recreate (a fresh ASR pass returns ~±0.1 s different timestamps and desyncs a re-render). Everything else in `work/` rebuilds in one command, so `rm -rf work` loses nothing that matters.

`src/index.ts` is the entry point and must call `registerRoot(Root)` — Remotion refuses to start without it.
**Naming rule:** file and directory names are English kebab-case; file contents and every message to the user are Indonesian. The project folder and the video carry the topic slug so they stay meaningful in a file manager.

`rm -rf work` then re-render restores the whole video.

---

## 🛠 Requirements

| Need | Why |
|---|---|
| `ffmpeg` + `ffprobe` | rendering, measuring, verification |
| `node` >= 22 + `npm` | runs the Remotion toolchain |
| `remotion` 4.0.545 + React 18 | the renderer (installed by `npm install`) |
| Remotion browser (243 MB) | `scripts/setup-shared-browser.sh`, once per machine; shared across projects |
| `whisper.cpp` **or** `faster-whisper` | word-level timing (optional, degrades to estimate) |
| `GEMINI_API_KEY` | optional TTS when you have no recording (Interactions endpoint) |
| `yt-dlp` | optional, downloading style references |

Verified on ffmpeg 7.1. Every ffmpeg behaviour cited in the docs was measured on a real render, not copied from documentation.

Frames are React components rendered by headless Chrome. Text is a DOM node, which is what lets the sync gate read it back with `getBoundingClientRect()`.

Measured on this machine: 60 s portrait at concurrency 8 takes **42 s**; 300 s landscape takes **177 s**. Concurrency is the lever — 1→127 s, 8→42 s on 1800 frames.

---

## 🧩 How the documents fit together

| File | Role |
|---|---|
| **`SKILL.md`** | the workflow — 7 stages, decision tables, ready-to-print user messages |
| **`references/GUIDE.md`** | creative direction — typography, animation, transitions, turning ideas into visuals |
| **`references/RENDER.md`** | engineering — environment, fonts, ffmpeg, and the QC gates |
| **`references/CRAFT.md`** | craft — curves per role, the carrier contract for handoffs, review flags |

The measured numbers live with the rule they protect; the creative freedoms live in `GUIDE.md`. Neither pretends to be the other.

---

## 🎨 Fonts

The catalogue in `references/RENDER.md` §1 lists 8 registers as a starting point, never a menu. A family that isn't there is downloaded, not substituted:

```bash
curl -sL -o /tmp/font.ttf \
  "https://github.com/google/fonts/raw/main/ofl/outfit/Outfit%5Bwght%5D.ttf"
```

Then verifies it before use — under 10 KB means an HTML error page, not a font.

---

## ⚠️ Honest limits

- Music is **synthesised** unless you supply your own — simple chords, not a composition
- Word timing is **approximate** when ASR is unavailable, and the delivery message says so
- The agent cannot watch the video; visual QC relies on extracted frames, contact sheets, and measured numbers
- Capped at **60 s portrait / 300 s landscape** — a five-minute explainer, not a documentary tool
- A 5-minute landscape render is 9000 frames; expect it to take longer than a short clip, and the script needs ~740 words at ~2.5 words/s
- Captions are **offered, not assumed**; burned-in captions are a separate style decision from kinetic typography
- Loudness of the finished mix is verified, but creative judgements (does the beat land, does the hook grip) stay yours

---

## 📄 License

[MIT](LICENSE) — use it, fork it, ship it.

<div align="center">

**BITS Creative** · built for agents that render, not just describe.

</div>