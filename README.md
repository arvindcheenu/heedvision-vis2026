# HeedVision — project page and talk

Static project page and IEEE VIS 2026 talk for:

**HeedVision: Attention Awareness in Collaborative Immersive Analytics Environments**
Arvind Srinivasan and Niklas Elmqvist (Aarhus University)
IEEE VIS 2026 — IEEE Transactions on Visualization and Computer Graphics (special issue)

Live at <https://heedvision.arvindchee.nu>

## Structure

    index.html            project page — all CSS inlined, no build step
    heedvision.pdf        author preprint (15 pp, appendices included)
    assets/               teaser (WebP + PNG fallback), author photos, AU seals, fonts
    CNAME                 custom domain for GitHub Pages

    slides/               the talk deck (reveal.js 6); speaker notes hold the script
    talk/                 transcript: every slide, live, next to its script, with questions
    worker/               Cloudflare Worker for live follow-along and questions
    tools/                poster and PDF export scripts

The project page is designed after [Acadeck](https://github.com/arvindcheenu), with the same tokens, typography, and layout as its paper landing page, rebuilt as standalone HTML.

## Editing

There is no build step. Edit and push; GitHub Pages redeploys.

The arXiv button and its entry under *Materials* hide themselves automatically while their `href` is still the literal `ARXIV_URL`. Replace both occurrences to switch them on.

## The talk

| URL | What it is |
|---|---|
| `/slides/` | The deck. Press **S** for the speaker view (script, timer, and pacing for 9 minutes), **R** to switch an embed between its live demo and the recording, and **Q** for questions. |
| `/talk/` | Transcript. Each slide is shown live next to its script, with a question thread. It follows the presenter. The QR code on the title slide points here. |

Slides and script live in one place, `slides/index.html`. Each `<section id="…">` is a slide, and its `<aside class="notes">` is what you say. The transcript page and the project page's Talk section read from the deck, so there's nothing to keep in sync.

Run it locally with `python3 -m http.server 8000`, then open <http://localhost:8000/slides/>.

### Presenting

1. Open `https://heedvision.arvindchee.nu/slides/?present=<key>` and press **S**. The key is in `worker/.presenter-key` (git-ignored). To change it, run `npx wrangler secret put PRESENTER_KEY` in `worker/`.
2. The audience scans the QR code and follows along on `/talk/`.
3. The last slide shows the top-voted questions. Double-click one to hide it.

Without `?present=…` the deck is just a deck. Nothing is broadcast.

### Live relay

`worker/` is one Durable Object per room, with SQLite storage and hibernating WebSockets, on the Workers free plan. Deploy with `npx wrangler deploy` in `worker/`. Allowed origins are in `worker/wrangler.jsonc`, and the endpoint is in `slides/js/config.js`. To test locally, run `npx wrangler dev --port 8787` and add `?live=http://127.0.0.1:8787` to the URLs.

### Tools

- `tools/make-posters.sh` renders a thumbnail of each slide (used before the live slide loads). Re-run it after editing slides.
- `tools/make-pdf.sh` writes `heedvision-vis2026.pdf`, a backup with one page per slide.

Both scripts need the local server on :8000 and Google Chrome.

## Links

- Data, analysis code, and system source: <https://osf.io/frsp8/>

reveal.js (MIT), D3 (ISC), qrcode-generator (MIT), Fraunces and Google Sans Flex (SIL OFL).
