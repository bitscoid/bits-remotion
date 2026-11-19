import {Config} from '@remotion/cli/config';
import path from 'node:path';
import fs from 'node:fs';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);

/**
 * One headless browser per machine, not one per project.
 *
 * Without this, `npm install` in every new project downloads ~145 MB into
 * `node_modules/.remotion`, and deleting the project throws it away.
 *
 * Setup, once per machine:
 *
 *   bash scripts/setup-shared-browser.sh
 *
 * The binary path includes a platform directory, so it is checked rather than
 * assumed. Measured: passing a path that does not exist aborts the render with
 * `"browserExecutable" was specified ... but the path doesn't exist`. On a cold
 * machine the right answer is to fall back to the browser `browser ensure`
 * already installed, not to fail.
 *
 * `BITS_SHARED_BROWSER=0` forces the per-project browser.
 */
const HOME = process.env.HOME ?? process.env.USERPROFILE ?? '';

const CANDIDATES = [
  '.cache/remotion/chrome-headless-shell/linux64/chrome-headless-shell-linux64/chrome-headless-shell',
  '.cache/remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell',
  '.cache/remotion/chrome-headless-shell/mac-x64/chrome-headless-shell-mac-x64/chrome-headless-shell',
];

const shared = HOME
  ? CANDIDATES.map((rel) => path.join(HOME, rel)).find((p) => fs.existsSync(p))
  : undefined;

if (process.env.BITS_SHARED_BROWSER !== '0' && shared) {
  Config.setBrowserExecutable(shared);
} else if (process.env.BITS_SHARED_BROWSER !== '0' && HOME) {
  // Not fatal: `npx remotion browser ensure` may have left one in the project.
  console.warn(
    '[bits-remotion] shared browser not found; using the project browser.\n' +
      '  Run once per machine: bash scripts/setup-shared-browser.sh',
  );
}