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

Longer only when you ask. Orientation is chosen in stage 1, before the script is written, because it sets the cap; a supplied reference must match that orientation and never changes it. Without a preference it asks, and falls back to **1920×1080** landscape or **1080×1920** portrait.

---

## 🚀 Quick start

```bash
# 1. install into your agent's skill directory
git clone https://github.com/bitscoid/bits-remotion.git \
  ~/.config/opencode/skills/bits-remotion

# 2. check the toolchain (node >= 22, ffmpeg, Remotion browser)
node -v
ffmpeg -version | head -1
npx remotion --version
npx remotion browser ensure

# 3. ask for a video
"buatkan motion graphic tentang kenapa kopi bikin ngantuk"
```

That's the whole interface. No config file, no CLI flags, no build step. The full environment probe — ASR, fonts, network, API key — is `references/RENDER.md` §1.

---

## 🧠 Design philosophy

This skill is **rules, not a template.**

| Layer | Divided how |
|---|---|
| 🎯 **Accuracy** | Measurable and reported with numbers — timing follows the spoken word, text stays in the safe area, cap height meets threshold, contrast meets WCAG, no dead air inside the narration, mix loudness in band, frame count is exact. Two are hard requirements: frame contiguity before encoding, and the finished loudness/tail floor |
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
- **Cap height**, not font size: **4%** of the short side for primary text, **2.5%** for supporting text (1080p landscape → 43 px / 27 px). Measured once per face (`font.getbbox("H")`), never from a string's bbox
- Centring is measured from the glyph box, never delegated blindly to `anchor="mm"`
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

- Voiceover normalised to −16 LUFS, true peak −1.5 dB, in its own file
- Music **looped to the video length** (`-stream_loop -1`), ducked under speech, faded to a floor — never to absolute zero
- Audio gate is **windowed**: no dead air inside the speech region, and with music the tail must still carry sound
- Finished mix measured: **I ∈ [−17, −14] LUFS**, true peak ≤ −1 dBTP

Measured traps that produced these rules: `loudnorm` inline with `apad` drops the tail to **−91 dB**; `afade=t=out` ending on the last frame leaves the final 0.8 s at **−61.7 dB**; a 10 s music bed on a 28 s video without looping leaves **18 s of silence**.

</details>

<details open>
<summary><b>🎞 Motion</b></summary>

Every second of video keeps at least one element moving. Verified with `freezedetect=n=0` — never the default `n=0.001` (about −60 dB), which false-positives on flat graphics. The 1 s lead-in before speech is exempt.

Frame contiguity is asserted before encoding: a missing PNG mid-sequence silently truncates the MP4 (`%05d` input stops at the gap).

The lower bound is the encoder, not taste: motion under ~10 px can be quantised away at CRF 18+, leaving identical frames.

</details>

<details>
<summary><b>🔁 Repetition gate (flags, never judges)</b></summary>

Scenes with the same structural signature get flagged so you can decide: *deliberate motif* or *coincidence to fix*. The gate forces that decision to be written down; it never homogenises the output.

Signatures compare ink against each frame's own modal luma, so a dark theme with light text works — a fixed luma threshold measures the background instead and returns an identical centroid for every scene.

</details>

---

## 📁 Project output

Each video becomes a self-contained folder:

```
tiga-mitos-otak/
├── script.txt              voiceover script, clean text, no labels
├── src/
│   ├── index.ts            registerRoot(Root) — the entry point
│   ├── Root.tsx            one <Composition> per orientation
│   ├── Timeline.tsx        <Series> of beats, reads CUE
│   ├── Scene.tsx           one beat, pure f(frame)
│   └── style-brief.ts      STYLE + CUE
├── audio/
│   ├── voiceover.wav       timing source, 48 kHz mono
│   ├── music.wav           optional, 48 kHz
│   └── words.json          word-level timing; DURABLE, never deleted
├── assets/                 optional; created only when the user supplies assets
│   ├── image-01.png        first supporting image
│   ├── image-02.png        second supporting image
│   └── reference.mp4       style reference video
├── output/
│   ├── tiga-mitos-otak.mp4 deliverable; name equals folder name
│   ├── tiga-mitos-otak.srt subtitle track, optional
│   └── publish.txt         caption, description, hashtags for upload
└── work/                   every intermediate file; safe to delete entirely
    ├── frames/
    ├── check/
    ├── voiceover-16k.wav   16 kHz mono, for speech recognition
    ├── voiceover-norm.wav  loudness-normalised voiceover
    └── music-norm.wav      looped + ducked-ready music
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
| Remotion browser (102 MB) | `npx remotion browser ensure`, once |
| `faster-whisper` | word-level timing (optional, degrades to estimate) |
| `GEMINI_API_KEY` | optional TTS when you have no recording (Interactions endpoint) |
| `yt-dlp` | optional, downloading style references |

Verified on ffmpeg 7.1. Every ffmpeg behaviour cited in the docs was measured on a real render, not copied from documentation.

Frames are React components rendered by headless Chrome. Text is a DOM node, which is what lets the sync gate read it back with `getBoundingClientRect()`.

Disk and time scale with the cap: a 300 s landscape video is **9000 PNG frames** before encoding. Render with the resume worker and expect the encode to take minutes, not seconds.

---

## 🧩 How the documents fit together

| File | Role |
|---|---|
| **`SKILL.md`** | the workflow — 7 stages, decision tables, ready-to-print user messages |
| **`references/GUIDE.md`** | creative direction — typography, animation, transitions, turning ideas into visuals |
| **`references/RENDER.md`** | engineering — environment, fonts, ffmpeg, and the QC gates |

The measured numbers live with the rule they protect; the creative freedoms live in `GUIDE.md`. Neither pretends to be the other.

---

## 🎨 Fonts

The catalogue ships **38 families across 9 registers** as a starting point, never a menu. If the topic needs typography that isn't there, the skill downloads it:

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