---
name: bits-remotion
description: Creates finished motion-graphics explainer videos (MP4, H.264 + AAC, 30 fps) from a single topic, rendered with Remotion (React + headless Chrome). Duration follows the voiceover, capped by orientation — 60 seconds for portrait (Reels/TikTok/Shorts), 5 minutes for landscape (YouTube) — and longer only when the user asks. The agent decides orientation with the script, writes the voiceover script first, then offers and gathers assets (recorded voiceover, supporting images, style reference video, background music), synchronises everything, renders the MP4, and verifies the duration from the exported file. Trigger this skill whenever the user wants a motion graphic, an animated explainer, kinetic typography, or a short explainer video about any topic — including phrases like "make a motion graphic about ...", "short explainer video" — or hands over audio, images, or a reference video to be turned into a video, even if the skill is never named. All communication with the user is in Indonesian; every document in this skill is in English.
---

# BITS Motion Graphics — Remotion

Turn one topic into a finished motion-graphics video (MP4) — not a storyboard, not editing advice. You act as senior motion designer, creative director, video editor, and audio-sync engineer at once.

**Language split.** Documents in this skill are English. Everything the user reads — chat messages, script drafts, delivery summary — is Indonesian. File contents (script, comments) follow the naming rules in *Project layout*.

## Never split this workflow across agents

Execute every stage in one session: script, assets, sync, render, QC. Do not hand a stage to a subagent, task tool, or another agent — the timing table, the render function, and the QC numbers have to stay in the same context. On an orchestrated host, this workflow is the orchestrator's own work, not a delegated task.

**One exception: looking at an image.** Reading a picture is not a stage. Delegate only the call that turns an image into text, and only when the main model cannot see it — see *Vision routing* below.

## Vision routing

Asset analysis (stage 4), reference-frame reading (stage 4), and QC contact sheets (stage 7) all need the model to open an image. Route the call by what the model can actually do, not by what its metadata claims.

1. **Try it directly first.** The main session reads the image itself. Most runs stop here; no subagent, no extra hop.
2. **Recognise the failure.** The model cannot see, whatever the model list says. Treat any of these as *no vision*:
   - `content` comes back **empty** with no tool calls;
   - the reply says it cannot see the image;
   - the image arrives replaced by a placeholder such as `[image omitted: ...]`.

   Empty `content` **is** the signal. A provider that advertises `vision: true` can still strip the image and answer nothing — measured on this gateway, 15 of 72 flagged models did exactly that.
3. **Then delegate, once.** Hand the single image call to the `vision` subagent and use its text answer. Call it through whatever your host provides — opencode: `subagent` with `agent: "vision"`; Claude Code: `task(subagent_type: "vision")`. Prompt:

   ```
   Read <path>. Report: exact text, layout, colours, and what it depicts. One paragraph.
   ```

   The `vision` subagent already runs a failover chain over models proven to read images, so do not pick a model yourself, do not retry the main model, and do not build a second chain inside this skill.
4. **Never loop.** One direct attempt, one delegated attempt. If both fail, tell the user the image could not be read and ask for a text description — do not keep swapping models.
5. **What still stays in the main session:** writing the script, timing, scene code, rendering, and every QC number. The subagent returns a *description*; the decisions built on it are still yours. Never hand the whole stage to a subagent.

Use the same rule for a supplied recording's metadata, a PDF, or a screenshot the user pastes: attempt, detect, delegate once.

Batch when there are several images in one stage — a single `vision` call naming all paths beats one call per file.

## Fixed specifications

| Parameter | Value |
|---|---|
| Final duration | Voiceover duration + ~1 s lead-in + ~1.5 s tail, rounded **up** to whole seconds. No minimum |
| Orientation + cap (`MAX_DUR`) | **Portrait `1080×1920` → 60 s** (Reels / TikTok / Shorts) · **Landscape `1920×1080` → 300 s** (YouTube explainer). No reference and no answer in stage 1 → landscape. Locked unless the user explicitly asks for longer |
| Frame rate | 30 fps, constant |
| Frame count | duration × 30, exact. Example: 43 s = 1290 frames |
| Format | MP4, H.264 video (high profile), AAC audio, stereo |
| Loudness | finished mix I ∈ [−17, −14] LUFS, true peak ≤ −1 dBTP |

Audio decides length. The cap depends on orientation, because the two targets are different products: a portrait Reels/TikTok clip is a 60-second short, a landscape YouTube explainer can hold five minutes. If the voiceover overruns the cap for that orientation, stop and ask; never silently lengthen the video.

Orientation is settled when the script is written (stage 1), not when a reference appears (stage 2), because the cap sets the script length. An explicit user target replaces the table's number for that run, and it may be longer than 300 s only if the user named it.

**Precedence:** the user's explicit choice wins; otherwise the stage-1 decision stands. A reference never changes the cap — if its aspect does not match the chosen orientation, it fails the reference filter (`RENDER.md` §4) and the next candidate is tried.

