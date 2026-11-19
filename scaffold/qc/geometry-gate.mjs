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
 * truth about it. It applies to every element that carries meaning; backgrounds
 * and meaningless shapes may bleed.
 *
 * `portrait` is the one content box for organic short-form: top 13%, bottom
 * 20%, 5% on both sides — on 1080x1920 that is x 54..1026, y 250..1536
 * (972x1286, 60% of the frame, centre x 540 / y 893: horizontally the frame
 * centre, vertically 67 px high because the platforms stack their UI at the
 * bottom).
 *
 * `rail` is the second, narrower rule: the action buttons (like, comment,
 * share, audio) sit down the lower right, so below 55% of the height the right
 * edge pulls in to 88%. Above that line the full 5% margin applies.
 *
 * Organic short-form numbers; see GUIDE.md §2. Landscape gets `edge` alone plus
 * `readEdge` (Adobe title-safe) for text that must be read — no portrait box,
 * because no feed UI overlays a 16:9 player.
 */
const SAFE = {
  edge: 0.04,
  portrait: {top: 0.13, bottom: 0.20, left: 0.05, right: 0.05, readBottom: 0.28},
  /** Action rail: below `fromY`, the right edge pulls in to `1 - insetRight`. */
  rail: {fromY: 0.55, insetRight: 0.12},
  readEdge: 0.10, // landscape title-safe (Adobe 80% box)
};
/**
 * Roles that must be readable; everything else is decorative or supporting.
 * `caption` is in here because a burned-in caption outside the read line is a
 * defect: it is the accessibility layer, not decoration.
 */
const READABLE = new Set(['display', 'readable', 'caption']);
/**
 * Roles with no meaning: a background wash, a grain plate, a shape that may be
 * cropped. They keep the 4% edge but may bleed past the portrait band — the
 * band protects content, not paint.
 */
const DECO = new Set(['deco', 'background', 'bleed']);

/**
 * The box as pixels, rounded once. Percent floors land on fractions
 * (0.20 x 1920 = 384 exactly, but 0.13 x 1920 = 249.6), so a box drawn exactly
 * to the rounded edge would fail by a fraction of a pixel and the finding would
 * read as noise. Compare against the rounded box with a 0.5 px tolerance.
 */
const bandBox = (W, H) => {
  const P = SAFE.portrait;
  return {
    x0: Math.round(W * P.left),
    x1: Math.round(W * (1 - P.right)),
    y0: Math.round(H * P.top),
    y1: Math.round(H * (1 - P.bottom)),
    readY1: Math.round(H * (1 - P.readBottom)),
    railY: Math.round(H * SAFE.rail.fromY),
    railX1: Math.round(W * (1 - SAFE.rail.insetRight)),
  };
};
const EPS = 0.5;

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
    // 2) portrait content box, then the action rail on the lower right.
    //    Skipped for decorative paint, which keeps the 4% edge above.
    if (PORTRAIT && !DECO.has(b.role)) {
      const P = SAFE.portrait;
      const box = bandBox(W, H);
      const over = [];
      if (b.y < box.y0 - EPS) over.push(`top ${Math.round(P.top * 100)}% (y ${box.y0})`);
      if (b.y + b.h > box.y1 + EPS) over.push(`bottom ${Math.round(P.bottom * 100)}% (y ${box.y1})`);
      if (b.x < box.x0 - EPS) over.push(`left ${Math.round(P.left * 100)}% (x ${box.x0})`);
      if (b.x + b.w > box.x1 + EPS) over.push(`right ${Math.round(P.right * 100)}% (x ${box.x1})`);
      if (over.length) {
        findings.push(`t=${t.toFixed(1)}s safe-box: "${b.text}" crosses ${over.join(', ')} of the portrait box`);
      }
      // The action rail only exists below the line: above it the full width is free.
      if (b.y + b.h > box.railY && b.x + b.w > box.railX1 + EPS) {
        findings.push(`t=${t.toFixed(1)}s action-rail: "${b.text}" right edge ${Math.round(b.x + b.w)}px passes x ${box.railX1} below y ${box.railY} (like/comment/share sit there)`);
      }
      // read line: anything that must be read sits above 28% from the bottom.
      // `caption` is in READABLE, so a burned-in caption below this fails too.
      if (READABLE.has(b.role) && b.y + b.h > box.readY1 + EPS) {
        findings.push(`t=${t.toFixed(1)}s read-band: "${b.text}" bottom ${Math.round(b.y + b.h)}px is below the ${Math.round(P.readBottom * 100)}% read line (${box.readY1}px)`);
      }
    } else if (READABLE.has(b.role)) {
      // 2b) landscape: title-safe for readable text, no platform band
      if (b.y < H * SAFE.readEdge || b.y + b.h > H * (1 - SAFE.readEdge) ||
          b.x < W * SAFE.readEdge || b.x + b.w > W * (1 - SAFE.readEdge)) {
        findings.push(`t=${t.toFixed(1)}s title-safe: "${b.text}" is outside the ${Math.round(SAFE.readEdge * 100)}% title-safe box`);
      }
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
        ? `portrait box x ${bandBox(W, H).x0}..${bandBox(W, H).x1}, y ${bandBox(W, H).y0}..${bandBox(W, H).y1}, read line ${bandBox(W, H).readY1}, rail x ${bandBox(W, H).railX1} below y ${bandBox(W, H).railY}`
        : `no portrait band (landscape), title-safe ${SAFE.readEdge}`),
  );
}