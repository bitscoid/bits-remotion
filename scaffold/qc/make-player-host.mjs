/**
 * Builds the two pages the sync gate and the geometry gate drive.
 *
 * Why a bundle and not a module import: the gates open the host over file://,
 * and Chrome will not resolve a bare `import {Timeline} from '../src/Timeline'`
 * (a .tsx path) from a file:// document. esbuild resolves the whole graph.
 *
 * Sizes come from the composition, read from env or passed on the command line:
 *
 *   node qc/make-player-host.mjs --frames=270 --width=1080 --height=1920
 *
 * Defaults match the scaffold's src/Root.tsx. If you change one, change both —
 * a host that disagrees with the composition seeks to frames that do not exist
 * and every sample reads as "text missing".
 */
import {build} from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'work');
fs.mkdirSync(OUT, {recursive: true});

const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (hit) return Number(hit.split('=')[1]);
  const env = process.env[`QC_${name.toUpperCase()}`];
  if (env) return Number(env);
  return fallback;
};

/**
 * Read the frame count from the composition itself.
 *
 * `src/Root.tsx` derives durationInFrames from cue.ts. Hardcoding a second copy
 * here means the host and the composition drift, and every sample past the real
 * end reads as "text missing". Measured: a host at 270 frames against a 330-frame
 * composition silently truncated the film at the last gate run.
 */
async function framesFromComposition() {
  const mod = await import('esbuild');
  const fsMod = await import('node:fs');
  const out = path.join(OUT, 'cue.mjs');
  mod.buildSync({
    entryPoints: [path.join(ROOT, 'src', 'cue.ts')],
    bundle: true,
    outfile: out,
    format: 'esm',
    platform: 'node',
    logLevel: 'error',
  });
  const {DURATION_SECONDS} = await import(`${out}?t=${Date.now()}`);
  fsMod.unlinkSync(out);
  return DURATION_SECONDS * 30;
}

const width = arg('width', 1080);
const height = arg('height', 1920);
const frames = arg('frames', null) ?? (await framesFromComposition());

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
console.log(`wrote work/player-host.html  ${width}x${height}  ${frames} frames`);
console.log('frames come from src/cue.ts — pass --frames= to override');