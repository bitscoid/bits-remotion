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
| `src/Timeline.tsx` | places each beat with `<Sequence from durationInFrames>` |
| `src/Scene.tsx` | one beat; text carries `data-qc` so the gate can read it |
| `src/cue.ts` | `CUE` and `DURATION_SECONDS`, derived from `audio/words.json` |
| `src/style-brief.ts` | `STYLE` — the ten-line brief |
| `qc/make-player-host.mjs` | bundles the Player host into `work/` |
| `qc/player-entry.tsx` | exposes `window.__ready` and `window.__seekTo(s)` |
| `qc/sync-gate.mjs` | proves each text appears at its word and not before |
| `qc/geometry-gate.mjs` | safe area, platform band, cap height, collision |
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

A sample list for a different script was shipped first and made every new project
fail its first gate run with three false "missing or late" findings.

Two measured traps this scaffold already avoids:

1. `<Series.Sequence>` stacks children back to back and ignores a start time.
   A 1 s lead-in has to be its own `<Sequence>`; otherwise every beat fires one
   second early. `Timeline.tsx` uses `<Sequence from=...>` instead.
2. `useCurrentFrame()` inside a `<Sequence>` is already sequence-local.
   Subtracting `beat.start` a second time makes the reveal never fire.

Both were caught by the sync gate, not by reading the docs.