Once stage 4 computes the total duration, that number is the exact render target. The file must be exactly that long: voiceover and visuals are already synced to that timeline, so a small drift truncates the ending or leaves it hanging.

## Rules vs taste

This document governs **accuracy**, not **appearance**. Accuracy can be proven with numbers; taste cannot.

A new rule belongs here only if it satisfies **both**:
1. it can be **proven** by measurement (numbers, file metadata, or a repeatable check), and
2. it does **not make a creative choice impossible**.

A rule that passes (1) but fails (2) is a restriction, not a standard. Rejected examples: "overshoot must be 1.16", "the hook must be 3 seconds", "scenes must be 2–6 seconds", "the palette must be cream".

- **Measured and reported:** text timing follows the spoken words; text inside a shape is centred by glyph box; no text collides or leaves the safe area; cap height meets the threshold; contrast meets the threshold; no dead audio inside the speech region; mix loudness inside the stated band; frame count is exact. Two of these are hard requirements (the exported frame count, finished loudness and tail floor); the rest inform your decision.
- **Free (your call):** palette, scene count, transition order, **font choice and typeface family**, mood, text placement, cut rhythm, animation duration, overshoot amount, whether an idea needs words at all.

Every number left in these documents **protects** something (legibility, safe area, contrast, encoder behaviour). If you find a number that dictates taste, treat it as a bug in this document: skip it and say so.

Never treat anything in `references/` as a template. What transfers is the measuring method, not the measured result. The font catalogue is a starting point, not a menu — if the topic needs typography that isn't installed, download it.

One exception that is commonly misread: on-screen text **does not** need a supporting word in the voiceover. Silent emphasis is legitimate — just record the reason in the timeline.

**QC gates flag, they do not judge.** When a check reports a finding, decide: a defect to fix, or an intentional choice to document. Passing every gate means "not broken", never "good".

## Project layout

Two naming layers:

- **File and directory names are English** — the standard shared by tools, shells, and filesystems.
- **File contents and every message to the user are Indonesian.**

Single exception: **the project folder and the video are the slug of the topic title**, so they keep the user's words (`tiga-mitos-otak`). That folder is what the user opens in a file manager; translating the title to `three-brain-myths` destroys its meaning.

Running in folder `projects` for the topic "Tiga Mitos Otak" produces:

```
projects/tiga-mitos-otak/
```

### Tree

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
│   ├── cue.ts              CUE, derived from audio/words.json
│   └── style-brief.ts      STYLE — the ten-line brief
├── qc/
│   ├── player-entry.tsx      the in-page harness
│   ├── make-player-host.mjs  bundles the harness into work/
│   ├── sync-gate.mjs         proves text appears after its word
│   ├── geometry-gate.mjs     safe area, cap height, collision
│   └── sync-cases.json       optional extra cases (keywords come from cue.ts)
├── audio/
│   └── words.json          word-level timing; DURABLE, never deleted
├── assets/                 optional; style reference and raw downloads
│   └── reference.mp4       style reference video
├── public/                 everything the composition reads by staticFile()
│   ├── voiceover.wav       narration, 48 kHz mono — the timing source
│   ├── music.wav           optional, 48 kHz
│   ├── image-01.png        first supporting image
│   └── fonts/              only for a family that is not on Google Fonts
├── out/
│   ├── tiga-mitos-otak.mp4 deliverable; name equals folder name
│   ├── tiga-mitos-otak.srt subtitle track, optional
│   └── publish.txt         caption + description + hashtags, copy-paste ready
└── work/                   every intermediate file; safe to delete entirely
    ├── player-host.html    the page the sync gate drives
    ├── check/
    ├── ref/                contact sheet + motion strips
    └── voiceover-16k.wav   16 kHz mono, for speech recognition
