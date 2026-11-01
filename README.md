<<<<<<< HEAD
# HeedVision · IEEE VIS 2026 talk

Slides and transcript for *HeedVision: Attention Awareness in Collaborative Immersive Analytics Environments* (Arvind Srinivasan, Niklas Elmqvist).

| Page | What it is |
|---|---|
| `/` | The deck (reveal.js 6). Speaker notes hold the script. |
| `/talk/` | Transcript page: every slide next to its script, with a question thread per slide. Follows the presenter live. |

Slides and script live in one place, `index.html`. Each `<section id="…">` is a slide, and its `<aside class="notes">` is what you say. The transcript page reads both straight from the deck, so there's nothing to keep in sync.

## Run locally

```bash
python3 -m http.server 8000
```

Open http://localhost:8000. Press **S** for the speaker view (script, timer, and per-slide pacing for a 9-minute talk), **R** to switch an embed between its live demo and the recording, and **Q** for the question sheet.

## Presenting

1. Open `https://arvindchee.nu/heedvision-talk/?present=<key>` on the laptop and press **S** for the speaker view. The key is in `worker/.presenter-key` (git-ignored). To change it, run `npx wrangler secret put PRESENTER_KEY` in `worker/`.
2. The audience scans the QR code on the title slide. That opens `/talk/`, which scrolls along with you.
3. The last slide shows the audience's top-voted questions. Double-click a question there to hide it.

Without `?present=…` the deck is just a deck. Nothing is broadcast.

## Live relay (Cloudflare Worker)

Follow-along and questions go through `worker/`: one Durable Object per room, using SQLite storage and hibernating WebSockets. It runs on the Workers free plan.

```bash
cd worker
npx wrangler login
npx wrangler secret put PRESENTER_KEY
npx wrangler deploy
```

Put the printed `https://heedvision-live.<you>.workers.dev` URL into `js/config.js` (`live.endpoint`). The site is served from `arvindchee.nu` (your Pages custom domain); if that changes, update `ALLOWED_ORIGINS` in `worker/wrangler.jsonc`.

To test locally, run `npx wrangler dev --port 8787` in `worker/` (it reads `PRESENTER_KEY` from `.dev.vars`). Then add `?live=http://127.0.0.1:8787` to the deck and transcript URLs.

## Configuration

`js/config.js` holds the site settings: the public transcript URL (used for the QR code), the relay endpoint and room, optional live-demo URLs for iframe embeds, and links to the paper and OSF.

## Tools

- `tools/make-posters.sh` renders a thumbnail of each slide for the transcript page. Re-run it after editing slides.
- `tools/make-pdf.sh` writes `heedvision-vis2026.pdf`, a backup with one page per slide.

Both scripts need the local server on :8000 and Google Chrome.

## Credits

reveal.js (MIT), D3 (ISC), qrcode-generator (MIT), Fraunces and Google Sans Flex (SIL OFL). Figures and video are from the paper's supplementary material.
=======
# HeedVision — project page

Static project page for:

**HeedVision: Attention Awareness in Collaborative Immersive Analytics Environments**
Arvind Srinivasan and Niklas Elmqvist (Aarhus University)
IEEE VIS 2026 — IEEE Transactions on Visualization and Computer Graphics (special issue)

Live at <https://heedvision.arvindchee.nu>

## Structure

    index.html            single page — all CSS inlined, no build step
    heedvision.pdf        author preprint (15 pp, appendices included)
    assets/               teaser (WebP + PNG fallback), author photos, AU seals, fonts
    CNAME                 custom domain for GitHub Pages

Design ported from [Acadeck](https://github.com/arvindcheenu) — same tokens, typography,
and layout as its paper landing page, rebuilt as standalone HTML.

## Editing

There is no build step. Edit `index.html` and push; GitHub Pages redeploys.

The arXiv button and its entry under *Materials* hide themselves automatically while their
`href` is still the literal `ARXIV_URL`. Replace both occurrences to switch them on.

## Links

- Data, analysis code, and system source: <https://osf.io/frsp8/>
>>>>>>> origin/main
