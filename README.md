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

The project page and the script page have no rules or native scrollbars. On the project page a quiet tint separates sections; on the script page each section's heading sits on the right, over plain paragraphs. `--c1` to `--c6` in `shared/hv.css` set a colour per section, all the same for now. `shared/progress.js` draws the scroll progress.

### Styles

Font, corners and palette live in one file, `shared/theme.css`. Change them there, or live on the **Theme** page in dev mode (the button at the top of the editor, or `/tools/edit/theme.html`), which previews the real pages, reads out contrast and saves the file. Commit and push to publish. The palette is the IEEE VIS 2026 template's, and the font is SN Pro, a variable font from 200 to 900 that ships in `shared/fonts/` under the SIL Open Font License, so it looks the same in every browser, in the PDF and offline. Its weights are named in `theme.css` (`--w-text`, `--w-strong`, `--w-head`, `--w-display`), a little lighter in dark mode. SN Pro has no Greek or arrows, so Δ and ρ fall back to the system font; maths stays in KaTeX and BibTeX in monospace.

Shared components are in `shared/hv.css`, one block each. The slides' own sizes, and what each colour means, are in `slides/css/deck.css`. Everything is flat colour, apart from the light that follows the cursor. Light, dark and system are in each page's footer and the slides' controls, and **T** cycles them.

Hold ⌘ (Ctrl on Windows) on any page and each control shows a key; press it while still holding, using `shared/keys.js`. Hints wait a quarter of a second, so ordinary shortcuts are untouched, and they stay off the projected slides.

`shared/tactile.js` adds that light and the sounds, which it synthesizes, so there are no audio files. The speaker button turns sounds on or off, and the choice is remembered. On the paper and script pages they start on with a mouse and off on a phone. The presenter view has its own switch, off until you turn it on, because that laptop usually feeds the room's speakers. The slides have `data-silent` on `<html>` and never make a sound.

**Icons.** Font Awesome Pro duotone, in `shared/icons.svg`, which holds only the icons this site uses. Choose an icon with `data-fa="name"` on an `<svg>`, or in `shared/icons.tsv` for slides, then run `python3 tools/build-icons.py`, which fetches the full set from the private `arvindcheenu/chimistry-vendor` repository.

## Editing

Slides and notes can only be edited locally:

```bash
node tools/serve.mjs --dev
```

Open the link it prints. Pick a slide, change its markdown or its notes, and save. You can also add, duplicate, move and delete slides, or edit `slides/talk.md` in your own editor; either way the slides reload by themselves.

The plain `node tools/serve.mjs` is read-only. In dev mode, only this machine, holding the token printed in your terminal, can save, and only to `talk.md`. The published site is static, so it can't save anything.

## Presenting

1. Open `https://heedvision.arvindchee.nu/slides/?present=<key>`. The key is in `worker/.presenter-key` (git-ignored).
2. Press **P** for the presenter view. It opens in its own window and drives the slides. The browser you present from never shows audience controls; add `?audience` to a slides link to undo that.
3. The audience scans the QR code. `/talk/` follows you, with the slide pinned above the script, and takes questions per slide.

The presenter view has a timer you can pause. **Auto-resume** starts or resumes it when the slides move; turn it off to control it yourself.

Keys on the slides: **→ / space** next, **←** back, **P** presenter view, **B** backups, **T** theme, **Q** questions. In the presenter view, **Q** shows or hides questions on the projected slide.

### Questions

`questions: on | off | <a link to the venue's Q&A>` and `follow: on | off` at the top of `talk.md` control the live layer. With questions on, the audience can always ask. What shows on the projected slide is up to you: nothing by default, or the top questions with **Questions on slide** in the presenter view, or `qa: on` on a particular slide. **QR opens questions** chooses whether the QR code opens the script page or the project site.

## PDF

**Slides as PDF** on the project page opens `slides/heedvision-slides.pdf`, with one page per slide and every build showing. Section names, dots and the footer title link to their pages, as in Beamer. It is a built file, so after changing the slides run `tools/make-pdf.sh` with the local server running, and commit the result.

