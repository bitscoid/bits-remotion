/**
 * The type gate. Fails until a preset is chosen.
 *
 *   node qc/type-gate.mjs
 *
 * Why this exists: the scaffold used to ship one pairing (Inter + JetBrains
 * Mono), and every film from it used that pairing regardless of topic. A list of
 * suggested families did not change behaviour. A required choice with a failing
 * gate does.
 *
 * Three things are checked:
 *   1. `TYPE_PRESET` in src/type-presets.ts is set and is a real key
 *   2. the three roles are three DIFFERENT families — one family for all three
 *      is the template look this file exists to prevent
 *   3. the previous film in this folder did not use the same preset, when a
 *      record of it exists — so a series does not repeat itself
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PRESETS_FILE = path.join(ROOT, 'src', 'type-presets.ts');
const RECORD = path.join(ROOT, 'work', 'type-used.json');

const findings = [];

if (!fs.existsSync(PRESETS_FILE)) {
  console.error('missing src/type-presets.ts');
  process.exit(1);
}

const src = fs.readFileSync(PRESETS_FILE, 'utf8');

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
  findings.push(`TYPE_PRESET "${chosen}" is not a preset. Valid keys:\n    ${keys.join('\n    ')}`);
}

// 2. the three roles must differ
if (chosen && keys.includes(chosen)) {
  const block = src.slice(src.indexOf(`'${chosen}': {`) >= 0 ? src.indexOf(`'${chosen}': {`) : src.indexOf(`${chosen}: {`));
  const body = block.slice(0, block.indexOf('when:'));
  const fams = [...body.matchAll(/(?:display|meta|accent):\s*'([^']+)'/g)].map((x) => x[1]);
  if (fams.length === 3) {
    const uniq = new Set(fams);
    if (uniq.size === 1) {
      findings.push(`preset "${chosen}" uses one family for all three roles (${fams[0]}). That is the template look.`);
    } else if (uniq.size === 2) {
      findings.push(`preset "${chosen}" reuses a family across roles (${fams.join(', ')}). Three roles want three faces.`);
    }
  }
}

// 3. do not repeat the previous film's register
let previous = null;
if (fs.existsSync(RECORD)) {
  try {
    previous = JSON.parse(fs.readFileSync(RECORD, 'utf8')).preset ?? null;
  } catch {
    // a corrupt record is not a reason to fail a render
  }
}
if (previous && previous === chosen) {
  findings.push(
    `this folder already used "${chosen}". A series should not repeat its register:\n` +
      `    pick a different preset, or set BITS_REUSE_TYPE=1 if repeating is deliberate.`,
  );
}
if (process.env.BITS_REUSE_TYPE === '1') {
  const i = findings.findIndex((f) => f.includes('already used'));
  if (i >= 0) findings.splice(i, 1);
}

if (findings.length) {
  console.log(findings.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`type gate OK: ${chosen}`);
  // remember it for the next film in this folder
  fs.mkdirSync(path.dirname(RECORD), {recursive: true});
  fs.writeFileSync(RECORD, JSON.stringify({preset: chosen, at: new Date().toISOString()}, null, 1));
}