```

**`audio/words.json` is outside `work/` on purpose.** It is the only derived file a revision cannot cheaply recreate: re-running ASR after a cleanup returns timestamps that differ by ~±0.1 s from the ones the pictures were synced to, so a re-render would drift. Keeping it in `audio/` makes `rm -rf work` lose nothing that matters, and `src/` reads it from there. Everything else in `work/` is either an input (`audio/`, `assets/`) or rebuildable in one command.

`src/index.ts` is the entry point and calls `registerRoot(Root)`. Remotion refuses to start without it. Helper modules are fine as long as `src/index.ts` is the only thing you pass to the CLI.

Never create empty directories. No images means no `assets/`. No music means no `public/music.wav`.

### Naming rules

| Layer | Form | Example |
|---|---|---|
| Directories | one lowercase English word | `audio`, `assets`, `public`, `out`, `work`, `qc` |
| Data files | English kebab-case | `script.txt`, `voiceover.wav`, `words.json`, `publish.txt` |
| Build script | `PascalCase.tsx` components, one entry | `Root.tsx`, `Timeline.tsx`, `Scene.tsx` |
| Project folder | topic slug, kebab-case | `tiga-mitos-otak` |
| Deliverable | topic slug | `out/tiga-mitos-otak.mp4` |
| File contents | Indonesian | script, comments, reports |

One separator only: **the hyphen**. Spaces force shell quoting; underscores are reserved for the build modules that are not components.

1. **No version suffixes.** No `_final`, `_v2`, `_fix`, `_new`, no dates. A re-render overwrites the same name.
2. **Write the title as a title** in user-facing text (`Tiga Mitos Otak`), never as the slug. The slug is only for paths.
3. **Keep slugs near 40 characters**, cut on whole-word boundaries. Longer is painful in a file manager.
4. **Reduce the slug to `[a-z0-9-]`**: transliterate what you can, then strip every remaining character that is not a lowercase letter, digit, or hyphen — punctuation, quotes, ampersands, dollar signs, backticks, parentheses, commas, and dots. Turn spaces into hyphens. A slug has to survive an unquoted shell command: `&` and `$` break far more than a space does.
5. **Folder already exists → ask, unless it is this project's own folder.** A revision of the same topic continues in place and overwrites the same name; a different project with a colliding slug stops and asks. Never append `-2`; stacked copies leave the user unsure which is current.

### Incoming assets

Normalise what the user hands over; never leave their filenames in place:

| What arrives | Lands at |
|---|---|
| Voiceover recording, any format | `public/voiceover.wav`, normalised to 48 kHz mono |
| Background music, any format | `public/music.wav` |
| Style reference video, file or URL | `assets/reference.mp4` |
| Supporting images, in the order given | `public/image-01.png`, `image-02.png`, … |

Identify incoming files by **type and content**, never by filename. A file called `recording-01.m4a` and one called `voice-final.mp3` are the same thing: probe it with `ffprobe`, check it holds speech, and name it by role.

If two candidates could both be the voiceover, or a file's role stays unclear after probing, **ask once** — never guess and discard. Record the original filename and mention it in the delivery message so the user can trace which file was used.

### What this workflow does not create

`project.json`, `timing.json`, `scenes.py`, `manifest.json`, `style.json`, `review/`, or a separate QC report. Creative decisions (font, voice, palette) are agreed with the user and live in `src/style-brief.ts`; check results are reported directly in the delivery message. Three exceptions, because they are data and not reports: `audio/words.json` (word timings), the optional `out/<slug>.srt`, and `out/publish.txt` (platform upload copy).

Tool configuration the Remotion pipeline needs — `package.json`, `tsconfig.json`, `node_modules/` — is not a project document: create it when the environment requires it. The ban is on parallel sources of truth.

### Starting behaviour

- Work in a **subfolder named after the slug**, never in the working directory itself. Everything lives inside it, so two topics never collide.
- Decide the title in stage 1 alongside the script, and tell the user the slug before writing any file.
- `work/` can be created at any point, and `rm -rf work` costs only rebuildable seconds: user inputs stay in `audio/` and `assets/`, and the one non-reproducible derived file — `audio/words.json` — lives in `audio/` beside its source. Re-render restores the full video with identical timing.

## Workflow

Follow this order. Do not jump to render before stages 1–3 are done.

### Stage 1 — Write the voiceover script

The user gives a topic. Your first job is the narration script — unless the user brings their own script or recording, in which case use theirs and skip to stage 2.

Script guidance:
- **Know the orientation before writing.** The cap follows it (portrait 60 s, landscape 300 s), and the cap sets the script length — so orientation is decided first, not in stage 2. If the user already named a target, that settles it; otherwise ask it as part of the first message, together with the script. A reference video is checked against the decision, never used to change it. Never write 740 words for a portrait Reels clip.
- Length follows the topic, computed from the active cap: **~2.5 words per second** including ~2.5 s of lead-in and tail. Portrait 60 s → **~140 words**; landscape 300 s → **~740 words**. These are derived figures, not rules, and they are ceilings: a topic that lands in 90 s on a 5-minute target stays 90 s. Never pad sentences to fill time. Show the estimated voice and video duration.
- Structure: open with whatever grips hardest (a sentence, a question, a number), then the core points the length allows, then a closing line that lands. The hook is about effect, not seconds — the first 3 s is a rough guide, not a requirement. Keep sentences short so they split cleanly into on-screen text and read well through TTS.
- On a five-minute landscape target, 2–3 core points is not enough air; give each core point its own beat and keep one idea per scene. On a 60-second portrait target, cut to the single sharpest point and let it breathe.
- Clear, natural spoken language. Spell numbers, abbreviations, and foreign terms so TTS cannot mispronounce them.
- Never invent facts. If the topic needs data, search the web when available, otherwise use safe general claims.
- Length is decided here. Stage 4 may not cut or speed up the voiceover, so fix any overrun now.

Display format:

```
## Naskah Voiceover — [Topik]
Format: [tegak, maksimal 60 detik / mendatar, maksimal 5 menit]
Perkiraan: ± [N] kata ≈ [N] detik suara ≈ [N] detik video
Batas: [60 / 300 / angka yang Anda setujui] detik

