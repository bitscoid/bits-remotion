#!/usr/bin/env bash
# One-time per machine: put the Remotion headless browser in a shared cache.
#
# Why: without this, `npm install` in every new project re-downloads ~145 MB into
# that project's node_modules/.remotion, and deleting the project throws it away.
#
#   bash scripts/setup-shared-browser.sh
#
# Measured: first run 40-60 s (download + copy), later runs instant.
#
# This script deliberately does NOT use `npx remotion browser ensure`: that reads
# remotion.config.ts, which points at the shared path this script is about to
# create. On a cold machine that is a chicken-and-egg failure:
#   "browserExecutable was specified ... but the path doesn't exist".
set -euo pipefail

SHARED_ROOT="${HOME}/.cache/remotion"
BINARY_REL="linux64/chrome-headless-shell-linux64/chrome-headless-shell"
SHARED="${SHARED_ROOT}/chrome-headless-shell"
LOCAL="$(pwd)/node_modules/.remotion/chrome-headless-shell"

if [ -x "$SHARED/$BINARY_REL" ]; then
  echo "==> shared browser already present"
  echo "    $SHARED/$BINARY_REL"
  exit 0
fi

# Download with the shared path switched off, so the config cannot interfere.
echo "==> downloading the browser into this project (one time)"
BITS_SHARED_BROWSER=0 npx remotion browser ensure

if [ ! -d "$LOCAL" ]; then
  echo "ERROR: expected $LOCAL after 'browser ensure'" >&2
  exit 1
fi

echo "==> copying to $SHARED"
mkdir -p "$SHARED_ROOT"
rm -rf "$SHARED"
cp -r "$LOCAL" "$SHARED"
chmod +x "$SHARED/$BINARY_REL" 2>/dev/null || true

echo "==> removing this project's copy (it is shared now)"
rm -rf "$(pwd)/node_modules/.remotion"

echo
echo "Shared browser: $SHARED/$BINARY_REL"
echo "remotion.config.ts already points here; verify with:"
echo "  npx remotion render src/index.ts portrait work/probe.mp4 --concurrency=2"