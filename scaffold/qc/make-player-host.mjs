/**
 * Builds the page the two gates drive.
 *
 * Why a bundle and not a module import: the gates open the host over file://,
 * and Chrome will not resolve a bare `import {Timeline} from '../src/Timeline'`
 * (a .tsx path) from a file:// document. esbuild resolves the whole graph.
 *
 * The frame count, width and height are read from `src/cue.ts` and `src/Root.tsx`
 * and then WRITTEN INTO the host's URL as a query string. Measured bug this
 * fixes: an earlier version printed the derived frame count but embedded only
 * width/height, so the Player fell back to 270 frames — the last second of every
 * longer film was never sampled by a gate.
 *
 *   node qc/make-player-host.mjs            # reads the composition
 *   node qc/make-player-host.mjs --frames=330   # override
 */
import {build, buildSync} from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'work');
fs.mkdirSync(OUT, {recursive: true});

const arg = (name) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? Number(hit.split('=')[1]) : undefined;
};

/**
 * durationInFrames, from the same cue.ts the composition uses.
 *
 * Importing the bundled module — not regexing its source — because
 * DURATION_SECONDS is an IIFE, not a literal. Measured: a regex on the bundle
 * found `var DURATION_SECONDS = (() => {` and threw.
 */
async function framesFromCue() {
  const tmp = path.join(OUT, 'cue-probe.mjs');
  buildSync({
    entryPoints: [path.join(ROOT, 'src', 'cue.ts')],
    bundle: true,
    outfile: tmp,
    format: 'esm',
    platform: 'node',
    logLevel: 'error',
  });
  try {
    const mod = await import(`${tmp}?t=${Date.now()}`);
    return Math.round(mod.DURATION_SECONDS * 30);
  } finally {
    fs.unlinkSync(tmp);
  }
}

/**
 * Orientation and size, from src/Root.tsx.
 *
 * Reads the <Composition> block whose id is the requested orientation, not the
 * first `width=`/`height=` in the file. Measured failure: the first pair always
 * belongs to `portrait`, so every landscape film was measured on a 1080x1920
 * page and the safe-area and collision boxes were checked against the wrong
 * frame.
 *
 *   node qc/make-player-host.mjs --orientation=landscape
 */
function compositionSize(orientation) {
  const src = fs.readFileSync(path.join(ROOT, 'src', 'Root.tsx'), 'utf8');
  const blocks = src.split(/<Composition/).slice(1);
  const block = blocks.find((b) => new RegExp(`id="${orientation}"`).test(b.slice(0, 120)));
  if (!block) {
    console.error(
      `no <Composition id="${orientation}"> in src/Root.tsx. Found: ` +
        (blocks.map((b) => (b.match(/id="([^"]+)"/) ?? [])[1]).filter(Boolean).join(', ') || 'none'),
    );
    process.exit(1);
  }
  const w = block.match(/width=\{(\d+)\}/);
  const h = block.match(/height=\{(\d+)\}/);
  return {width: w ? Number(w[1]) : 1080, height: h ? Number(h[1]) : 1920};
}

const orientation =
  (process.argv.find((a) => a.startsWith('--orientation=')) ?? '').split('=')[1] || 'portrait';
const frames = arg('frames') ?? (await framesFromCue());
const size = compositionSize(orientation);
const width = arg('width') ?? size.width;
const height = arg('height') ?? size.height;

await build({
  entryPoints: [path.join(ROOT, 'qc', 'player-entry.tsx')],
  bundle: true,
  outfile: path.join(OUT, 'player.js'),
  format: 'iife',
  jsx: 'automatic',
  loader: {'.tsx': 'tsx', '.ts': 'ts'},
  define: {'process.env.NODE_ENV': '"production"'},
  logLevel: 'error',
});

/* The numbers go into the URL, so the Player and the gates agree by construction. */
const query = `frames=${frames}&w=${width}&h=${height}`;

const host = `<!doctype html>
<html><head><meta charset="utf-8">
<style>
  html,body{margin:0;background:#000;width:${width}px;height:${height}px;overflow:hidden}
  #root{width:${width}px;height:${height}px}
</style>
</head>
<body><div id="root"></div>
<script src="./player.js"></script>
</body></html>`;

fs.writeFileSync(path.join(OUT, 'player-host.html'), host);
fs.writeFileSync(path.join(OUT, 'player-host.query'), query);
console.log(`wrote work/player-host.html  ${orientation} ${width}x${height}  frames=${frames}`);
console.log(`gates open it with ?${query}`);