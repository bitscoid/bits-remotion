/**
 * The geometry gate (RENDER.md §7).
 *
 * Reads every element carrying `data-qc` at a set of sample frames and checks
 * safe area, platform band, cap height and collision.
 *
 * Exits 1 on a finding, so a CI step can gate on it — but a finding is advice:
 * a deliberate choice is a reason to fix the scene or to keep it and say why.
 * Pass `--report` to always exit 0 and only print.
 *
 *   node qc/geometry-gate.mjs
 *
 * Requires `node qc/make-player-host.mjs` first.
 *
 * Cap height: CSS fontSize is not cap height. On DejaVu Sans Bold capitals are
 * 0.73x the size; on Inter they are about 0.72x. The ratio below is measured per
 * face with measureText at build time — do not copy it between faces.
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CHROME =
  process.env.REMOTION_CHROME ??
  path.join(ROOT, 'node_modules', '.remotion', 'chrome-headless-shell', 'linux64',
    'chrome-headless-shell-linux64', 'chrome-headless-shell');

/** Cap-height ratio per family, measured once. Replace with your own measurement. */
const CAP_RATIO = {'DejaVu Sans': 0.73, Inter: 0.72, 'JetBrains Mono': 0.73};

const SAMPLES = Number(process.env.QC_SAMPLES ?? 9);

/** Portrait platform floors, as fractions of the frame. */
const SAFE = {edge: 0.04, bottom: 0.10, right: 0.12, readBottom: 0.15};

const host = path.join(ROOT, 'work', 'player-host.html');
const queryFile = path.join(ROOT, 'work', 'player-host.query');
if (!fs.existsSync(host) || !fs.existsSync(queryFile)) {
  console.error('missing work/player-host.html — run: node qc/make-player-host.mjs');
  process.exit(1);
}
/** frames/w/h, written by make-player-host.mjs from cue.ts and Root.tsx. */
const query = fs.readFileSync(queryFile, 'utf8').trim();
const qs = new URLSearchParams(query);
const W = Number(qs.get('w'));
const H = Number(qs.get('h'));

/** Length of the film, in seconds, from the same query the Player uses. */
const total = Number(qs.get('frames')) / 30;

const browser = await puppeteer.launch({
  executablePath: CHROME,
  args: ['--no-sandbox', '--disable-gpu', '--allow-file-access-from-files'],
  headless: true,
});
const page = await browser.newPage();
await page.setViewport({width: W, height: H});
await page.goto(`file://${host}?${query}`, {waitUntil: 'networkidle0'});
await page.waitForFunction('window.__ready === true', {timeout: 30000});

const findings = [];
const short = Math.min(W, H);

for (let i = 1; i <= SAMPLES; i++) {
  const t = (i / (SAMPLES + 1)) * total;
  const boxes = await page.evaluate(async (seconds) => {
    await window.__seekTo(seconds);
    const out = [];
    document.querySelectorAll('[data-qc]').forEach((el) => {
      let opacity = 1;
      let node = el;
      while (node && node !== document.body) {
        opacity *= parseFloat(getComputedStyle(node).opacity || '1');
        node = node.parentElement;
      }
      if (opacity <= 0.05) return;
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      const cs = getComputedStyle(el);
      out.push({
        role: el.dataset.qc,
        text: (el.textContent ?? '').trim().slice(0, 40),
        x: r.x, y: r.y, w: r.width, h: r.height,
        fontSize: parseFloat(cs.fontSize),
        family: cs.fontFamily.split(',')[0].replace(/["']/g, '').trim(),
      });
    });
    return out;
  }, t);

  for (const b of boxes) {
    // 1) safe area
    if (b.x < W * SAFE.edge || b.x + b.w > W * (1 - SAFE.edge) ||
        b.y < H * SAFE.edge || b.y + b.h > H * (1 - SAFE.edge)) {
      findings.push(`t=${t.toFixed(1)}s safe-area: "${b.text}" box ${Math.round(b.x)},${Math.round(b.y)} ${Math.round(b.w)}x${Math.round(b.h)}`);
    }
    // 2) portrait platform band
    if (b.y + b.h > H * (1 - SAFE.bottom) || b.x + b.w > W * (1 - SAFE.right)) {
      findings.push(`t=${t.toFixed(1)}s platform-band: "${b.text}" crosses the ${Math.round(SAFE.bottom * 100)}% bottom / ${Math.round(SAFE.right * 100)}% right floor`);
    }
    // 3) cap height
    const ratio = CAP_RATIO[b.family] ?? 0.72;
    const capPx = b.fontSize * ratio;
    const need = b.role === 'meta' ? 0.025 : 0.04;
    if (capPx < short * need) {
      findings.push(`t=${t.toFixed(1)}s cap-height: "${b.text}" ${capPx.toFixed(0)}px < ${(short * need).toFixed(0)}px (${need * 100}% of ${short})`);
    }
  }

  // 4) collision, excluding identical boxes
  for (let a = 0; a < boxes.length; a++) {
    for (let c = a + 1; c < boxes.length; c++) {
      const A = boxes[a], B = boxes[c];
      const ix = Math.max(0, Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x));
      const iy = Math.max(0, Math.min(A.y + A.h, B.y + B.h) - Math.max(A.y, B.y));
      if (ix * iy <= 0) continue;
      const smaller = Math.min(A.w * A.h, B.w * B.h);
      const cover = (ix * iy) / smaller;
      if (cover > 0.02) {
        findings.push(`t=${t.toFixed(1)}s collision: "${A.text}" / "${B.text}" cover ${(cover * 100).toFixed(0)}%`);
      }
    }
  }
}

await browser.close();

const unique = [...new Set(findings)];
if (unique.length) {
  console.log(unique.join('\n'));
  if (!process.argv.includes('--report')) process.exitCode = 1;
} else {
  console.log(`geometry gate OK: ${SAMPLES} samples, safe band ${SAFE.bottom}/${SAFE.right}`);
}