# HeedVision: project page and talk

Static project page and IEEE VIS 2026 talk for **HeedVision: Attention Awareness in Collaborative Immersive Analytics Environments** (Arvind Srinivasan and Niklas Elmqvist). Live at <https://heedvision.arvindchee.nu>.

A modern, Beamer-like deck you write in markdown, with no LaTeX and no build step. Fork it, edit the files below, and turn on GitHub Pages.

    slides/talk.md       the talk: settings, slides, script
    shared/hv.css        colours, type, the one button style, at the top
    slides/css/deck.css  slide styles, and what each colour means
    slides/js/mdeck.js   layouts and blocks
    slides/js/deck.js    reveal.js setup, Q&A, presenter link
    index.html           project page
    talk/                script page: the slide pinned on top, questions per slide
    worker/              Cloudflare Worker for follow-along and questions
    tools/               local server, dev-mode editor, PDF export, plots

## Writing a slide

```markdown
---
id: scatter
chapter: Results
layout: figure-text
time: 40
---

# A short title

::plot src=assets/fig/plot-scatter.svg alt="…"

:::items steps
- **First point.** Shown with the slide, and highlighted.
- **Second point.** Appears on a click, and takes the highlight.
:::

:::notes
What you say. [click] marks a build.
:::
```

The comment at the top of `talk.md` lists every block. `chapter:` is the section: the navigation on every slide shows each section with one dot per slide, and clicking a dot goes there.

Math works anywhere as `$x^2$` and `$$x^2$$`. A fenced ` ```mermaid ` block draws a diagram. Both load only if the talk uses them.

### Layouts

| Layout | Body |
|---|---|
| `full` | one block |
| `two`, `three` | equal columns |
| `figure-text`, `text-figure` | a wide and a narrow column |
| `grid` | three columns, two rows |
| `figure-strip` | two equal rows |
| `title`, `section`, `end` | full-page slides |

`columns: 3 2` and `rows: 2 1` on a slide split it differently. Add a layout to `LAYOUTS` in `slides/js/mdeck.js`.

### Bullets

`bullet:` at the top of `talk.md` sets the bullet for the whole talk: `vis`, `triangle`, `dot`, `square`, `dash`, `none`, or the path to an image. `:::items bullet=dot` changes one list. The default, `vis`, echoes the IEEE VIS 2026 mark.

### Sections on the pages

The project page and the script page have no rules or native scrollbars. Each section has its own colour from `--c1` to `--c6` in `shared/hv.css`, on its heading, a tinted block, its contents entries and its progress segment. `shared/progress.js` draws the scroll progress.

### Styles

The palette, the font and the border radius are at the top of `shared/hv.css`; the slides' own sizes, and what each colour means, are in `slides/css/deck.css`. The palette is the IEEE VIS 2026 template's. Everything is flat colour. Light, dark and system are in each page's footer and the slides' controls, and **T** cycles them.

## Editing

Slides and notes can only be edited locally:

```bash
node tools/serve.mjs --dev
```

Open the link it prints. Pick a slide, change its markdown or its notes, and save. You can also add, duplicate, move and delete slides, or edit `slides/talk.md` in your own editor; either way the slides reload by themselves.

The plain `node tools/serve.mjs` is read-only. In dev mode, only this machine, holding the token printed in your terminal, can save, and only to `talk.md`. The published site is static, so it can't save anything.

## Presenting

1. Open `https://heedvision.arvindchee.nu/slides/?present=<key>`. The key is in `worker/.presenter-key` (git-ignored).
2. Press **P** for the presenter view or **S** for the speaker view. Either opens in its own window and drives the slides. The browser you present from never shows audience controls; add `?audience` to a slides link to undo that.
3. The audience scans the QR code. `/talk/` follows you, with the slide pinned above the script, and takes questions per slide.

The presenter view has a timer you can pause. **Auto-resume** starts or resumes it when the slides move; turn it off to control it yourself.

Keys on the slides: **→ / space** next, **←** back, **B** backups, **T** theme, **Q** questions. In the presenter view, **Q** shows or hides questions on the projected slide.

### Questions

`questions: on | off | <a link to the venue's Q&A>` and `follow: on | off` at the top of `talk.md` control the live layer. With questions on, the audience can always ask. What shows on the projected slide is up to you: nothing by default, or the top questions with **Questions on slide** in the presenter view, or `qa: on` on a particular slide. **QR opens questions** chooses whether the QR code opens the script page or the project site.

## PDF

**Export PDF** in the presenter view opens `/slides/?view=print` and the print dialog, with one page per slide and every build showing. `tools/make-pdf.sh` does the same from the command line, with the local server running.

## Live relay

`worker/` is one Durable Object per room, on the Workers free plan. Deploy with `npx wrangler deploy` in `worker/`; allowed origins are in `worker/wrangler.jsonc`. Set the key with `npx wrangler secret put PRESENTER_KEY`.

## Tools

- `node tools/serve.mjs`: serves the site on :8000, read-only. `--dev` adds editing and live reload.
- `tools/make-pdf.sh`: the slides as a PDF. Needs the local server and Google Chrome.
- `python3 tools/figures/make_figures.py`: redraws the result plots from `tools/figures/data/`. The per-pair and condition CSVs come from the OSF package and reproduce the paper's means; `attention_fig9.csv` is read back from the paper's Fig. 9 image.

If you change a `.js` or `.css` file, bump the `?v=` number on its `<script>` and `<link>` tags. Without that, returning visitors can mix cached code with a new `talk.md`.

## Links

Data, analysis code and system source: <https://osf.io/frsp8/>. reveal.js, marked, qrcode-generator, KaTeX, Mermaid, three.js and three-mesh-bvh are vendored in `slides/vendor/`, under their own licenses.
