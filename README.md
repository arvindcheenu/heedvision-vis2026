# Talk site

A paper's project page, its slides, and a script page that follows the speaker. Static files, no build step, no dependencies. Fork it and it's yours.

This one is for **HeedVision: Attention Awareness in Collaborative Immersive Analytics Environments** (Arvind Srinivasan and Niklas Elmqvist, IEEE VIS 2026), live at <https://heedvision.arvindchee.nu>.

## Make it yours

1. **Fork**, then turn on GitHub Pages (Settings → Pages → Deploy from a branch → `main`, `/`). Delete `CNAME`, or put your own domain in it.
2. **`site.config.js`**: title, authors, accent colour, fonts, logos.
3. **`project.md`**: the project page, in markdown.
4. **`slides/talk.md`**: the talk, in markdown. See [Slides](#slides).
5. **`npm run dev`** to work with live reload, and to draw new layouts. See [Layouts](#layouts).

To drop what's specific to HeedVision: delete `slides/plugins/hv-*` and the `plugins:` line in `talk.md`, and replace `slides/assets/`, `assets/`, `heedvision.pdf`, and `tools/figures/`.

```
site.config.js      title, authors, accent, fonts, logos
project.md          the project page
slides/talk.md      slides and script
slides/layouts.json layouts, drawn in the editor
slides/plugins/     your own components, one file each
slides/assets/      figures and photos
tools/serve.mjs     local server; --dev turns on the editor
tools/editor/       the layout editor
tools/figures/      plots, drawn from CSVs
worker/             optional live relay (follow the speaker, questions)
```

## Slides

`slides/talk.md` is the deck, the speaker notes and the script page at once.

```markdown
---
id: scatter
layout: stage
time: 64
---

# Scatterplot

## Less redundancy, more targets

::stage::
::plot src=assets/fig/plot-scatter.svg alt="…"

::foot::
Dots: pairs. Bars: means.

:::notes
What you say. [click] marks a build.
:::
```

`# Title` and `## Subtitle` fill the slots of those names. `::name::` starts the slot called `name`. A slot takes markdown, including tables, and any component:

| Component | Use |
|---|---|
| `::figure src= alt= caption= fit=contain\|cover` | an image |
| `::plot src= alt= caption=` | an SVG inlined into the slide, so it takes your fonts and accent |
| `::video src= poster=` | plays while its slide is up |
| `::stat value= label= sub=` | a number |
| `:::quote who=` | a quote |
| `:::card icon= title= who= tone=you\|partner\|both` | a card with an icon from `slides/assets/icons.svg` |
| `:::block icon= step=` | any markdown, as one piece |
| `:::heat` | a markdown table whose numbers tint their cells |
| `:::magic steps=1` | [Shiki Magic Move](https://github.com/shikijs/shiki-magic-move): fenced blocks morph into each other, one per click; `lang=text` morphs sentences word by word |
| `:::row` `:::stack` `:::grid cols=3` | beside, under, or in a grid |
| `::qr label=auto` `::authors` `::logos` `::page` | from your config |

Add `step` to any of them to show it on a click, and `step=2` to fix its click number. Slides with `backup: yes` are skipped when presenting; **B** opens them.

Make your own, in the file:

```markdown
:::define callout
<div class="my-callout">{{content}}</div>
:::
```

Or as a plugin, for anything interactive: `slides/plugins/hv-live.js` is a short example. List plugins with `plugins: a, b` at the top of `talk.md`.

## Layouts

A layout is a list of regions on a 1920×1080 page, stored in `slides/layouts.json`. You draw layouts, then write slides that use them in markdown.

```bash
npm run dev
```

Open the link it prints in your terminal. Then:

- **Drag** from the left onto the page: slots (filled from markdown), fixed text, images, shapes and lines, and components, which render for real as you place them.
- **Move and resize** on the page. Regions snap to a grid, to each other and to the page centre; hold ⌥ to place freely.
- **Set everything** on the right: position, font, size, weight, colour, alignment, fill, border, radius, padding, opacity, order, the click it appears on, and any CSS. Each layout can have its own CSS too.
- **Save as block** keeps a styled region in your palette.
- **Preview with** shows a layout with a real slide's content.
- Press **Save**, and copy the markdown the editor gives you for that layout. From then on it's markdown: any slide can say `layout: your-layout`. The **Markdown** tab edits `talk.md` with a live preview, or use your own editor; the slides reload when a file changes.

Keys: arrows nudge, ⌘Z undo, ⌘D duplicate, ⌫ delete, ⌘S save.

### Why the editor can't be opened by accident

`npm start` is read-only. Only `npm run dev` turns on editing, and that lasts until you stop it.

- The server listens on this machine only, and makes a new token each run. Only the link printed in your terminal unlocks the editor.
- Saving also needs the session that link sets, a matching Host and Origin, and a custom header, so other sites open in your browser can't reach it.
- Only `slides/talk.md` and `slides/layouts.json` can be written, and layouts are checked before they are.
- Nothing in the slides links to the editor, and no key opens it. The published site is static, so it has nothing to save to: the editor page there only says it needs dev mode.

## Presenting

Open the slides, press **P** for the presenter view or **S** for the speaker view (the script, large). They open in their own window and drive the slides; put that one on your laptop. Once one is open, the projected slides show no controls.

Keys: arrows or space to move, **P**/**S** to switch view, **A** to choose what the QR code opens, **B** for backups, **T** for the theme. Click the time to reset it.

On a phone, the slides scroll vertically, one under the other.

To have the audience's pages follow you, open `slides/?present=<key>`. See below.

## Live relay (optional)

Audience pages can follow your slide, and take questions per slide. It's a Cloudflare Worker in `worker/`, free tier.

1. `cd worker`, put your site in `wrangler.jsonc`'s allowed origins, then `npx wrangler deploy`.
2. `npx wrangler secret put PRESENTER_KEY`, and keep the key private.
3. At the top of `talk.md` set `live:` to the worker's URL and `room:` to a name.

`questions: on | off | <a link to the venue's Q&A>` and `follow: on | off` control the rest. With `questions: off`, the QR code opens your project site instead of the script page. Delete those lines to run without any of it.

## Look

Big two-tone type, soft rounded panels, and the colours of your content. `accent` and `font` are in `site.config.js`; the font is the system sans stack unless you set one. All the tokens, light and dark, are in `shared/site.css`. Every page has a light, dark and system control, and the choice is shared across pages and open tabs (**T** cycles it on the slides and in the presenter view).

## Figures

`npm run figures` redraws the result plots in `slides/assets/fig/` from `tools/figures/data/`. The plots are SVG with live text, so they follow your font, accent and theme. It needs Python with matplotlib and scipy.

The HeedVision data: `per_pair.csv` and `conditions.csv` come from the OSF package, and reproduce the means reported in the paper. `attention_fig9.csv` is read back from the paper's Fig. 9 image, as the script that made it isn't in the package. Everything is at <https://osf.io/frsp8/>.

## Tools

- `npm start`: serve the site, read-only, on :8000 (`--port=` to change).
- `npm run dev`: the same, plus the editor, saving and live reload.
- `npm run pdf`: a PDF of the slides, as a backup. Needs `npm start` and Google Chrome.

reveal.js, marked, qrcode-generator, Shiki, Shiki Magic Move, three.js and three-mesh-bvh are vendored in `slides/vendor/`, under their own MIT licenses.
