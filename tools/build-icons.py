#!/usr/bin/env python3
"""Builds shared/icons.svg: only the Font Awesome Pro icons this site uses.

Font Awesome Pro is licensed to Arvind Srinivasan and the full set lives in the private
repository arvindcheenu/chimistry-vendor. Only the result is committed here. Run this again
after using a new icon.

    python3 tools/build-icons.py                  # fetches the sprite with the gh CLI
    python3 tools/build-icons.py path/to/sprite.svg
"""
import base64, json, pathlib, re, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
REPO = "arvindcheenu/chimistry-vendor"
PATH = "fontawesome-pro/fa-pro-7.1.0-duotone.svg"


def sprite():
    if len(sys.argv) > 1:
        return pathlib.Path(sys.argv[1]).read_text()
    gh = lambda *a: subprocess.run(["gh", "api", *a], check=True, capture_output=True, text=True).stdout
    tree = json.loads(gh(f"repos/{REPO}/git/trees/HEAD?recursive=1"))["tree"]
    sha = next(t["sha"] for t in tree if t["path"] == PATH)
    return base64.b64decode(json.loads(gh(f"repos/{REPO}/git/blobs/{sha}"))["content"]).decode()


def main():
    text = sprite()
    symbols = {m[1]: m[0] for m in re.finditer(r'<symbol id="([^"]+)"[\s\S]*?</symbol>', text)}
    licence = re.search(r"<!--![\s\S]*?-->", text).group(0)
    aliases = [l.split("\t") for l in (ROOT / "shared/icons.tsv").read_text().splitlines() if l and not l.startswith("#")]
    names = set()
    for f in ["index.html", "talk/index.html", "slides/present.html", "shared/site.js", "shared/tactile.js", "slides/js/present.js"]:
        names |= set(re.findall(r'data-fa="([a-z0-9-]+)"', (ROOT / f).read_text()))
    for f in list((ROOT / "toolkit").glob("**/*.html")) + list((ROOT / "toolkit/assets").glob("*.js")):
        names |= set(re.findall(r'data-fa="([a-z0-9-]+)"', f.read_text()))
    missing = sorted(n for n in names | {a[1] for a in aliases} if n not in symbols)
    if missing:
        sys.exit("Not in the sprite: " + ", ".join(missing))
    out = [licence, '<svg xmlns="http://www.w3.org/2000/svg">']
    out += [symbols[n].replace(f'id="{n}"', f'id="fa-{n}"', 1) for n in sorted(names)]
    out += [symbols[fa].replace(f'id="{fa}"', f'id="ic-{name}"', 1) for name, fa in aliases]
    out.append("</svg>\n")
    (ROOT / "shared/icons.svg").write_text("\n".join(out))
    print(f"shared/icons.svg: {len(names)} interface icons, {len(aliases)} slide icons ")


main()
