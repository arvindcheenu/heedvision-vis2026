#!/usr/bin/env bash
# Exports a PDF of the deck: one 1920x1080 page per slide, with builds shown.
# Needs a local server (npm start) and Google Chrome. WebGL demos may come out blank.
set -euo pipefail
BASE="${BASE:-http://127.0.0.1:8000}"
OUT="${OUT:-slides.pdf}"
curl -sf -o /dev/null "$BASE/slides/index.html" || { echo "No server on $BASE; start one with: npm start" >&2; exit 1; }
cd "$(dirname "$0")/.."
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
shot() {
  "$CHROME" --headless=new --hide-scrollbars --mute-audio --window-size=1920,1080 --force-device-scale-factor=1 \
    --virtual-time-budget=6000 --user-data-dir="$TMP/profile" "$@" >/dev/null 2>&1
}
pages=""
for id in $(grep -E '^id: ' slides/talk.md | sed -E 's/^id: *//'); do
  shot --screenshot="$TMP/$id.png" "$BASE/slides/?poster#/$id"
  pages="$pages<img src=\"$id.png\">"
  echo "page: $id"
done
cat > "$TMP/print.html" <<HTML
<!doctype html><style>@page{size:1920px 1080px;margin:0}html,body{margin:0;background:#fff}
img{display:block;width:1920px;height:1080px;break-after:page}</style>$pages
HTML
shot --allow-file-access-from-files --no-pdf-header-footer --print-to-pdf="$PWD/$OUT" "file://$TMP/print.html"
echo "wrote $OUT"