**[Hook]** ...
**[Inti 1]** ...
**[Inti N]** ...
**[Penutup]** ...
```

`N` follows the target length: one sharp point for a 60-second portrait clip, three or more points (one beat each) for a five-minute landscape script. Two is not a default — the template shows a range on purpose.

The label line before the script is not optional: it tells the user, before any work, which cap the script is being written against. If the orientation is still unknown when the script is ready, say so on that line (`Format: belum ditentukan — saya pakai mendatar (maksimal 5 menit)`) and let them correct it.

The `[Hook]` / `[Inti N]` / `[Penutup]` labels exist only for display and scene-timing maps. When generating TTS (yourself, or by handing the script to the user), send the text **without** labels — labels get read aloud. See `references/RENDER.md` §3.

### Stage 2 — Offer and gather assets

In the same message as the script (or after approval), show the media list and ask which the user wants to provide. Ask **once**, in detail, never repeatedly.

The user does not name files — you normalise every name on arrival.

**Print this to the user, in Indonesian:**

```
Untuk membuat videonya, saya bisa memakai bahan dari Anda. Semuanya opsional
kecuali suara — suara yang menentukan panjang dan penyesuaian waktu video.

1. Rekaman suara (paling saya sarankan)
   Format apa pun: mp3, wav, m4a. Kalau belum ada, saya bisa membuatkannya
   dari naskah yang sudah Anda setujui.

2. Musik latar (opsional)
   Kalau tidak ada, saya membuat musik sederhana sendiri, atau video tanpa musik.

3. Video acuan gaya (opsional)
   Video yang tampilannya Anda suka, atau tautan Pinterest. Kalau tidak ada,
   saya carikan sendiri yang paling sesuai dengan topik. Kalau tidak ada yang
   cocok, saya tentukan gayanya sendiri dan beri tahu Anda pilihannya.

4. Gambar pendukung (opsional)
   Ilustrasi, foto, atau ikon yang ingin dimasukkan. Kalau tidak ada, saya
   cari gambar yang sesuai di internet, menggambarnya lewat kode, atau
   menggabungkan keduanya — mana yang paling jelas untuk tiap bagian.

5. Orientasi layar (menentukan panjang maksimal) — kalau belum Anda tentukan:
   Tegak (1080×1920, untuk Reels/TikTok/Shorts, maksimal 60 detik)
   atau mendatar (1920×1080, untuk YouTube, maksimal 5 menit)?
   Kalau tidak disebut, saya pakai mendatar.

6. Caption dan subtitle (opsional)
   Caption di dalam video, berkas .srt untuk diunggah ke platform,
   atau keduanya. Tanpa diminta, saya tidak membakarnya ke video.

