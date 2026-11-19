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
/**
 * The headless browser, resolved the same way `remotion.config.ts` resolves it.
 *
 * The gates launch their own browser, so they cannot read the Remotion config.
 * Measured failure: after the shared-browser setup, both gates died with
 * `Browser was not found at the configured executablePath
 * node_modules/.remotion/...` because they still looked only in the project.
 *
 * Order: BITS_BROWSER, the shared cache, the project copy.
 */
function resolveChrome(ROOT) {
  if (process.env.BITS_BROWSER) return process.env.BITS_BROWSER;

  const home = process.env.HOME ?? process.env.USERPROFILE ?? '';
  const shared = [
    '.cache/remotion/chrome-headless-shell/linux64/chrome-headless-shell-linux64/chrome-headless-shell',
    '.cache/remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell',
    '.cache/remotion/chrome-headless-shell/mac-x64/chrome-headless-shell-mac-x64/chrome-headless-shell',
  ]
    .map((rel) => path.join(home, rel))
    .find((p) => fs.existsSync(p));
  if (shared) return shared;

  const local = path.join(
    ROOT, 'node_modules', '.remotion', 'chrome-headless-shell', 'linux64',
    'chrome-headless-shell-linux64', 'chrome-headless-shell',
  );
  if (fs.existsSync(local)) return local;

  console.error(
    'browser not found. Run once per machine: bash scripts/setup-shared-browser.sh',
  );
  process.exit(1);
}

const CHROME = resolveChrome(ROOT);

/**
 * Cap-height ratios come from `src/type-presets.ts`, not a copy here.
 *
 * A second table drifts: the first version of this file listed eight families
 * while the presets named sixteen, so twelve faces silently fell back to 0.72
 * and the gate measured the wrong cap height for them. Bundled from the same
 * file the composition reads, so adding a preset cannot desync the gate.
 */
async function capRatios() {
  const {buildSync} = await import('esbuild');
  const tmp = path.join(ROOT, 'work', 'cap-ratio-probe.mjs');
  buildSync({
    entryPoints: [path.join(ROOT, 'src', 'type-presets.ts')],
    bundle: true,
    outfile: tmp,
    format: 'esm',
    platform: 'node',
    logLevel: 'error',
  });
  try {
    const mod = await import(`${tmp}?t=${Date.now()}`);
    // Every preset's ratios, merged: a family's cap ratio is a property of the
    // face, not of the preset that happens to use it, and the gate must still
    // run while TYPE_PRESET is unset (that is the type gate's complaint, not
    // this one's).
    return Object.assign({}, ...Object.values(mod.PRESETS).map((p) => p.capRatio));
  } finally {
    fs.unlinkSync(tmp);
  }
}
const CAP_RATIO = {...(await capRatios()), 'DejaVu Sans': 0.73, Inter: 0.72};

const SAMPLES = Number(process.env.QC_SAMPLES ?? 9);

/**
 * Platform floors, as fractions of the frame.
 *
 * `edge` holds for both orientations — one number, so there is never a second
 * truth about it. `bottom` and `right` are the *portrait* Reels/TikTok floors:
 * they describe a 1080x1920 phone UI, and applying them to a 1920x1080 frame
 * flags correctly placed landscape text. A landscape film gets the edge rule
 * and the cap-height tier, nothing else.
 */
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

/** Orientation, from the frame the Player was built for. */
const PORTRAIT = H > W;

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
    if (PORTRAIT && (b.y + b.h > H * (1 - SAFE.bottom) || b.x + b.w > W * (1 - SAFE.right))) {
      findings.push(`t=${t.toFixed(1)}s platform-band: "${b.text}" crosses the ${Math.round(SAFE.bottom * 100)}% bottom / ${Math.round(SAFE.right * 100)}% right floor`);
    }
    // 3) cap height
    const ratio = CAP_RATIO[b.family] ?? 0.72;
    const capPx = b.fontSize * ratio;
    // meta and the handwritten accent are supporting tier; display is primary
    const need = b.role === 'display' ? 0.04 : 0.025;
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
  console.log(
    `geometry gate OK: ${SAMPLES} samples, edge ${SAFE.edge}, ` +
      (PORTRAIT
        ? `portrait band ${SAFE.bottom}/${SAFE.right}`
        : 'no portrait band (landscape)'),
  );
}