#!/usr/bin/env bash
# Brings in a new build of the toolkit site, gives it the site's current shared styles and scripts, and adds the
# analytics and cookie question to its landing and docs pages. The examples are left alone, because they're meant to be copied.
set -euo pipefail
SRC="${1:-/Users/au758519/Ideas/caav/site-dist}"
cd "$(dirname "$0")/.."
rsync -a --delete "$SRC/" toolkit/
# its look comes from the site, so use the site's current shared files rather than the copies in the build
cp shared/theme.css shared/hv.css shared/site.js shared/tactile.js shared/keys.js shared/progress.js toolkit/shared/
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