Anda tidak perlu mengganti nama berkasnya. Kirim apa adanya, saya yang
merapikan. Kalau Anda tidak ingin menyiapkan apa pun, cukup bilang
"buat semuanya otomatis" — saya yang memilih acuan gaya, gambar, dan
tipografinya.
```

| Media | Lands at | Status | If the user has none |
|---|---|---|---|
| Voiceover recording | `public/voiceover.wav` | Strongly recommended; it is the timing source | See "Without a voiceover" below |
| Background music | `public/music.wav` | Optional | You generate simple music, or render silent |
| Style reference video | `assets/reference.mp4` | Optional | Search Pinterest for `motion graphics` + topic keywords (stage 3); if nothing fits, design the style yourself |
| Supporting images (1st, 2nd, …) | `public/image-01.png`, `public/image-02.png`, … | Optional | You find suitable images online, draw them in code, or both |
| Screen orientation | — | Asked with the script in stage 1; repeat here only if still open | Default landscape 1920×1080 → cap 300 s; portrait 1080×1920 → cap 60 s |
| Captions / subtitles | burned-in or `out/<slug>.srt` | Optional, asked once | No captions; offer the `.srt` in the delivery message |

The table above is for your own reference. What reaches the user is the Indonesian block. Typography is **not** asked about — that is your call in stage 4, and if the right font is not installed you download it.

### Stage 3 — Confirm readiness

- **Script approval.** If the topic was ambiguous, or the script makes a structural choice the user has not seen (angle, number of points, tone), show it and wait for one confirmation before generating voice. When the brief is clear, proceed — stage 2's ask already covered the rest.
- **Everything needed is present:** proceed without further questions. Treat user assets as the primary material. Tell the user in one line: `Semua bahan sudah lengkap. Saya mulai kerjakan.`
- **Something is missing and unanswered:** ask exactly once, then continue with the documented default. Stage 2's list is the only ask; stage 3 never re-opens it. An unanswered orientation means landscape; unanswered music means no music; unanswered reference means you pick one. Only a missing **voiceover** with no way to generate one blocks the pipeline — everything else has a stated default.
- **The user supplies a Pinterest URL as the reference:** do not ask again — that URL is the reference. Download it and continue.

  ```bash
  yt-dlp "<pinterest-url>" -o "assets/reference.mp4"
  ```

  Then probe it. If it fails (region block, removed pin, no video stream, under 5 s, or wrong aspect ratio), say so once and fall back to the search path below — never silently drop the style anchor.
- **The user declines to supply a reference, or asks for everything automatic:** searching Pinterest yourself is **mandatory before self-design** — never jump straight to designing your own style. Budget: **at least 5 pin candidates across 2 searches** is the floor; a measured run (2026-11) needed **8 candidates** before it succeeded, so treat 8 as the working target when the first candidates fail. Work in this order:

  1. **Search.** Use the Pinterest search URL directly or a web search, keywords = `motion graphics` + the topic's own words:
     - `https://id.pinterest.com/search/pins/?rs=typed&q=motion+graphics+<topik>` (or `pinterest.com pin <topic keywords> motion graphics video` through a web search)
     - try Indonesian AND English keywords; collect 5+ candidate pin URLs before downloading anything.
  2. **Download one at a time** until one passes the filter: `yt-dlp "<pin-url>" -o "assets/reference.mp4"`.
  3. **Filter with `ffprobe`** and discard: under 5 s, over 180 s (three minutes is enough to read a style; longer costs analysis time for no extra signal), wrong aspect ratio (a reference only needs to *match the orientation*, not the output resolution — a 720×1280 pin is a perfectly good style anchor for a 1080×1920 video; see `references/RENDER.md` §4), no video stream. Discarded → next candidate.
  4. **Measured failure modes (do not read them as "Pinterest is down"):**
     - many pins are images with a video thumbnail → yt-dlp exits `No video formats found!` → skip, next pin;
     - pins that embed Vimeo can fail with `Unable to extract info section` or an SSL `Hostname mismatch` for `vimeo.com` — some environments TLS-block Vimeo; try the direct `vimeo.com/<id>` URL once, then skip the whole domain;
     - a successful download may still be a 4 s loop → discarded by the 5 s filter.
     Budget: the 5-candidate / 2-search floor above is what makes a search "attempted"; when the first candidates fail, keep going to about 8 before declaring it exhausted. Report to the user how many were tried and why each failed — one line each is enough.
  5. If the budget is exhausted with no usable file, stop searching and design the style yourself: choose palette, typography, and motion language from the topic. State the choice in one line so the user can object — and state that the search was attempted and what it hit.

  Whatever you pick, tell the user which reference you used — URL plus a one-line reason — before analysing it. A self-chosen style is legitimate; an unannounced or unattempted search is not.
- **An important file will not open or is corrupt:** tell the user. Never pretend it was processed.

  ```
  Berkas [nama] tidak bisa saya buka. Kemungkinan rusak atau formatnya
  tidak didukung. Bisa kirim ulang, atau saya lanjut tanpa berkas itu?
  ```

**Visual material — three sources, pick per scene.**

1. **User images.** When supplied, build those visuals from them and adapt them to the voiceover. Never swap them for generic stock.
2. **Images you find and download.** When the script calls for something concrete (a place, an object, a document, a historical photo), search the web for a suitable image, download it, and verify it: correct subject, licence allows use, resolution at least the output resolution, no watermark. Save to `public/image-01.png` (next number), record the source URL in the delivery message, and never pass off a found image as the user's. Verifying "correct subject" means looking at it — see *Vision routing*.
3. **Code-drawn graphics.** Shapes, icons, vector illustration, typography, diagrams — always available and always yours.

Mixing them is normal and often best: a downloaded photograph with code-drawn annotations on top, a code-drawn diagram with one user image inside it. Choose per scene by what communicates fastest. Be honest about which is which: code-drawn graphics are not photographs, and a found image is not the user's own.

If a needed image cannot be found or licensed, draw it in code rather than shipping a wrong or low-resolution one.

**Without a voiceover.** Check `GEMINI_API_KEY` and generate voice through Gemini TTS, choosing a voice that fits the topic (`references/RENDER.md` §3). If the key is absent or fails, do not pretend:

```
Saya belum bisa membuat suara otomatis di lingkungan ini.

Pilihannya:
1. Anda rekam sendiri naskah di atas, lalu kirim berkasnya
2. Saya lanjutkan sebagai versi awal tanpa suara, waktu tiap kata masih
   perkiraan dan hasilnya belum tersinkron
```

### Stage 4 — Analyse assets and control duration

1. Inventory every file and understand each asset's role against the script. Measure user image dimensions with `ffprobe` before the composition references them: an image far smaller than the output resolution breaks when enlarged — tell the user, or design the composition so it still works (e.g. small element instead of full-bleed).

   ```
   Gambar [nama] berukuran [W]×[H], sedangkan video [W]×[H]. Kalau dipakai
   penuh layar, gambarnya akan pecah. Saya pakai sebagai elemen kecil saja,
   atau Anda kirim versi yang lebih besar?
   ```
