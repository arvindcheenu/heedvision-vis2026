#!/usr/bin/env bash
# Exports the slides as a PDF, one page per slide with every build showing, and section
# names and dots that link to their pages. The project page links to the file this writes,
# so run it again whenever the slides change, and commit the result.
# Needs the local server (node tools/serve.mjs) and Google Chrome. You can also open
# /slides/?view=print in a browser and print to PDF, or use Export PDF in the presenter view.
set -euo pipefail
BASE="${BASE:-http://127.0.0.1:8000}"
OUT="${OUT:-slides/heedvision-slides.pdf}"
curl -sf -o /dev/null "$BASE/slides/index.html" || { echo "No server on $BASE; start one with: node tools/serve.mjs" >&2; exit 1; }
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
# Chrome sometimes prints before the slides' links are ready, so check for them and try again.
for try in 1 2 3; do
  "$CHROME" --headless=new --hide-scrollbars --mute-audio --no-pdf-header-footer --virtual-time-budget=15000 --user-data-dir="$TMP" --print-to-pdf="$OUT" "$BASE/slides/?view=print&theme=${THEME:-light}" >/dev/null 2>&1
  LINKS="$(LC_ALL=C grep -a -o '/Subtype */Link' "$OUT" | wc -l | tr -d ' ')"
  if [ "$LINKS" -gt 0 ]; then echo "wrote $OUT, with $LINKS links"; exit 0; fi
done
echo "$OUT has no links after 3 tries" >&2; exit 1
