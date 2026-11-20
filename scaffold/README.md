# Scaffold

Copied into a new project folder by the build step, then edited in place.

```bash
cp -r <skill>/scaffold/. ./tiga-mitos-otak/
cd tiga-mitos-otak
npm install
bash scripts/setup-shared-browser.sh   # once per machine: one browser for every project
```

What each file is:

| File | Role |
|---|---|
| `package.json` | Remotion 4.0.545 + React 18, all `@remotion/*` version-locked |
| `tsconfig.json` | required — Remotion refuses to start without one |
| `remotion.config.ts` | points at the shared browser under `~/.cache/remotion/` |
| `scripts/setup-shared-browser.sh` | one-time: download the browser once, share it |
| `src/index.ts` | `registerRoot(Root)`; this is the file the CLI receives |
| `src/Root.tsx` | one `<Composition>` per orientation; **the CLI arg is the `id`** |
| `src/Timeline.tsx` | places each beat with `<Sequence from durationInFrames>`; picks the beat shape — `word`, `stack` or `figure` |
| `src/Scene.tsx` | the `word` beat (caption over a figure); text carries `data-qc` so the gate can read it |
| `src/SceneStack.tsx` | the `stack` beat — lines stacked, a rule draws itself |
| `src/SceneFigure.tsx` | the `figure` beat — no word at all, a code-built figure |
| `src/cue.ts` | `CUE` and `DURATION_SECONDS`, derived from `audio/words.json` |
| `src/fonts.ts` | one loader per family in `PRESETS`; only the chosen preset's three are called |
| `src/type-presets.ts` | the eight type registers; set `TYPE_PRESET` here |
| `src/style-brief.ts` | `STYLE` — the ten-line brief; reads its families from the preset |
| `qc/make-player-host.mjs` | bundles the Player host into `work/` |
| `qc/type-gate.mjs` | fails until a register is chosen, loadable and measurable |
| `qc/player-entry.tsx` | exposes `window.__ready` and `window.__seekTo(s)` |
| `qc/sync-gate.mjs` | proves each text appears at its word and not before |
| `qc/geometry-gate.mjs` | edge, portrait content box, action rail, read line, landscape title-safe, cap height, collision; cap ratios come from `src/type-presets.ts` |
| `qc/safe-band-check.mjs` | asserts the box and rail in the gate match their sources — runs in ms, no browser |
| `qc/sync-cases.json` | optional extra cases; the derived keywords always run |

`qc/sync-cases.json` ships as `[]` on purpose. The keywords the composition draws
come from `src/cue.ts` (which reads `audio/words.json`), and those always run —
this file cannot remove them. Add an entry only for text that is **not** a
sentence's last word: a stamp, a number on its own beat, a label that must land
on a specific spoken word.

```json
[{"text": "92 juta", "t_vo": 4.1}, {"text": "6 jam", "wordAt": 7.46}]
```

`t_vo` is seconds into the voiceover, `wordAt` is video seconds. Either works.

## The type register

Set `TYPE_PRESET` in `src/type-presets.ts` — it ships empty, and both the build and
`qc/type-gate.mjs` stop until it is set. Each preset names three families, their weights and
their cap ratios; `src/fonts.ts` loads exactly those three.

Family names are the names the fonts declare, not the modules that load them: the `Baloo2`
module registers `Baloo Two`. A mismatch falls back silently, so `src/fonts.ts` throws when its
`LOADERS` key disagrees with the family the loader reports, and the gate refuses a key no
preset uses. Adding a preset means an entry here, a loader there, and a `capRatio` — the
geometry gate has no ratio table of its own.

Pass `--orientation=landscape` to `qc/make-player-host.mjs` for a landscape film; it reads the
matching `<Composition>` instead of the first one in `Root.tsx`. The geometry gate reads the
frame size from the same query, so a landscape film skips the portrait platform band and is
measured on the frame it will actually render — 4% edge, 10% title-safe for readable text.

The portrait content box is 13% top, 20% bottom, 5% on both sides — `x 54..1026,
y 250..1536` on 1080×1920 (972×1286, 60% of the frame), horizontally centred, readable text
above y 1382. Below 55% of the height (`y > 1056`) the action rail pulls the right edge in to
88% (`x ≤ 950`); above that line the full width is free. `data-qc="deco"` opts paint out of the
box; the 4% edge still applies to it.

These are organic short-form numbers, not an ad spec (`GUIDE.md` §2). This scaffold never runs
`hyperframes check`, so the ad box those guides define is not consulted.

A sample list for a different script was shipped first and made every new project
fail its first gate run with three false "missing or late" findings.

Two measured traps this scaffold already avoids:

1. `<Series.Sequence>` stacks children back to back and ignores a start time.
   A 1 s lead-in has to be its own `<Sequence>`; otherwise every beat fires one
   second early. `Timeline.tsx` uses `<Sequence from=...>` instead.
2. `useCurrentFrame()` inside a `<Sequence>` is already sequence-local.
   Subtracting `beat.start` a second time makes the reveal never fire.

Both were caught by the sync gate, not by reading the docs.
