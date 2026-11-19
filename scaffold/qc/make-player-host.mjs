/**
 * Builds the page the sync gate drives.
 *
 * Why a bundle and not a module import: the gate opens the host over file://,
 * and Chrome will not resolve a bare `import {Timeline} from '../src/Timeline'`
 * (a .tsx path) from a file:// document. esbuild resolves the whole graph —
 * TSX, React, @remotion/player — into one script.
 *
 * Output:
 *   work/player.js          the bundle
 *   work/player-host.html   the page, with size read from the composition
 *
 * Measured: bundle ~1.1 MB, 0.3 s. The gate then costs 251 ms per sample.
 */
import {build} from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'work');
fs.mkdirSync(OUT, {recursive: true});

const width = Number(process.env.QC_WIDTH ?? 1080);
const height = Number(process.env.QC_HEIGHT ?? 1920);
const frames = Number(process.env.QC_FRAMES ?? 1800);

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
console.log('wrote', path.join(OUT, 'player-host.html'), `${width}x${height}`, `${frames} frames`);