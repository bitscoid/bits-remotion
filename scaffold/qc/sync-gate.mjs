/**
 * The sync gate (RENDER.md §7).
 *
 * Proves, for each keyword the film draws, that it is on screen at its word
 * time and is not on screen before it. The asymmetry is deliberate: 0.1 s late
 * is invisible, appearing early is a visible defect.
 *
 * The cases come from the same `cue.ts` the composition uses, so the gate can
 * never check times the video does not actually use. Measured failure of a
 * hand-written list: it kept 1.55 s after the CUE moved to 1.65 s and reported
 * three false misses.
 *
 * Measured on this machine: 122–251 ms per sample including seek + DOM query.
 * `remotion still` per sample costs 6.4 s warm, 19.4 s cold — too slow.
 *
 * Run `node qc/make-player-host.mjs` first; it writes work/player-host.html.
 *
 *   node qc/sync-gate.mjs
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

const wordsFile = JSON.parse(fs.readFileSync(path.join(ROOT, 'audio', 'words.json'), 'utf8'));
globalThis.__voDelay = wordsFile.vo_delay;

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

const browser = await puppeteer.launch({
  executablePath: CHROME,
  args: ['--no-sandbox', '--disable-gpu', '--allow-file-access-from-files'],
  headless: true,
});
const page = await browser.newPage();
await page.setViewport({width: W, height: H});
await page.goto(`file://${host}?${query}`, {waitUntil: 'networkidle0'});
await page.waitForFunction('window.__ready === true', {timeout: 30000});

/**
 * The cases to check.
 *
 * The composition's own keywords come from the bundled page (`window.__syncCases`,
 * fed by `src/cue.ts`), so the gate can never check a time the video does not use.
 *
 * `qc/sync-cases.json` may ADD extra cases — a stamp mid-sentence, a number that
 * appears on its own beat. It cannot remove or override the derived ones: a gate
 * you can quietly shrink is not a gate.
 */
const derived = await page.evaluate(() => window.__syncCases);
const extraPath = path.join(ROOT, 'qc', 'sync-cases.json');
const extra = fs.existsSync(extraPath)
  ? JSON.parse(fs.readFileSync(extraPath, 'utf8')).map((c) => ({
      text: c.text,
      // accept `wordAt` (video seconds) or `t_vo` (voiceover seconds)
      wordAt: c.wordAt ?? c.t_vo + (globalThis.__voDelay ?? 0),
    }))
  : [];

const checks = [...derived, ...extra];

/** Every text actually VISIBLE at a video second, after the Player has settled. */
const textsAt = (videoSeconds) =>
  page.evaluate(async (s) => {
    await window.__seekTo(s);
    const out = [];
    document.querySelectorAll('[data-qc]').forEach((el) => {
      const text = (el.textContent ?? '').trim();
      if (!text) return;
      // An element with opacity 0 still has textContent. Visibility is the
      // rendered state, and that is what the viewer sees.
      let opacity = 1;
      let node = el;
      while (node && node !== document.body) {
        opacity *= parseFloat(getComputedStyle(node).opacity || '1');
        node = node.parentElement;
      }
      const r = el.getBoundingClientRect();
      if (opacity > 0.05 && r.width > 0 && r.height > 0) out.push(text);
    });
    return [...new Set(out)];
  }, videoSeconds);

const findings = [];
const started = Date.now();

for (const {text, wordAt} of checks) {
  const late = await textsAt(wordAt + 0.1);
  const early = await textsAt(wordAt - 0.15);
  if (!late.includes(text)) findings.push(`missing or late: "${text}" @ ${wordAt.toFixed(2)}s`);
  if (early.includes(text)) findings.push(`appears too early: "${text}" @ ${wordAt.toFixed(2)}s`);
}

const perSample = (Date.now() - started) / (checks.length * 2);
await browser.close();

console.log(`${checks.length} keywords, ${perSample.toFixed(0)} ms/sample`);
if (findings.length) {
  console.log(findings.join('\n'));
  process.exitCode = 1;
} else {
  console.log('sync gate OK');
}