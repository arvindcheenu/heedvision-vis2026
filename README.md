# HeedVision: project page and talk

Static project page and IEEE VIS 2026 talk for **HeedVision: Attention Awareness in Collaborative Immersive Analytics Environments** (Arvind Srinivasan and Niklas Elmqvist). Live at <https://heedvision.arvindchee.nu>.

A modern, Beamer-like deck you write in markdown, with no LaTeX and no build step. Fork it, edit the files below, and turn on GitHub Pages.

    slides/talk.md       the talk: settings, slides, script
    shared/hv.css        colours and type, at the top
    slides/css/deck.css  slide styles; the common ones are in "the frame" near the end
    slides/js/mdeck.js   layouts and blocks
    slides/js/deck.js    reveal.js setup, section navigation, Q&A, presenter link
    index.html           project page
    talk/                script page: the slide pinned on top, questions per slide
    worker/              Cloudflare Worker for follow-along and questions
    tools/               local server, PDF export, plots

## Writing a slide

```markdown
---
id: scatter
chapter: Results
layout: two
time: 40
---

# A short title

:::card title="A block" step
Text. It appears on a click.
:::

::plot src=assets/fig/plot-scatter.svg alt="…"

:::notes
What you say. [click] marks a build.
:::
```

Run `node tools/serve.mjs` and open <http://localhost:8000/slides/>. The comment at the top of `talk.md` lists every block.

`chapter:` is the section. The navigation at the top of each slide shows every section with one dot per slide, and clicking a dot goes there.

### Layouts

| Layout | Body |
|---|---|
| `full` | one block |
| `two`, `three`, `four` | equal columns |
| `figure-text`, `text-figure` | a wide and a narrow column |
| `grid` | three columns, two rows |
| `figure-strip` | a tall row over a short one |
| `title`, `section`, `photo`, `end` | full-page slides |

`columns: 3 2` and `rows: 2 1` on a slide split it differently. Add a layout to `LAYOUTS` in `slides/js/mdeck.js`.

### Styles

Change the palette and font at the top of `shared/hv.css`, and sizes and spacing in "the frame" in `slides/css/deck.css`. The palette is the IEEE VIS 2026 template's. Blue, orange and pink are kept for attention data, as in the paper. Light, dark and system are on every page, and **T** cycles them on the slides.

## Presenting

1. Open `https://heedvision.arvindchee.nu/slides/?present=<key>`. The key is in `worker/.presenter-key` (git-ignored).
2. Press **P** for the presenter view or **S** for the speaker view. Either opens in its own window and drives the slides, and the projected slides then show no controls.
3. The audience scans the QR code. `/talk/` follows you, with the slide pinned above the script, and takes questions per slide.

Keys on the slides: **→ / space** next, **←** back, **B** backups, **T** theme, **Q** questions.

Press **E** in the presenter or speaker view to edit the script. With `node tools/serve.mjs` running it saves straight into `talk.md`.

`questions: on | off | <a link to the venue's Q&A>` and `follow: on | off` at the top of `talk.md` control the live layer. With questions off, the QR code opens the project site.

## Live relay

`worker/` is one Durable Object per room, on the Workers free plan. Deploy with `npx wrangler deploy` in `worker/`; allowed origins are in `worker/wrangler.jsonc`. Set the key with `npx wrangler secret put PRESENTER_KEY`.

## Tools

- `node tools/serve.mjs`: serves the site on :8000 and saves script edits into `talk.md`, from this machine only.
- `tools/make-pdf.sh`: a PDF backup, one page per slide. Needs the local server and Google Chrome.
- `python3 tools/figures/make_figures.py`: redraws the result plots from `tools/figures/data/`. The per-pair and condition CSVs come from the OSF package and reproduce the paper's means; `attention_fig9.csv` is read back from the paper's Fig. 9 image.

If you change a `.js` or `.css` file, bump the `?v=` number on its `<script>` and `<link>` tags. Without that, returning visitors can mix cached code with a new `talk.md`.

## Links

Data, analysis code and system source: <https://osf.io/frsp8/>. reveal.js, marked, qrcode-generator, three.js and three-mesh-bvh are vendored in `slides/vendor/`, under their MIT licenses.
