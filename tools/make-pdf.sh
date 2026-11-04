#!/usr/bin/env bash
# Exports the slides as a PDF, one page per slide with every build showing.
# Needs the local server (node tools/serve.mjs) and Google Chrome. You can also open
# /slides/?view=print in a browser and print to PDF, or use Export PDF in the presenter view.
set -euo pipefail
BASE="${BASE:-http://127.0.0.1:8000}"
OUT="${OUT:-slides.pdf}"
curl -sf -o /dev/null "$BASE/slides/index.html" || { echo "No server on $BASE; start one with: node tools/serve.mjs" >&2; exit 1; }
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
"$CHROME" --headless=new --hide-scrollbars --mute-audio --no-pdf-header-footer --virtual-time-budget=15000 --user-data-dir="$TMP" --print-to-pdf="$OUT" "$BASE/slides/?view=print&theme=${THEME:-light}" >/dev/null 2>&1
echo "wrote $OUT"
