#!/usr/bin/env bash
# Exports a PDF backup of the deck: one 1920x1080 page per slide, builds shown.
# (Image-based: reveal's own print view needs a visible window to lay out.)
# Needs a local server on :8000 and Google Chrome.
set -euo pipefail
curl -sf -o /dev/null "${BASE:-http://127.0.0.1:8000}/slides/index.html" || { echo "No server on ${BASE:-http://127.0.0.1:8000}; start one with: python3 -m http.server 8000" >&2; exit 1; }
cd "$(dirname "$0")/.."
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
BASE="${BASE:-http://127.0.0.1:8000}"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
shot() {
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --mute-audio \
    --window-size=1920,1080 --force-device-scale-factor=1 \
    --virtual-time-budget=6000 --user-data-dir="$TMP/profile" "$@" >/dev/null 2>&1
}
pages=""
for id in $(grep -E '^id: ' slides/talk.md | sed -E 's/^id: *//'); do
  shot --screenshot="$TMP/$id.png" "$BASE/slides/?poster#/$id"
  pages="$pages<img src=\"$id.png\">"
  echo "page: $id"
done
cat > "$TMP/print.html" <<HTML
<!doctype html><style>@page{size:1920px 1080px;margin:0}html,body{margin:0;background:#0b0c10}
img{display:block;width:1920px;height:1080px;break-after:page}</style>$pages
HTML
shot --allow-file-access-from-files --no-pdf-header-footer --print-to-pdf="$PWD/heedvision-vis2026.pdf" "file://$TMP/print.html"
echo "wrote heedvision-vis2026.pdf"
