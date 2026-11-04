// MDeck turns talk.md into reveal.js slides.
//
//   ---                      settings for the whole talk (title, authors, questions: on|off|<url>, …)
//   ---
//   ---                      a slide: `key: value` lines between two `---`
//   id: hook
//   chapter: Motivation      the section, shown in the navigation
//   layout: two              title | section | end, or a body layout (LAYOUTS below)
//   ---
//   # Title
//   :::items steps           bullets, one per click, the current one highlighted
//   ::plot src=x.svg         a one-line block
//   :::notes                 what you say; [click] marks a build
//
// Math: $x^2$ and $$x^2$$. Diagrams: a ```mermaid fenced block.
(function () {
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // $math$ and $$math$$, kept out of markdown's way (KaTeX loads only if the talk uses math)
  function withMath(text, parse) {
    if (!window.katex || !/\$/.test(text)) return parse(text);
    const held = [];
    const hold = (tex, display) => { held.push(katex.renderToString(tex, { displayMode: display, throwOnError: false })); return `\u0000${held.length - 1}\u0000`; };
    const out = String(text).split(/(```[\s\S]*?```|`[^`\n]*`)/).map((part, i) => (i % 2 ? part : part
      .replace(/\$\$([\s\S]+?)\$\$/g, (_, t) => hold(t, true))
      .replace(/(^|[^\\\w$])\$(?!\s)([^$\n]+?)(?<!\s)\$(?![\d$])/g, (_, pre, t) => pre + hold(t, false)))).join("");
    return parse(out).replace(/\u0000(\d+)\u0000/g, (_, i) => held[+i]);
  }
  const md = (s) => (s && s.trim() ? withMath(s, (t) => marked.parse(t)) : "");
  const mdi = (s) => (s ? withMath(String(s), (t) => marked.parseInline(t)) : "");
  const strip = (h) => String(h).replace(/<[^>]+>/g, "").replace(/&(amp|lt|gt|quot|#39);/g, (_, e) => ({ amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'" }[e])).trim();
  const slug = (s) => strip(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  const on = (v) => v === true || /^(on|yes|true)$/i.test(String(v ?? "").trim());

  // ---------------------------------------------------------------- parsing
  const META = /^\s*([\w-]+)\s*:\s*(.*)$/;
  const OPEN = /^\s*:{3,}\s*([a-z][\w-]*)\s*(.*)$/i;
  const CLOSE = /^\s*:{3,}\s*$/;
  const LEAF = /^\s*::([a-z][\w-]*)\s*(.*)$/i;

  function parseMeta(lines) {
    const o = {};
    lines.forEach((l) => {
      const m = l.match(META);
      // `# comment` after a value is ignored
      if (m) o[m[1]] = m[2].replace(/\s+#\s.*$/, "").trim().replace(/^(["'])(.*)\1$/, "$2");
    });
    return o;
  }

  function parseAttrs(s) {
    const a = {};
    const re = /([\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"']+)))?/g;
    let m;
    while ((m = re.exec(s || ""))) a[m[1]] = m[2] ?? m[3] ?? m[4] ?? true;
    return a;
  }

  function split(src) {
    // <!-- comments --> are for the author only
    const lines = src.replace(/\r\n?/g, "\n").replace(/<!--[\s\S]*?-->/g, "").split("\n");
    let i = 0, meta = {};
    while (i < lines.length && !lines[i].trim()) i++;
    if (lines[i] && lines[i].trim() === "---") {
      let j = i + 1;
      while (j < lines.length && lines[j].trim() !== "---") j++;
      meta = parseMeta(lines.slice(i + 1, j));
      i = j + 1;
    }
    const preamble = [], slides = [];
    let cur = null, fence = false;
    for (; i < lines.length; i++) {
      const l = lines[i];
      if (/^\s*(```|~~~)/.test(l)) fence = !fence;
      if (!fence && l.trim() === "---") {
        let j = i + 1;
        const block = [];
        while (j < lines.length && lines[j].trim() !== "---" && (!lines[j].trim() || META.test(lines[j]))) block.push(lines[j++]);
        cur = { meta: {}, lines: [] };
        if (j < lines.length && lines[j].trim() === "---" && block.some((b) => b.trim())) {
          cur.meta = parseMeta(block);
          i = j;
        }
        slides.push(cur);
        continue;
      }
      (cur ? cur.lines : preamble).push(l);
    }
    return { meta, preamble: preamble.join("\n"), slides };
  }

  // Render markdown with components; returns the top-level pieces (one per grid cell).
  function blocks(text, ctx) {
    const lines = String(text || "").split("\n");
    const out = [];
    let buf = [];
    const flush = () => { const t = buf.join("\n"); if (t.trim()) out.push(md(t)); buf = []; };
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      let m = l.match(OPEN);
      if (m) {
        let depth = 1, j = i + 1;
        for (; j < lines.length; j++) {
          if (OPEN.test(lines[j])) depth++;
          else if (CLOSE.test(lines[j]) && --depth === 0) break;
        }
        flush();
        out.push(component(m[1], parseAttrs(m[2]), lines.slice(i + 1, j).join("\n"), ctx));
        i = j;
        continue;
      }
      if ((m = l.match(LEAF))) {
        flush();
        out.push(component(m[1], parseAttrs(m[2]), null, ctx));
        continue;
      }
      buf.push(l);
    }
    flush();
    return out.filter(Boolean);
  }

  function component(name, a, body, ctx) {
    if (ctx.defs[name] != null) return C.__template(name, a, body, ctx);
    const fn = C[name];
    if (!fn) return `<div class="c-unknown">Unknown component <code>${esc(name)}</code></div>`;
    return fn(a, body, ctx) || "";
  }

  // Shared wrapper: adds `step` (appear on click), `wide` (span all columns) and `tone`.
  function wrap(tag, a, cls, inner, extra = "") {
    let c = cls;
    let d = "";
    if (a.step) { c += " fragment fade-up"; if (a.step !== true) d = ` data-fragment-index="${+a.step}"`; }
    if (a.wide) c += " wide";
    if (a.tall) c += " tall";
    if (a.tone) c += ` tone-${esc(a.tone)}`;
    if (a.class) c += ` ${esc(a.class)}`;
    if (a.phase != null && a.phase !== true) extra += ` data-phase="${+a.phase}"`;
    return `<${tag} class="${c}"${d}${extra}>${inner}</${tag}>`;
  }
  const num = (v) => parseFloat(String(v).replace(/[^\d.\-−]/g, "").replace("−", "-"));
  // hidden build markers: `steps` adds n clicks, `steps=3` pins the first one to click 3
  const stepSpans = (a, n) => {
    if (!a.steps) return "";
    const from = a.steps !== true ? +a.steps : null;
    return Array.from({ length: n }, (_, i) => `<span class="fragment step"${from != null ? ` data-fragment-index="${from + i}"` : ""}></span>`).join("");
  };

  // ---------------------------------------------------------------- blocks
  const C = {
    __template(name, a, body, ctx) {
      const filled = ctx.defs[name].replace(/\{\{\s*([\w-]+)\s*\}\}/g, (_, k) => (k === "content" ? body ?? "" : esc(a[k] ?? "")));
      return wrap("div", a, `c-custom c-${esc(name)}`, blocks(filled, ctx).join(""));
    },

    define(a, body, ctx) {
      const name = Object.keys(a)[0];
      if (name) ctx.defs[name] = body || "";
      return "";
    },

    notes(a, body, ctx) { ctx.notesMd.push(String(body || "").trim()); return ""; },

    // beside or under each other
    stack: (a, body, ctx) => wrap("div", a, "c-stack", blocks(body, ctx).join("")),
    row: (a, body, ctx) => { const k = blocks(body, ctx); return wrap("div", a, "c-row", k.join(""), ` style="--n:${a.cols || k.length}"`); },
    grid: (a, body, ctx) => wrap("div", a, "c-grid", blocks(body, ctx).join(""), ` style="--n:${a.cols || 3}"`),

    // bullets. `steps` shows them one per click (`steps=2` starts at click 2) and highlights the
    // current one; `uncover=off` keeps them all visible and only moves the highlight.
    items(a, body) {
      const n = (String(body || "").match(/^[-*]\s/gm) || []).length;
      // bullet=dot, or the path to an image
      const isPath = a.bullet && /[./]/.test(a.bullet);
      const extra = (a.steps ? " data-items" : "") + (isPath ? ` style="--bullet:url('${esc(a.bullet)}')"` : "");
      return wrap("div", a, `c-items${a.steps ? " stepped" : ""}${a.uncover === "off" ? " all-visible" : ""}${a.bullet && !isPath ? ` bullet-${esc(a.bullet)}` : ""}`, md(body) + stepSpans(a, Math.max(0, n - 1)), extra);
    },

    // a heading with text under it, on the page: no box
    card(a, body, ctx) {
      const top = `<div class="c-top">${a.icon ? `<svg class="ic" aria-hidden="true"><use href="#ic-${esc(a.icon)}"/></svg>` : ""}${a.title ? `<h3>${mdi(a.title)}</h3>` : ""}</div>`;
      return wrap("div", a, "c-card", (a.icon || a.title ? top : "") + blocks(body, ctx).join("") + (a.cite ? `<p class="cite">${mdi(a.cite)}</p>` : ""));
    },

    stat: (a, body, ctx) => wrap("div", a, "c-stat", `<div class="v">${esc(a.value)}</div>${a.label ? `<div class="l">${mdi(a.label)}</div>` : ""}${a.sub ? `<div class="s">${mdi(a.sub)}</div>` : ""}${blocks(body, ctx).join("")}`),

    quote(a, body) {
      const text = body && body.trim() ? mdi(body.trim()) : mdi(a.text);
      return wrap("blockquote", a, "c-quote", `<p>${text}</p>${a.who ? `<cite>${mdi(a.who)}</cite>` : ""}`);
    },

    image: (a) => wrap("figure", a, `c-media fit-${esc(a.fit || "contain")}`,
      `<img src="${esc(a.src)}" alt="${esc(a.alt || "")}">${a.caption ? `<figcaption>${mdi(a.caption)}</figcaption>` : ""}`),

    // an SVG inlined into the slide, so it follows the theme
    plot: (a) => wrap("figure", a, "c-plot", `<div class="plot-svg" data-plot="${esc(a.src)}" role="img" aria-label="${esc(a.alt || "")}"></div>`),

    // a table whose numbers tint their cells: more is stronger
    heat(a, body) {
      const max = +a.max || Math.max(1, ...(String(body).match(/\|\s*\d+\s*(?=\|)/g) || []).map((m) => +m.replace(/\D/g, "")));
      return wrap("div", a, "c-heat", md(body).replace(/<td([^>]*)>(\d+)<\/td>/g, (_, at, n) => `<td${at} style="background:color-mix(in srgb, var(--both) ${Math.round((+n / max) * 62)}%, transparent)">${n}</td>`));
    },

    // a looping clip with its caption underneath
    clip: (a) => wrap("figure", a, "c-clip",
      `<div class="clip-v" style="aspect-ratio:${esc(a.ratio || "16/10")}"><div class="embed" data-video="${esc(a.src)}" data-poster="${esc(a.poster || "")}" data-label="${esc(strip(mdi(a.title || a.caption || "Recording")))}"></div></div>` +
      `<figcaption>${a.title ? `<b>${mdi(a.title)}</b>` : ""}${a.caption ? `<span>${mdi(a.caption)}</span>` : ""}</figcaption>`),

    // the HeedVision demo, forked: two headsets side by side over one shared voxel store (js/hvdemo.js)
    live: (a) => wrap("div", a, "c-live",
      `<div class="hvd-panes">${["A", "B"].map((u, i) => `<div class="hvd-pane"><canvas data-user="${i}" aria-label="User ${u}'s headset: drag to move them, click the sphere to hide or show their voxels"></canvas><span class="who">User ${u}'s headset</span></div>`).join("")}</div>` +
      `<div class="live-bar"><span class="tag">${esc(a.tag || "Live")}</span><span class="hint">${mdi(a.hint || "Drag a view to move that person · click the sphere to hide or show their voxels")}</span><button type="button" class="btn" data-act="reset">Reset</button></div>`,
      ` data-voxdemo data-stepper data-at="0"`),


    // animations (js/explain.js); `steps` walks through their phases
    bvh: (a) => wrap("div", a, "c-canvas c-explain", `<canvas data-explain="bvh" aria-label="${esc(a.alt || "Animation: a bounding volume hierarchy voxelizes a chart and head rays collect attention")}"></canvas>${stepSpans(a, 2)}`, ' data-stepper data-at="0"'),
    hv: (a) => wrap("div", a, "c-canvas c-explain", `<canvas data-explain="hv" aria-label="${esc(a.alt || "Animation: two people look at one shared voxelized sphere; voxels turn blue, orange or pink where they look")}"></canvas>${stepSpans(a, 1)}`, ' data-stepper data-at="0"'),


    // modes are shown in the order given; `steps` moves to the next one on each
    // click (`steps=3` starts at fragment 3), `bare` hides the mode buttons.
    demo(a) {
      const all = { none: ["Nothing", "no one can see the trail"], count: ["Count", "how many people looked here"], sum: ["Sum", "how much attention in total"], max: ["Max", "the strongest single focus"], diff: ["Difference", "one person, or shared?"], who: ["Who", "blue you · orange partner · pink both"] };
      const modes = (a.modes || "count,sum,max,diff,who").split(/[\s,]+/).filter((m) => all[m]);
      const btn = modes.map((m, i) => `<button type="button" data-mode="${m}" aria-pressed="${i === 0}"><i data-swatch="${m}"></i><b>${all[m][0]}</b><span>${all[m][1]}</span></button>`).join("");
      const from = a.steps && a.steps !== true ? +a.steps : null;
      const steps = a.steps ? modes.slice(1).map((m, i) => `<span class="fragment step" data-mode="${m}"${from != null ? ` data-fragment-index="${from + i}"` : ""}></span>`).join("") : "";
      return wrap("div", a, `c-demo${a.bare ? " bare" : ""}${a.steps ? " stepped" : ""}${a.snapshot ? " snapshot" : ""}`,
        `<div class="c-canvas"><canvas data-field="demo" aria-label="Simulation of two people's attention"></canvas>${a.tag ? `<span class="tag">${esc(a.tag)}</span>` : ""}</div><div class="seg-ctl" role="group" aria-label="Aggregation">${btn}</div>${steps}`);
    },

    // highlight / done take one or more quadrant ids: world-embedded world-separated camera-embedded camera-separated
    designspace(a) {
      const list = (v) => String(v || "").split(/[\s,]+/).filter(Boolean);
      const hl = list(a.highlight || "world-embedded"), done = list(a.done);
      const q = (id, label, svg, f) => {
        const on = hl.includes(id), was = done.includes(id);
        const badge = on && a.badge ? a.badge : was && a["done-badge"] ? a["done-badge"] : "";
        return `<div class="quad${on ? " hv" : ""}${was ? " done" : ""}${a.steps ? ` fragment fade-up" data-fragment-index="${f}` : ""}"><span class="q-label">${label}</span>${badge ? `<span class="badge">${esc(badge)}</span>` : ""}${svg}</div>`;
      };
      const trig = (id, label, sub, icon) => `<div class="trig-item${id === (a.trigger || "explicit") ? " hv" : ""}"><svg><use href="#i-${icon}"/></svg><div><b>${label}</b><span>${sub}</span></div></div>`;
      return wrap("div", a, `c-ds${a.trigger === "none" ? " no-trig" : ""}`, `
        <div></div><div class="axis-x">Embedded in the vis</div><div class="axis-x">Separate view</div><div class="axis-x${a.steps ? ' fragment fade-up" data-fragment-index="3' : ""}">Triggering</div>
        <div class="axis-y">World space</div>${q("world-embedded", "World · embedded", DS.we, 1)}${q("world-separated", "World · separated", DS.ws, 1)}
        <div class="trig${a.steps ? ' fragment fade-up" data-fragment-index="3' : ""}">${trig("always", "Always on", "risks Midas touch", "loop")}${trig("explicit", "Explicit", "you ask to see it", "hand")}${trig("implicit", "Implicit", "the system decides", "bolt")}</div>
        <div class="axis-y">Camera space</div>${q("camera-embedded", "Camera · embedded", DS.ce, 2)}${q("camera-separated", "Camera · separated", DS.cs, 2)}
        ${a.steps ? '<span class="fragment step" data-fragment-index="4" data-ds-pick></span>' : ""}`, a.steps ? "" : ' data-picked');
    },

    caveat: (a, body) => wrap("p", a, "c-caveat", mdi((body || a.text || "").trim())),
    qr: (a) => wrap("div", a, "c-qr", `<div class="qr" data-qr="talk"></div>${a.label ? `<p>${mdi(a.label)}</p>` : ""}`),
    questions: (a, body, ctx) => wrap("div", a, "c-questions", `<div class="qa-board" data-qa-board></div><div class="qa-fallback">${blocks(body, ctx).join("")}</div>`),
    spacer: () => `<div class="c-spacer"></div>`,
  };

  const LOGOS = (base) =>
    `<img class="logo-vis" src="${base}../shared/logos/vis2026.png" alt="IEEE VIS 2026">` +
    `<img class="logo-mono" src="${base}../shared/logos/au.svg" alt="Aarhus University">` +
    `<img class="logo-mono" src="${base}../shared/logos/ca3.svg" alt="Center for Anytime Anywhere Analytics">`;

  const person = (x, y) => `<use href="#i-person" x="${x}" y="${y}" width="80" height="90" color="var(--person)"/>`;
  const ray = (x1, y1, x2, y2) => `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="var(--glyph-line)" stroke-width="2.5" stroke-dasharray="5 7"/>`;
  const DS = {
    we: `<svg viewBox="0 0 400 240" aria-hidden="true"><circle cx="250" cy="120" r="78" fill="var(--sphere)"/><circle cx="232" cy="104" r="38" fill="var(--both)" fill-opacity=".72"/>${ray(110, 176, 232, 104)}${person(62, 150)}</svg>`,
    ws: `<svg viewBox="0 0 400 240" aria-hidden="true"><circle cx="170" cy="110" r="70" fill="var(--sphere)"/>${ray(300, 172, 170, 110)}${person(262, 150)}<circle cx="358" cy="196" r="26" fill="var(--sphere)"/><circle cx="352" cy="190" r="16" fill="var(--both)" fill-opacity=".72"/></svg>`,
    ce: `<svg viewBox="0 0 400 240" aria-hidden="true"><circle cx="250" cy="120" r="70" fill="var(--sphere)"/><path d="M170 50h150v150H170zM190 30h150v150" fill="none" stroke="var(--glyph-line)" stroke-width="2"/><path d="M170 50l20-20M320 50l20-20M320 200l20-20" stroke="var(--glyph-line)" stroke-width="2"/><ellipse cx="214" cy="120" rx="30" ry="38" fill="var(--glyph-fill)"/><circle cx="214" cy="120" r="22" fill="var(--both)" fill-opacity=".72"/>${ray(110, 176, 214, 120)}${person(62, 150)}</svg>`,
    cs: `<svg viewBox="0 0 400 240" aria-hidden="true"><circle cx="160" cy="110" r="70" fill="var(--sphere)"/>${ray(270, 172, 160, 110)}${person(232, 150)}<path d="M318 120l60-16v86l-60 16z" fill="var(--dot-off)" stroke="var(--glyph-line)" stroke-width="2"/><circle cx="348" cy="156" r="18" fill="var(--both)" fill-opacity=".72"/></svg>`,
  };

  // ---------------------------------------------------------------- slides
  function takeHeadline(text) {
    const lines = text.split("\n");
    let i = 0, headline = "", dek = "";
    while (i < lines.length && !lines[i].trim()) i++;
    if (i < lines.length && /^#\s+/.test(lines[i])) {
      headline = lines[i].replace(/^#\s+/, "");
      lines[i] = "";
      let j = i + 1;
      while (j < lines.length && !lines[j].trim()) j++;
      if (j < lines.length && /^##\s+/.test(lines[j])) { dek = lines[j].replace(/^##\s+/, ""); lines[j] = ""; }
    }
    return { headline, dek, rest: lines.join("\n") };
  }

  function settings(meta) {
    const q = String(meta.questions ?? "on").trim();
    return {
      title: meta.title || "Talk",
      url: meta.url || "",
      site: meta.site || "",
      live: meta.live || "",
      room: meta.room || "talk",
      follow: on(meta.follow ?? "on"),
      questions: /^https?:\/\//.test(q) ? "link" : on(q) ? "on" : "off",
      questionsUrl: /^https?:\/\//.test(q) ? q : "",
      duration: parseFloat(meta.duration || 0) || 0,
    };
  }

  // Layouts for ordinary slides: a frame title, then the body split like this. `columns:` and `rows:`
  // on a slide override them. title, section and end are the full-page layouts.
  const LAYOUTS = {
    full: { columns: "1" },
    two: { columns: "1 1" },
    three: { columns: "1 1 1" },
    "figure-text": { columns: "7 5" },
    "text-figure": { columns: "5 7" },
    grid: { columns: "1 1 1", rows: "1 1" },
    "figure-strip": { columns: "1", rows: "3 2" },
  };

  // Beamer's headline and footline. Every slide carries its own, so they print and stay put.
  function chrome(slide, all, m) {
    const main = all.filter((s) => !s.backup);
    const chapters = [];
    main.forEach((s) => { let c = chapters.find((x) => x.name === s.chapter); if (!c) chapters.push((c = { name: s.chapter, slides: [] })); c.slides.push(s); });
    const at = main.indexOf(slide);
    const dots = (c) => c.slides.map((s) => { const i = main.indexOf(s); return `<button type="button" class="${i < at ? "done" : i === at ? "now" : ""}" data-to="${esc(s.id)}" title="${esc(s.title)}" aria-label="${esc(s.title)}"></button>`; }).join("");
    const here = chapters.findIndex((c) => c.name === slide.chapter);
    const head = `<nav class="headline" aria-label="Sections">${chapters.map((c, i) => `<div class="sec${i === here ? " now" : i < here ? " past" : ""}"><b>${esc(c.name)}</b><span class="dots">${dots(c)}</span></div>`).join("")}</nav>`;
    const foot = `<div class="footline"><span class="f-who">${esc(m.authors || "")}</span><span class="f-what">${esc(m.title || "")}</span><span class="f-logos">${LOGOS("")}</span><span class="count">${slide.backup ? "Backup" : `${at + 1} / ${main.length}`}</span></div>`;
    return head + foot;
  }

  function render(src) {
    const doc = split(src);
    const ctx = { defs: {}, notesMd: [], doc };
    blocks(doc.preamble, ctx); // picks up :::define blocks
    const m = doc.meta;
    const set = settings(m);
    let chapter = m.chapter || "";
    const used = new Set();

    const slides = doc.slides.map((s, idx) => {
      ctx.notesMd = [];
      const sm = s.meta;
      const layout = (sm.layout || "full").toLowerCase();
      const { headline, dek, rest } = takeHeadline(s.lines.join("\n"));
      const items = blocks(rest, ctx);
      chapter = sm.chapter || chapter;
      let id = sm.id || slug(headline) || `slide-${idx + 1}`;
      while (used.has(id)) id += "-x";
      used.add(id);
      const title = sm.title || strip(mdi(headline)) || (layout === "title" ? m.title : `Slide ${idx + 1}`);
      const notesMd = ctx.notesMd.join("\n\n");
      const backup = on(sm.backup);
      const preset = LAYOUTS[layout] || {};
      let inner = "";

      if (layout === "title") {
        const photos = (m.photos || "").split(",").map((v) => v.trim());
        const authors = (m.authors || "").split(",").map((v, i) => `<span class="author">${photos[i] ? `<img src="${esc(photos[i])}" alt="">` : ""}<b>${esc(v.trim())}</b></span>`).join("");
        inner = `<div class="t-block"><h1>${mdi(m.title)}</h1></div>
          <div class="t-grid"><p class="t-sub">${mdi(m.subtitle || "")}</p><div class="t-people">${authors}</div>
          <p class="t-venue">${(m.venue || "").split("·").map((v) => esc(v.trim())).join("<br>")}</p>
          <div class="t-qr"><div class="qr" data-qr="talk"></div><p data-qr-label></p></div></div>
          <div class="t-logos">${LOGOS("")}</div>`;
      } else if (layout === "section") {
        inner = `<div class="s-page"><span class="s-num" data-section-num></span><h2>${mdi(headline)}</h2>${dek ? `<p>${mdi(dek)}</p>` : ""}</div>`;
      } else if (layout === "end") {
        // takeaways on the left; thank you, the people and the logos build in on the right
        const photos = (m.photos || "").split(",").map((v) => v.trim());
        const contacts = (m.contacts || "").split(";");
        const people = (m.authors || "").split(",").map((v, i) => ({ name: v.trim(), photo: photos[i], mail: ((contacts[i] || "").split("·")[1] || "").trim() }));
        // the text runs on a circle 7.5 units outside the band's centre line, so its letters sit centred in the band
        const ring = (txt) => `<svg class="ring" viewBox="0 0 270 270" aria-label="${esc(txt)}"><circle cx="135" cy="135" r="117" class="ring-band"/><g class="ring-spin"><path id="ring-path" d="M135 135m-109.5 0a109.5 109.5 0 1 1 219 0a109.5 109.5 0 1 1 -219 0" fill="none"/><text class="ring-text"><textPath href="#ring-path" textLength="688" lengthAdjust="spacing">${esc(txt)} · ${esc(txt)} · </textPath></text></g></svg>`;
        const person = (p, i) => `<div class="e-person${i === 0 ? " first" : ""}"><div class="e-face">${i === 0 && m["open-to-work"] ? ring(m["open-to-work"]) : ""}${p.photo ? `<img src="${esc(p.photo)}" alt="">` : ""}</div><div class="e-who"><b>${esc(p.name)}</b>${p.mail ? `<span>${esc(p.mail)}</span>` : ""}${i === 0 && m.slug ? `<p class="e-slug">${mdi(m.slug)}</p>` : ""}</div></div>`;
        inner = `<header class="frametitle"><h2>${mdi(dek || "Takeaways")}</h2></header>
          <div class="e-body">${items.join("")}</div>
          <div class="e-side fragment fade-up"><div class="e-thanks"><h1>${mdi(headline || "Thank you")}</h1></div>
            <div class="e-people">${people.map(person).join("")}</div>
            <div class="e-foot"><div class="e-logos">${LOGOS("")}</div><div class="e-qr"><div class="qr" data-qr="talk"></div><p data-qr-label></p></div></div></div>`;
      } else {
        const rowsSpec = sm.rows || preset.rows;
        const rows = rowsSpec ? rowsSpec.split(/[\s/,]+/).filter(Boolean).map((n) => (n === "auto" ? "auto" : `minmax(0,${parseFloat(n) || 1}fr)`)).join(" ") : "";
        const cols = (sm.columns || preset.columns || "1").split(/[\s/,]+/).filter(Boolean).map((n) => `${parseFloat(n) || 1}fr`).join(" ");
        // footnotes sit under the body, never inside its grid
        const notes = items.filter((x) => x.startsWith('<p class="c-caveat'));
        const body = items.filter((x) => !notes.includes(x));
        inner = `<header class="frametitle"><h2>${mdi(headline)}</h2>${dek ? `<p>${mdi(dek)}</p>` : ""}</header>
          <div class="s-main"><div class="s-body" style="grid-template-columns:${cols}${rows ? `;grid-template-rows:${rows}` : ""}">${body.join("")}</div>${notes.length ? `<footer class="s-foot">${notes.join("")}</footer>` : ""}</div>`;
      }
      const kind = LAYOUTS[layout] ? "frame" : layout;
      return { id, title, chapter, layout, kind, backup, sm, time: parseFloat(sm.time) || 0, notes: renderNotes(notesMd), notesMd, inner };
    });

    let sectionNo = 0;
    slides.forEach((s) => {
      const sec = s.kind === "section" ? String(++sectionNo) : "";
      const inner = s.inner.replace("<span class=\"s-num\" data-section-num></span>", `<span class="s-num">${sec}</span>`);
      s.html = `<section id="${esc(s.id)}" class="layout-${esc(s.kind)}${s.sm.class ? ` ${esc(s.sm.class)}` : ""}" data-chapter="${esc(s.chapter)}" data-title="${esc(s.title)}"${s.sm.time ? ` data-timing="${parseFloat(s.sm.time)}"` : ""}${on(s.sm.qa) ? " data-qa" : ""}${s.backup ? ' data-backup data-visibility="uncounted"' : ""}>${inner}${s.kind === "title" ? "" : chrome(s, slides, m)}<aside class="notes">${s.notes}</aside></section>`;
      s.clicks = countBuilds(s.html);
    });
    return { meta: m, settings: set, slides };
  }

  // builds on a slide: fragments without an index each add one, indexed ones share theirs
  function countBuilds(html) {
    const tags = html.match(/<[^>]+class="[^"]*\bfragment\b[^"]*"[^>]*>/g) || [];
    const fixed = new Set();
    let free = 0;
    tags.forEach((t) => { const m = t.match(/data-fragment-index="(\d+)"/); if (m) fixed.add(m[1]); else free++; });
    return free + fixed.size;
  }

  // notes are markdown; `[click]` marks where the presenter advances
  function renderNotes(text) { return md(text); }

  // loads KaTeX first if the talk uses math. base: path from the page to slides/
  async function prepare(src, base = "") {
    if (!/\$\$|(^|[^\\\w$])\$(?!\s)[^$\n]+?(?<!\s)\$(?![\d$])/m.test(src.replace(/<!--[\s\S]*?-->/g, "")) || window.katex) return;
    const css = document.createElement("link"); css.rel = "stylesheet"; css.href = `${base}vendor/katex/katex.min.css`; document.head.appendChild(css);
    await new Promise((res) => { const s = document.createElement("script"); s.src = `${base}vendor/katex/katex.min.js`; s.onload = s.onerror = res; document.head.appendChild(s); });
  }

  window.MDeck = { render, prepare, settings, components: C, parseAttrs, renderNotes, split };
})();
