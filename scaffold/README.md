# Scaffold

Copied into a new project folder by the build step, then edited in place.

```bash
cp -r <skill>/scaffold/. ./tiga-mitos-otak/
cd tiga-mitos-otak
npm install
npx remotion browser ensure      # once per machine, 102 MB
```

What each file is:

| File | Role |
|---|---|
| `package.json` | Remotion 4.0.545 + React 18, all `@remotion/*` version-locked |
| `tsconfig.json` | required — Remotion refuses to start without one |
| `src/index.ts` | `registerRoot(Root)`; this is the file the CLI receives |
| `src/Root.tsx` | one `<Composition>` per orientation; **the CLI arg is the `id`** |
| `src/Timeline.tsx` | places each beat with `<Sequence from durationInFrames>` |
| `src/Scene.tsx` | one beat; text carries `data-qc` so the gate can read it |
| `src/style-brief.ts` | `STYLE` (the ten-line brief) and `CUE` (the time table) |
| `qc/make-player-host.mjs` | bundles the Player host into `work/` |
| `qc/player-entry.tsx` | exposes `window.__ready` and `window.__seekTo(s)` |
| `qc/sync-gate.mjs` | proves each text appears at its word and not before |
| `qc/sync-cases.json` | `{text, t_vo}` pairs the gate checks |

Two measured traps this scaffold already avoids:

1. `<Series.Sequence>` stacks children back to back and ignores a start time.
   A 1 s lead-in has to be its own `<Sequence>`; otherwise every beat fires one
   second early. `Timeline.tsx` uses `<Sequence from=...>` instead.
2. `useCurrentFrame()` inside a `<Sequence>` is already sequence-local.
   Subtracting `beat.start` a second time makes the reveal never fire.

Both were caught by the sync gate, not by reading the docs.
