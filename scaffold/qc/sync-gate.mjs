/**
 * The sync gate (RENDER.md §7).
 *
 * Proves, for each case in qc/sync-cases.json, that a text is on screen at its
 * word time and is not on screen before it. The asymmetry is deliberate:
 * 0.1 s late is invisible, appearing early is a visible defect.
 *
 * Measured on this machine: 251 ms per sample including seek + DOM query.
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
const CHROME =
  process.env.REMOTION_CHROME ??
  path.join(ROOT, 'node_modules', '.remotion', 'chrome-headless-shell', 'linux64',
    'chrome-headless-shell-linux64', 'chrome-headless-shell');

const words = JSON.parse(fs.readFileSync(path.join(ROOT, 'audio', 'words.json'), 'utf8'));
const VO_DELAY = words.vo_delay;
const checks = JSON.parse(fs.readFileSync(path.join(ROOT, 'qc', 'sync-cases.json'), 'utf8'));

const host = path.join(ROOT, 'work', 'player-host.html');
if (!fs.existsSync(host)) {
  console.error(`missing ${host} — run: node qc/make-player-host.mjs`);
  process.exit(1);
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  args: ['--no-sandbox', '--disable-gpu', '--allow-file-access-from-files'],
  headless: true,
});
const page = await browser.newPage();
await page.setViewport({width: 1080, height: 1920});
await page.goto(`file://${host}`, {waitUntil: 'networkidle0'});
await page.waitForFunction('window.__ready === true', {timeout: 30000});

/** Every text actually VISIBLE at a video second, after the Player has settled. */
const textsAt = (videoSeconds) =>
  page.evaluate(async (s) => {
    await window.__seekTo(s);
    const out = [];
    document.querySelectorAll('[data-qc]').forEach((el) => {
      const text = (el.textContent ?? '').trim();
      if (!text) return;
      // An element with opacity 0 still has textContent. Visibility is the
      // rendered state, and that is what the viewer sees — same rule as the
      // alpha filter in the PIL gate.
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

for (const {text, t_vo} of checks) {
  const t = VO_DELAY + t_vo;
  const late = await textsAt(t + 0.1);
  const early = await textsAt(t - 0.15);
  if (!late.includes(text)) findings.push(`missing or late: "${text}" @ ${t.toFixed(2)}s`);
  if (early.includes(text)) findings.push(`appears too early: "${text}" @ ${t.toFixed(2)}s`);
}

const perSample = (Date.now() - started) / (checks.length * 2);
await browser.close();

console.log(`${checks.length} texts, ${perSample.toFixed(0)} ms/sample`);
if (findings.length) {
  console.log(findings.join('\n'));
  process.exitCode = 1;
} else {
  console.log('sync gate OK');
}