2. Measure the real voiceover duration with `ffprobe`; never infer it from word count. Sanity-check it against the script estimate (~2.5 words/s); a large gap usually means truncated audio — resolve it before continuing.
3. Find the speech rhythm (pauses, sentence boundaries, stressed words). **Prefer automatic speech recognition with per-word timestamps** (`faster-whisper`, full recipe in `references/RENDER.md` §3) — real word times from the audio, not from word count. Words-per-second estimates are only for sanity-checking script length, and only when ASR cannot run at all; in that case tell the user:

   ```
   Pengenalan suara otomatis tidak tersedia di sini, jadi waktu tiap kata
   saya perkirakan dari jeda dan panjang kalimat. Sinkronisasinya bisa
   meleset sekitar sepersepuluh sampai setengah detik pada beberapa kata.
   ```

   Write the result to `audio/words.json` either way (`references/RENDER.md` §3) — not `work/`, because it is the one derived file a later revision cannot faithfully recreate. Every later stage reads it: the timeline, the sync gate, and the optional subtitle and publish files.
4. With a reference video, run the four-step read in `references/RENDER.md` §4 — contact sheet, motion strips, eight layers (palette, typography, composition, graphic language, motion, rhythm, sound, attention architecture), then the brief — plus the signature device and the reference's weakness. Measure cut rhythm instead of describing it from impression, and read motion from the strips, never from stills. The contact sheet and the strips are image calls — see *Vision routing*, batched into one delegated call if the main model cannot see them. The ten-line style brief from that read goes into `src/style-brief.ts` as typed constants before the first scene (stage 6); it is the build's contract from the first frame to the last. The reference is a floor, not a ceiling, so at least one decision must come from the topic. Never copy shots, text placement, or animation order.

   Report what you found and what you will take, in Indonesian:

   ```
   Acuan gaya yang saya pakai: [tautan]

   - Warna : latar [warna], aksen [warna], porsi [70/20/10]
   - Huruf : [display] + [meta], rasio judul:meta [6:1]
   - Grafik: [card r=16, garis 3 px, grain 4%, ikon grid 24]
   - Gerak : masuk [8–12] frame, [ease-out], teks [per kata]
   - Irama : [x] potongan, rata-rata [y] detik ([terpendek]–[terpanjang])
   - Suara : [whoosh di tiap transisi; musik berhenti di kalimat kunci]
   - Device: [nama device] — saya pakai dengan cara [beda]
   - Lantai: [satu keputusan dari topik, tidak ada di referensi]
   Yang tidak saya tiru: susunan adegan, penempatan teks, urutan animasinya.
   ```

   When no reference fits and you design the style yourself, say so instead:

   ```
   Tidak ada acuan yang benar-benar cocok untuk topik ini, jadi saya tentukan
   sendiri: latar [warna], aksen [warna], tipografi [jenis], gerak [sifat].
   Kalau Anda punya contoh tampilan yang lebih Anda suka, kirim saja.
   ```
5. **Pick a type preset from the topic, then set it — the build fails until you do.** `src/type-presets.ts` holds eight registers (`playful-rounded`, `playful-bold`, `poster-display`, `editorial`, `archival`, `kinetic-impact`, `technical`, `handwritten`), each a display + meta + accent family with the reason it suits a topic. Read the reference's type register, choose the preset that fits the topic, and set `TYPE_PRESET`. `node qc/type-gate.mjs` fails on an empty key, on one family carrying all three roles, and on repeating the previous film's preset in the same folder (`BITS_REUSE_TYPE=1` overrides a deliberate repeat). Do not keep a default: the default is what made every film look the same. If no preset fits, add one and its loaders in `src/fonts.ts`. Read the reference's type register first, then match a family to the topic's character. State the choice and reasoning in one sentence. If that font is not in the catalogue and not installed, search the internet for one that fits, download it, and verify it before writing scene code — recipe in `references/RENDER.md` §1. Never start building with a font that merely exists and then bend the design toward it; that order produces generic work.

   ```
   Tipografi: [nama keluarga huruf] untuk [peran], karena [alasan singkat
   yang menyangkut topik].
   ```

Final duration comes from the real audio:

> total duration = voiceover + ~1 s lead-in (speech starts around second 1) + ~1.5 s tail, rounded up to whole seconds
> frame count = total duration × 30

Examples: voiceover 37.3 s → 39.8 → 40 s (1200 frames). Voiceover 52.6 s → 55.1 → 56 s (1680 frames). Portrait 58.1 s → 60.6 → **over the 60 s cap**; landscape 212 s → 214.5 → 215 s (6450 frames).

- **Within the cap:** proceed. The computed number is the exact video duration. Fill lead-in and tail with meaningful visuals (title, accent, summary) — never blank, frozen, or black frames. Never stretch the audio. Report it in one line:

  ```
  Suara [X] detik. Video jadi [Y] detik ([Y×30] bingkai), 30 fps.
  ```
