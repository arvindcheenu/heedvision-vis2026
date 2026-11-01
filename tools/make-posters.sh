#!/usr/bin/env bash
# Renders one JPEG per slide into slides/assets/posters/ for the transcript page.
# Needs a local server on :8000 (python3 -m http.server 8000) and Google Chrome.
set -euo pipefail
curl -sf -o /dev/null "${BASE:-http://127.0.0.1:8000}/slides/index.html" || { echo "No server on ${BASE:-http://127.0.0.1:8000}; start one with: python3 -m http.server 8000" >&2; exit 1; }
cd "$(dirname "$0")/.."
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
BASE="${BASE:-http://127.0.0.1:8000}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
ids=$(grep -E '^id: ' slides/talk.md | sed -E 's/^id: *//')
for id in $ids; do
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --mute-audio \
    --window-size=1920,1080 --force-device-scale-factor=1 \
    --virtual-time-budget=6000 --run-all-compositor-stages-before-draw \
    --user-data-dir="$TMP/profile" \
    --screenshot="$TMP/$id.png" "$BASE/slides/?poster#/$id" >/dev/null 2>&1
  sips -s format jpeg -s formatOptions 82 --resampleWidth 1280 "$TMP/$id.png" --out "slides/assets/posters/$id.jpg" >/dev/null
  echo "poster: $id"
done
