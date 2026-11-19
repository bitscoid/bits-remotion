/**
 * The type gate. Fails until a preset is chosen, and when the chosen preset
 * names a family the build cannot actually render.
 *
 *   node qc/type-gate.mjs
 *
 * Why this exists: the scaffold used to ship one pairing (Inter + JetBrains
 * Mono), and every film from it used that pairing regardless of topic. A list of
 * suggested families did not change behaviour. A required choice with a failing
 * gate does.
 *
 * Fails on:
 *   1. `TYPE_PRESET` in src/type-presets.ts is unset or is not a real key
 *   2. the chosen preset puts one family in more than one role
 *   3. the chosen preset names a family that `src/fonts.ts` has no LOADERS entry
 *      for, or that has no `capRatio`. Both render the fallback in silence —
 *      the module name is not the family name, so `Baloo2` and `Baloo Two` are
 *      different strings to CSS and only one of them is the face that loaded.
 *
 * Notes, never fails: repeating the previous run's preset in this folder. A
 * rerun is the normal case, and whether a *series* repeats itself is not
 * something one folder can see.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PRESETS_FILE = path.join(ROOT, 'src', 'type-presets.ts');
const FONTS_FILE = path.join(ROOT, 'src', 'fonts.ts');
const RECORD = path.join(ROOT, 'work', 'type-used.json');

const findings = [];
const notes = [];

for (const file of [PRESETS_FILE, FONTS_FILE]) {
  if (!fs.existsSync(file)) {
    console.error(`missing ${path.relative(ROOT, file)}`);
    process.exit(1);
  }
}

const src = fs.readFileSync(PRESETS_FILE, 'utf8');
const fonts = fs.readFileSync(FONTS_FILE, 'utf8');

// 1. the chosen key
const m = src.match(/export const TYPE_PRESET[^=]*=\s*(['"])([^'"]*)\1\s*;?/);
const chosen = m ? m[2] : '';
const keys = [...src.matchAll(/^  '?([a-z-]+)'?: \{/gm)].map((x) => x[1]);

if (!m) {
  findings.push('TYPE_PRESET has no value. Set it in src/type-presets.ts.');
} else if (!chosen) {
  findings.push(
    `TYPE_PRESET is empty. Pick the topic's register in stage 4, then set one of:\n    ${keys.join('\n    ')}`,
  );
} else if (!keys.includes(chosen)) {
  findings.push(
    `TYPE_PRESET "${chosen}" is not a preset, and is not "custom". Valid keys:\n    ` +
      keys.join('\n    ') +
      '\n    custom — declare BITS_TYPE_CUSTOM {display, meta, accent} and an @font-face per face',
  );
}

/** The `{...}` body of one preset, so a scan stops at the next key. */
function presetBody(key) {
  const at = Math.max(src.indexOf(`'${key}': {`), src.indexOf(`  ${key}: {`));
  if (at < 0) return '';
  const body = src.slice(at);
  return body.slice(0, body.indexOf('\n  },'));
}

// 2. the three roles must differ
if (keys.includes(chosen)) {
  const body = presetBody(chosen);
  const fams = [...body.matchAll(/(?:display|meta|accent):\s*'([^']+)'/g)].map((x) => x[1]);
  if (fams.length !== 3) {
    findings.push(`preset "${chosen}" does not name three families (found ${fams.length}).`);
  } else if (new Set(fams).size < 3) {
    findings.push(
      `preset "${chosen}" reuses a family across roles (${fams.join(', ')}). Three roles want three faces.`,
    );
  }
}

// 3. every family the presets name must load and be measurable
const loaderKeys = new Set([...fonts.matchAll(/^  '?([A-Za-z0-9 ]+)'?: load/gm)].map((x) => x[1]));
const capRatio = new Set([...src.matchAll(/(?:'([^']+)'|([A-Za-z0-9]+))\s*:\s*0\.\d+/g)].map((x) => x[1] ?? x[2]));

const missingLoader = [];
const missingRatio = [];
for (const key of keys) {
  for (const fam of [...presetBody(key).matchAll(/(?:display|meta|accent):\s*'([^']+)'/g)].map((x) => x[1])) {
    if (!loaderKeys.has(fam)) missingLoader.push(`"${fam}" (preset ${key})`);
    if (!capRatio.has(fam)) missingRatio.push(`"${fam}" (preset ${key})`);
  }
}
if (missingLoader.length) {
  findings.push(
    'src/fonts.ts has no LOADERS entry for:\n    ' +
      missingLoader.join('\n    ') +
      '\n  Key LOADERS by the family the module declares, not the module name.',
  );
}
if (missingRatio.length) {
  findings.push(
    'no capRatio for:\n    ' +
      missingRatio.join('\n    ') +
      '\n  The geometry gate needs it to measure cap height instead of guessing 0.72.',
  );
}

// notes: a rerun is not a finding
let previous = null;
if (fs.existsSync(RECORD)) {
  try {
    previous = JSON.parse(fs.readFileSync(RECORD, 'utf8')).preset ?? null;
  } catch {
    // a corrupt record is not a reason to fail a render
  }
}
if (previous && previous === chosen) {
  notes.push(
    `this folder already ran with "${chosen}". Reruns are fine; a new film in the\n` +
      `    same series should pick a different register.`,
  );
}

for (const n of notes) console.log(`note: ${n}`);

if (findings.length) {
  console.log(findings.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`type gate OK: ${chosen}`);
  fs.mkdirSync(path.dirname(RECORD), {recursive: true});
  fs.writeFileSync(RECORD, JSON.stringify({preset: chosen, at: new Date().toISOString()}, null, 1));
}