- **Over the cap** — `MAX_DUR` is **60 s for portrait** and **300 s for landscape**, meaning a voiceover longer than roughly `MAX_DUR - 2.5` s: stop before rendering. Never cut words, speed up speech, or compress pauses.

  ```
  Suaranya [X] detik, jadi videonya sekitar [Y] detik. Batas yang saya pakai
  [MAX] detik untuk video [tegak/mendatar], dan saya tidak memotong kata atau
  mempercepat suara.

  Pilihannya:
  1. Naskah dipersingkat, lalu suara dibuat ulang
  2. Anda setujui batas baru, misalnya [Y] detik
  ```
- **User states their own target duration:** use it if the voiceover fits (voice + lead-in + tail ≤ target). A target longer than the default is valid as long as the user named it.

### Stage 5 — Plan the timeline (internal)

Lay out 00:00 to the stage-4 total duration using the real audio. Scene count follows the narrative, never a fixed number. For each segment decide: start–end time, voiceover phrase, on-screen text, visual assets, animation and emphasis, transition into the next segment, and the relationship to the music.

Timing lives in **one absolute-time table** that every scene reads (`references/RENDER.md` §5); scene boundaries derive from ASR sentence boundaries. This is accuracy, not style — the creative content of each scene stays your call.

Vary the rhythm: an opening that grabs, a dynamic middle, a closing that satisfies. Give important explanations calmer, more readable motion. This timeline is planning only — move into production.

### Stage 6 — Build and render

Read both reference documents before building anything:
- `references/GUIDE.md` — creative direction, typography, asset animation, transitions, **translating ideas into visuals (§5), cross-scene variation (§6)**, audio mixing.
- `references/RENDER.md` — environment check, fonts, the Remotion pipeline, ffmpeg commands, verification.
- `references/CRAFT.md` — curve per role, the carrier contract for scene handoffs, and the review flags.

**Write QC checks yourself** when you need them. The rules are already complete in prose: safe area, two-tier cap height, WCAG contrast, text collision (coverage), and repetition patterns — all in `GUIDE.md` §2 and `RENDER.md` §7. The scaffold ships both gates (`qc/sync-gate.mjs`, `qc/geometry-gate.mjs`); extend them against your own `data-qc` roles.

Two checks are not optional because they protect the file itself, and both catch failures that look fine on screen:
- **frame count equals `DUR × 30`** in the exported file (`RENDER.md` §7) — a truncated render passes every visual check;
- **final mix loudness and tail floor** (`RENDER.md` §6, §7) — a quiet mix or a music track that ends early passes every visual gate.

```bash
cp -r <skill>/scaffold/. .                          # once per project
npm install
bash scripts/setup-shared-browser.sh                # once per machine, shares one browser
node qc/type-gate.mjs                              # fails until a preset is set
node qc/make-player-host.mjs                        # reads src/cue.ts
mkdir -p out work
npx remotion render src/index.ts portrait work/render-raw.mp4 --concurrency=8
ffmpeg -y -i work/render-raw.mp4 -af "loudnorm=I=-16:TP=-1.5:LRA=11" \
  -c:v copy -c:a aac -b:a 192k -ar 48000 out/tiga-mitos-otak.mp4
node qc/sync-gate.mjs && node qc/geometry-gate.mjs
```

The scaffold carries `src/`, `qc/`, `package.json` and `tsconfig.json`. Copy it before the first
render of every new project — Remotion refuses to start without `tsconfig.json`, and the gates
live in `qc/`.

The raw render goes to `work/` and only the normalised file carries the deliverable name.
Never ship `-final`, `-v2` or `_fixed`: a re-render overwrites the same path.

Before writing scene code, give every core point one visual mechanism that can be drawn (`GUIDE.md` §5). If the plan still reads "big word in the centre" for every scene, that is a warning sign worth revisiting before you build — not automatically wrong, but usually an idea that has not been found yet.

### Stage 7 — QC and delivery

Inspect the exported MP4 from start to finish, not just the timeline editor:

1. Style is inspired by the reference without copying it shot for shot — checked against the style brief in `src/style-brief.ts`: every line still holds, the signature device is present, and at least one decision came from the topic rather than the reference.
2. Text is legible, correctly spelled, and synced to the narration. Captions and footnotes sit inside the safe area and are never mistaken for words the narration says.
3. Assets appear at relevant moments, uncropped and undistorted.
4. Transitions are smooth, varied, and purposeful.
5. Music supports and speech stays dominant.
6. No black frames, **undocumented** frozen frames, glitches, or unintended audio defects.
7. The MP4 plays. Actual duration equals the stage-4 total (never over the active cap), frame count = duration × 30, 30 fps, codec and resolution per spec, nothing after the final second, and the cap in use is stated (60 s portrait, 300 s landscape, or the number the user approved). All of it proven from the exported file's metadata.
8. The measurements in `references/RENDER.md` §7 are run and reported: sync (no text appears before its word), geometry (safe area, cap height, collision, contrast), audio (no dead air inside the speech region; music present in the tail when music exists; mix I ∈ [−17, −14] LUFS, true peak ≤ −1 dBTP), and repetition pattern (flag only, your call). Two of them are hard requirements — the exported frame count, and the finished loudness and tail floor. The rest are advisory: report the numbers and the decision you made from them.
9. `out/publish.txt` exists and every block in it is copy-paste ready — see *Publish copy* below. It is part of the deliverable, not an extra.

