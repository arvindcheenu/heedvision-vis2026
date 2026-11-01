# HeedVision — project page and talk

Static project page and IEEE VIS 2026 talk for:

**HeedVision: Attention Awareness in Collaborative Immersive Analytics Environments**
Arvind Srinivasan and Niklas Elmqvist (Aarhus University)
IEEE VIS 2026 — IEEE Transactions on Visualization and Computer Graphics (special issue)

Live at <https://heedvision.arvindchee.nu>

## Structure

    index.html            project page (no build step)
    heedvision.pdf        author preprint (15 pp, appendices included)
    assets/               teaser (WebP + PNG fallback), author photos
    CNAME                 custom domain for GitHub Pages

    shared/               design system (hv.css), theme toggle, fonts, logos
    slides/talk.md        the talk: settings, slides, script, components
    slides/               the deck engine (reveal.js 6 + markdown components)
    talk/                 transcript: the slide pinned on top, the script below
    worker/               Cloudflare Worker for live follow-along and questions
    tools/                local server (saves script edits) and PDF export

All three pages share one design system; see [Design](#design).

## Editing

There is no build step. Edit and push; GitHub Pages redeploys. To work locally, run `node tools/serve.mjs` and open <http://localhost:8000>. If you change a `.js` or `.css` file, bump the `?v=` number on its `<script>`/`<link>` tags so returning visitors don't mix old and new code (editing `talk.md` doesn't need this).

The arXiv button and its entry under *Materials* hide themselves automatically while their `href` is still the literal `ARXIV_URL`. Replace both occurrences to switch them on.

## The talk

Everything about the talk lives in **`slides/talk.md`**: settings, slides, script and custom components. The deck (`/slides/`), the transcript (`/talk/`) and the Talk section on this page all read that one file, so there is nothing else to keep in sync. Push it and GitHub Pages redeploys.

### Settings (top of `talk.md`)

```yaml
---
title: HeedVision
url: https://heedvision.arvindchee.nu/talk/   # QR code target
duration: 9.5                                 # minutes, for presenter-view pacing
questions: on      # on | off | a link to the venue's own Q&A tool
follow: on         # audience pages follow your slide
live: https://heedvision-live.arvindcheenu.workers.dev
room: vis2026
---
```

If the venue runs its own Q&A, set `questions: off` or paste their link. The Ask buttons, question threads and the live board on the last slide then go away or point to that link, and the last slide shows its fallback content instead.

### A slide

```markdown
---
id: scatter
chapter: Study
kicker: Result 1 · Scatterplot
columns: 1 1
time: 23
---

# Without landmarks, pairs duplicated 70% less and found more targets

::compare label="Duplicated search" a=11.3 b=3.3 a-label="Cues off" b-label="Cues on" change="−70%" tone=both
::compare label="Targets found" a=62.4 b=78.5 change="+16 pts" tone=you step

:::notes
What you say. [click] marks where you advance.
:::
```

A slide with `backup: yes` is a spare answer for Q&A: it is listed in the script under *Backup*, and skipped when presenting (the talk stops at the end slide; open backups from the presenter view or with **B**).

There are four layouts: `title`, `section`, `content` (the default) and `end`. The headline is the slide's one message, written as a sentence.

### Components

| Component | Use |
|---|---|
| `::stat value= label= sub=` | one big number |
| `::compare a= b= a-label= b-label= unit= change=` | before/after on one scale, starting at zero |
| `::dots n= of= label=` | n of m people |
| `::image src= caption= fit=` / `::video src= poster= caption=` | media |
| `:::card label= title= steps` | text tile; `steps` reveals list items one by one |
| `:::quote who=` | participant quote |
| `:::steps reveal tones=` | numbered stages from a list |
| `:::row` / `:::stack` | put components beside or under each other |
| `::demo modes= steps snapshot bare` | attention simulation; modes (`none count sum max diff who`) step in the order given; `snapshot` freezes one recorded session |
| `::layers src="a, b, c" captions="A \| B \| C" steps` | images that build one over the other |
| `::bvh steps` `::hunt steps` | animated explainers: BVH voxelization, the treasure hunt |
| `::designspace highlight= badge= done= trigger=` | the 2×2 design space; highlight one or more corners |
| `::glyph type=` `::caveat` `::qr` `::logos` | talk-specific pieces |
| `:::questions` | live question board; shows its own content when questions are off |

Any component takes `step` (appear on a click), `wide` (span all columns), `tall` (span two rows) and `tone=you|partner|both|brand`. You can make your own in the file:

```markdown
:::define callout
<div class="tile c-callout">

{{content}}

</div>
:::

:::callout
Anything in **markdown**.
:::
```

### Presenting

1. Open the slides: `https://heedvision.arvindchee.nu/slides/?present=<key>`. The key is in `worker/.presenter-key` (git-ignored); to change it, run `npx wrangler secret put PRESENTER_KEY` in `worker/`.
2. Press **P** for the presenter view (current and next build, timer paced against each slide's `time:`, script, backups, questions) or **S** for the speaker view (the script, large). Both open in a window of their own and drive the slides; keep that window on your laptop screen. Use either one's tab to switch.
3. The audience scans the QR code. `/talk/` follows you, with the slide pinned above the script.

Keys on the slides: **→ / space** next, **←** back, **B** backups (and back), **T** light or dark, **R** live demo or recording, **Q** questions.

**Editing the script while rehearsing.** In the presenter or speaker view, press **E** (or *Edit*) and change the text; `[click]` marks a build. Saving:

- with `node tools/serve.mjs` running, writes it straight into `slides/talk.md`;
- with the presenter key, sends it to the live relay, so `/talk/` shows it at once (until `talk.md` itself changes);
- always keeps it in this browser. *Download talk.md* gives you the file with every edit applied, to commit.

Run it locally with `node tools/serve.mjs`, then open <http://localhost:8000/slides/>. Press **R** on a slide with a recording to switch to a live demo, if `talk.md` sets `demo-<name>: <url>`.

### Live relay

`worker/` is one Durable Object per room, with SQLite storage and hibernating WebSockets, on the Workers free plan. Deploy with `npx wrangler deploy` in `worker/`. Allowed origins are in `worker/wrangler.jsonc`. To test locally, run `npx wrangler dev --port 8787` and add `?live=http://127.0.0.1:8787` to the URLs.

### Tools

- `node tools/serve.mjs` serves the site on :8000 and lets the presenter view save script edits into `talk.md` (only from this machine).
- `tools/make-pdf.sh` writes `heedvision-vis2026.pdf`, a backup with one page per slide (`THEME=light` for light). Needs the local server and Google Chrome.

## Design

`shared/hv.css` holds the tokens (VIS 2026 pink, orange, brown and peach, plus the study's blue/orange/pink), the type (Fraunces and Google Sans Flex) and the header, footer, cards and buttons used by every page. `shared/site.js` remembers the light or dark choice across pages and open tabs (`?theme=light|dark` forces one). The deck adds `slides/css/deck.css` on top, with its own light and dark tokens; card and quote text is fitted to each slide's tiles when the slide is shown.

## Links

- Data, analysis code, and system source: <https://osf.io/frsp8/>

reveal.js (MIT), marked (MIT), qrcode-generator (MIT), Fraunces and Google Sans Flex (SIL OFL).