**Export PDF** in the presenter view opens `/slides/?view=print` and the print dialog, from the slides as they are now. Both are light; add `theme=dark` to the print URL for dark.

## Live relay

`worker/` is one Durable Object per room, on the Workers free plan. Deploy with `npx wrangler deploy` in `worker/`; allowed origins are in `worker/wrangler.jsonc`. Set the key with `npx wrangler secret put PRESENTER_KEY`. Your copy of the key is in `worker/.presenter-key`, which git ignores. The key you type in a page's address has to match the secret on Cloudflare.

### Questions and live updates

Pressing **P** without the key controls only your own copy of the slides, in that browser: the hosted talk and other viewers aren't affected, and the presenter view says so. With the key, anyone following along moves with you. Open the slides as `/slides/?present=your-key` and press **P**. The presenter view lists every question as it arrives: waiting for approval first, then not yet answered, then most upvoted. **Go to slide** jumps to the slide it was asked on, **Reply** writes an answer that appears under the question for everyone at once, **Answered aloud** marks it done, and **Delete** erases it and its votes for everyone (press twice; it can't be undone).

**Approve first** holds new questions until you **Approve** them: only you can see them until then, and they can't be voted on or projected. It's off by default, and the setting stays on the relay. Turning it off doesn't release questions already held. **Questions on slide** (Q) projects the top unanswered ones.

**Edit live** above the script changes it for that slide as you type, in the presenter view and on the script page, with no refresh. These edits are kept on the relay, not in `talk.md`: copy anything you want to keep into `talk.md`, because an edit is dropped once `talk.md`'s text for that slide changes. Without the key, the presenter view can only read questions.

The timer stops when the presenter view closes, and picks up again with **Resume** or, with Auto-resume on, on the next slide change.

To try all of this without touching the real room, run `npx wrangler dev --port 8787 --var PRESENTER_KEY:test` in `worker/` and add `live=http://127.0.0.1:8787` to each page's address.

## Analytics

`shared/consent.js` asks once whether Google Analytics may run, and loads nothing from Google until someone says yes. "Cookie settings" in the footer changes the answer, and saying no removes the cookies. The slides never ask, and only run it if the visitor has already agreed elsewhere. The presenter view doesn't include it, and neither does any address with a presenter key. Query strings are stripped before anything reaches Google, because they can hold that key. It only sends from `heedvision.arvindchee.nu`, so local work isn't counted. This is separate from the relay's visit counter, which sets no cookies.

## Toolkit

`toolkit/` is the built site for the caav attention library, published at `/toolkit/`. Its source is in `/Users/au758519/Ideas/caav`. Don't edit it here: build it there, then run `tools/copy-toolkit.sh`, which also gives it the site's current shared files and adds the analytics to its pages.

## Likes and visits

`shared/stats.js` shows like buttons on the paper and script pages, and on the paper page a visit count with a velocity graph of visits every six hours over the last week. They live on the relay: `GET /rooms/vis2026/stats`, `POST /hit` and `POST /like`. A visit is a number added to an hour, and nothing about the visitor is stored. A like stores a random id kept in that browser, so it can be taken back. Local work, automated browsers and anyone asking not to be tracked aren't counted. If the relay can't answer, none of this shows.

## Tools

- `node tools/serve.mjs`: serves the site on :8000, read-only. `--dev` adds editing, the Theme page and live reload.
- `tools/make-pdf.sh`: the slides as a PDF. Needs the local server and Google Chrome.
- `python3 tools/figures/make_figures.py`: redraws the result plots from `tools/figures/data/`. The per-pair and condition CSVs come from the OSF package and reproduce the paper's means; `attention_fig9.csv` is read back from the paper's Fig. 9 image.

If you change a `.js` or `.css` file, bump the `?v=` number on its `<script>` and `<link>` tags. Without that, returning visitors can mix cached code with a new `talk.md`.

## Links

Data, analysis code and system source: <https://osf.io/frsp8/>. reveal.js, marked, qrcode-generator, KaTeX, Mermaid, three.js and three-mesh-bvh are vendored in `slides/vendor/`, under their own licenses. Nunito is in `shared/fonts/`, under the SIL Open Font License.
