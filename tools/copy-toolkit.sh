#!/usr/bin/env bash
# Brings in a new build of the toolkit site, and adds the site's analytics and cookie question to its landing
# and docs pages. The examples are left alone, because they're meant to be copied.
set -euo pipefail
SRC="${1:-/Users/au758519/Ideas/caav/site-dist}"
cd "$(dirname "$0")/.."
rsync -a --delete "$SRC/" toolkit/
V="$(grep -o 'consent.js?v=[0-9]*' index.html | head -1 | cut -d= -f2)"
for f in toolkit/index.html toolkit/docs/index.html; do
  python3 - "$f" "$V" <<'PY'
import sys
path, v = sys.argv[1:]
s = open(path).read()
s = s.replace("<head>", f'<head>\n    <script src="/shared/consent.js?v={v}" defer></script>', 1)
open(path, "w").write(s)
PY
done
echo "copied $SRC to toolkit/"