Check the creative side with your eyes, not a script: open a contact sheet of the export sized from the actual duration — recipe and grid sizing in `references/RENDER.md` §7. If the main model cannot see it, hand the sheet to the `vision` subagent — one call, *Vision routing*. If every thumbnail looks like the same pattern with different words, composition variation is insufficient (`GUIDE.md` §6) — fix it before delivery.

### Publish copy — `out/publish.txt`

Every delivery writes this file. The user should never have to write a caption by hand after watching the video, so the file is copy-paste ready with **no markdown headings inside the copies**, no quotes around them, and no placeholder left in.

Rules:
- **Derived from the finished script, never invented.** Every claim in the copy must already be said or shown in the video. No new numbers, no new promises, no clickbait the video does not deliver.
- **One section per platform, in plain text**, separated by a blank line and a single `===` line so the user can see where each copy starts. Inside a section there is exactly one paragraph block: the caption.
- **Caption budget**: first line is the hook and must survive truncation (~90 characters for Reels/TikTok, ~100 for Shorts before "more"). Total caption 150–300 characters per platform short-form; longer only for a landscape explainer, where 300–600 is fine.
- **Hashtags**: 8–15 on TikTok and Reels, 3–5 on Shorts (YouTube ignores most of them and caps tags at 500 characters total). Build the mix from one broad tag, several topical tags that name the subject, and at most one niche tag — the platform count sets how many topical tags you add. No hashtag on a line of its own — append after the caption text, since a trailing hashtag wall reads like spam on Reels.
- **Language follows the video's narration language.** Indonesian narration → Indonesian captions and Indonesian hashtags (`#investasisaham`, not `#stockmarket`).
- **Never include**: emoji walls, "link in bio" when there is no link, invented statistics, or the word "viral".
- **Optional blocks** are allowed and must be labelled plainly: a `Judul / Title` line (the platform title field, ≤100 chars), and for YouTube a `Deskripsi` block with 2–3 short lines plus a disclaimer line when the topic is financial, medical, or legal advice. A finance video without "bukan saran investasi" is a defect, not a nicety.

Shape:

```
=== TikTok
<caption text> <hashtags on the same flowing block>

=== Instagram Reels
<caption text> <hashtags>

=== YouTube Shorts
Judul: <title, <=100 chars>
<caption text> <3-5 hashtags>
```

Finished videos for a landscape explainer add a `=== YouTube` section with `Judul`, `Deskripsi`, and the tag list. Never write a block for a platform the user did not ask about and that the video's orientation rules out.

Fix everything you find before handing over. Deliver the MP4 using whatever mechanism the environment offers, or simply state its path. Project files are optional extras; the MP4 and `publish.txt` are mandatory.

**Print the delivery message in Indonesian, following this shape:**

```
Videonya sudah selesai.

Berkas   : [lokasi berkas]
Durasi   : [Y] detik
Bingkai  : [Y×30] bingkai, 30 fps
Ukuran   : [W]×[H] ([tegak/mendatar])
Format   : MP4, H.264 (high), audio AAC stereo
Batas    : [60 detik (tegak) / 300 detik (mendatar) / angka yang Anda setujui]
Caption  : [lokasi publish.txt]

Pemeriksaan
- Tidak ada bingkai hitam maupun bingkai beku
- Semua teks muncul setelah kata yang diucapkan
- Tidak ada teks bertabrakan atau keluar batas aman
- Tidak ada bagian sunyi tak disengaja di dalam narasi
- Kenyaringan [I] LUFS, puncak [TP] dBTP, tidak pecah
- [Tidak ada frame yang hilang / jumlah frame sesuai]

Bahan yang Anda berikan
- Suara: [nama berkas asli]
- Musik: [nama berkas asli / saya buat sendiri]
- Acuan gaya: [tautan atau nama berkas]
- Gambar: [jumlah] berkas
- Sumber gambar: [URL + lisensi per gambar / tidak ada]

Yang saya buat otomatis
- [naskah / suara / musik / elemen grafis — sebutkan yang benar-benar otomatis]

Catatan
- [musik sintetis, bukan komposisi profesional]
- [waktu per kata hanya perkiraan, karena pengenalan suara tidak tersedia]
- [berkas antara sudah dihapus]

Kalau ada yang ingin diubah, sebutkan bagiannya dan saya buat ulang.
```

Omit any line that does not apply. Never leave a section empty just to fill the shape — a shorter honest message beats a padded one. Every number in it must come from measuring the exported file, never from memory or estimate.

## Honesty about the result

- Never claim the video is finished unless the MP4 actually exists and was inspected.
- Never claim a verified duration unless it was measured from the exported file.
- If the environment cannot guarantee duration or cannot render at all, state the limitation plainly, then hand over what genuinely exists (script, timeline, source code) clearly labelled.
- Never change the user's script, add facts, or twist meaning.