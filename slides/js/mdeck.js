// MDeck turns talk.md into reveal.js slides. Two ideas, borrowed from Slidev:
//
//   Layouts are data (slides/layouts.json), drawn in the visual editor. A layout is
//   a list of regions placed on a 1920x1080 page. A `slot` region is filled from markdown.
//
//   Slides are markdown (slides/talk.md):
//
//     ---
//     id: scatter
//     layout: side-figure
//     time: 60
//     ---
//     # Title                goes in the `title` slot
//     ## Subtitle            goes in the `subtitle` slot
//     ::side::               everything after this goes in the `side` slot
//     - A line
//     ::figure src=x.jpg     a component
//     :::notes               what you say; [click] marks a build
//     :::
//
// Register your own with MDeck.component(name, fn) from a plugin, or in the file with
//   :::define name  …markdown or HTML with {{attr}} and {{content}}…  :::
(function () {
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const md = (s) => (s && s.trim() ? marked.parse(s) : "");
  const mdi = (s) => (s ? marked.parseInline(String(s)) : "");
  const strip = (h) => String(h).replace(/<[^>]+>/g, "").replace(/&(amp|lt|gt|quot|#39);/g, (_, e) => ({ amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'" }[e])).trim();
  const slug = (s) => strip(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  const on = (v) => v === true || /^(on|yes|true)$/i.test(String(v ?? "").trim());
  const cssLen = (v) => (typeof v === "number" ? `${v}px` : v);

  // ---------------------------------------------------------------- parsing
  const META = /^\s*([\w-]+)\s*:\s*(.*)$/;
  const OPEN = /^\s*:{3,}\s*([a-z][\w-]*)\s*(.*)$/i;
  const CLOSE = /^\s*:{3,}\s*$/;
  const LEAF = /^\s*::([a-z][\w-]*)(\s.*)?$/i;
  const SLOT = /^\s*::([a-z][\w-]*)::\s*$/i;

  function parseMeta(lines) {
    const o = {};
    lines.forEach((l) => {
      const m = l.match(META);
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

  // A slide's text → { title, subtitle, default, <slot>… }, with the notes taken out.
  function slotsOf(text, ctx) {
    const slots = {};
    let name = "default", buf = [], depth = 0, fence = false, inNotes = false;
    const flush = () => { const t = buf.join("\n"); if (t.trim()) slots[name] = (slots[name] ? slots[name] + "\n" : "") + t; buf = []; };
    const notes = [];
    for (const l of String(text || "").split("\n")) {
      if (/^\s*(```|~~~)/.test(l)) fence = !fence;
      if (!fence && !depth) {
        const m = l.match(SLOT);
        if (m) { flush(); name = m[1]; continue; }
        const o = l.match(OPEN);
        if (o && o[1] === "notes") { inNotes = true; depth = 1; continue; }
        const h = !slots.title && l.match(/^#\s+(.*)$/);
        if (h) { slots.title = h[1]; continue; }
        const d = !slots.subtitle && l.match(/^##\s+(.*)$/);
        if (d) { slots.subtitle = d[1]; continue; }
      }
      if (!fence) {
        if (OPEN.test(l)) depth++;
        else if (CLOSE.test(l) && depth && --depth === 0 && inNotes) { inNotes = false; continue; }
      }
      (inNotes ? notes : buf).push(l);
    }
    flush();
    ctx.notesMd = notes.join("\n").trim();
    return slots;
  }

  // Markdown with components → HTML
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
    return out.filter(Boolean).join("");
  }

  function component(name, a, body, ctx) {
    if (ctx.defs[name] != null) return C.__template(name, a, body, ctx);
    const fn = C[name];
    if (!fn) return `<div class="c-unknown">Unknown component <code>${esc(name)}</code></div>`;
    return fn(a, body, ctx) || "";
  }

  // Shared wrapper: `step` appears on a click (`step=2` fixes its click number)
  function wrap(tag, a, cls, inner, extra = "") {
    let c = cls, d = "";
    if (a.step) { c += " fragment"; if (a.step !== true) d = ` data-fragment-index="${+a.step}"`; }
    if (a.class) c += ` ${esc(a.class)}`;
    return `<${tag} class="${c}"${d}${extra}>${inner}</${tag}>`;
  }

  // ---------------------------------------------------------------- components
  const C = {
    __template(name, a, body, ctx) {
      const filled = ctx.defs[name].replace(/\{\{\s*([\w-]+)\s*\}\}/g, (_, k) => (k === "content" ? body ?? "" : esc(a[k] ?? "")));
      return wrap("div", a, `c-custom c-${esc(name)}`, blocks(filled, ctx));
    },
    define(a, body, ctx) { const name = Object.keys(a)[0]; if (name) ctx.defs[name] = body || ""; return ""; },

    stack: (a, body, ctx) => wrap("div", a, "c-stack", blocks(body, ctx), a.gap ? ` style="gap:${cssLen(+a.gap)}"` : ""),
    row: (a, body, ctx) => wrap("div", a, "c-row", blocks(body, ctx), a.gap ? ` style="gap:${cssLen(+a.gap)}"` : ""),

    figure: (a) => wrap("figure", a, `c-figure fit-${esc(a.fit || "contain")}${a.plate ? " plate" : ""}`,
      `<img src="${esc(a.src)}" alt="${esc(a.alt || "")}"${a.focus ? ` style="--focus:${esc(a.focus)}"` : ""}>${a.caption ? `<figcaption>${mdi(a.caption)}</figcaption>` : ""}`),
    // an SVG inlined into the slide, so it takes the site's fonts and accent colour
    plot: (a) => wrap("figure", a, "c-plot",
      `<div class="plot-svg" data-plot="${esc(a.src)}" role="img" aria-label="${esc(a.alt || "")}"></div>${a.caption ? `<figcaption>${mdi(a.caption)}</figcaption>` : ""}`),
    video: (a) => wrap("figure", a, `c-figure fit-${esc(a.fit || "contain")}`,
      `<video data-src="${esc(a.src)}" poster="${esc(a.poster || "")}" muted loop playsinline aria-label="${esc(a.alt || a.caption || "Video")}"></video>${a.caption ? `<figcaption>${mdi(a.caption)}</figcaption>` : ""}`),

    stat: (a, body, ctx) => wrap("div", a, "c-stat",
      `<div class="v">${mdi(a.value)}</div>${a.label ? `<div class="l">${mdi(a.label)}</div>` : ""}${a.sub ? `<div class="s">${mdi(a.sub)}</div>` : ""}${blocks(body, ctx)}`),
    quote: (a, body) => wrap("blockquote", a, "c-quote", `<p>${mdi((body || a.text || "").trim())}</p>${a.who ? `<cite>${mdi(a.who)}</cite>` : ""}`),
    note: (a, body) => wrap("p", a, "c-note", mdi((body || a.text || "").trim())),
    // any markdown, as one piece: `:::block step=1`
    block: (a, body, ctx) => wrap("div", a, `c-block${a.icon ? " has-icon" : ""}`, (a.icon ? ICON(a.icon) : "") + (a.icon ? `<div>${blocks(body, ctx)}</div>` : blocks(body, ctx))),
    grid: (a, body, ctx) => wrap("div", a, "c-grid", blocks(body, ctx), ` style="--n:${+a.cols || 3}"`),
    // a card: icon and title on top, text under; `tone=you|partner|both` tints it
    card: (a, body, ctx) => wrap("div", { ...a, class: `${a.tone ? `tone-${a.tone} ` : ""}${a.class || ""}`.trim() }, "c-card",
      `<div class="c-top">${a.icon ? ICON(a.icon) : ""}<span>${mdi(a.title || "")}</span></div>${blocks(body, ctx)}${a.who ? `<cite>${mdi(a.who)}</cite>` : ""}`),
    tag: (a) => wrap("span", a, `tag${a.tone ? ` ${esc(a.tone)}` : ""}`, mdi(a.text || "")),
    // a table whose numbers tint their cells: more is stronger
    heat(a, body) {
      const max = +a.max || Math.max(1, ...(String(body).match(/\|\s*\d+\s*(?=\|)/g) || []).map((m) => +m.replace(/\D/g, "")));
      return wrap("div", a, "c-heat", md(body).replace(/<td([^>]*)>(\d+)<\/td>/g, (_, at, n) => `<td${at} style="background:color-mix(in srgb, var(--both) ${Math.round((+n / max) * 62)}%, transparent)">${n}</td>`));
    },
    // Shiki Magic Move: fenced blocks morph into each other, one per click (`steps=1` starts at click 1).
    // lang=text morphs plain sentences word by word.
    magic(a, body) {
      const codes = [...String(body).matchAll(/^\s*```[^\n]*\n([\s\S]*?)\n\s*```\s*$/gm)].map((m) => m[1]);
      const lang = a.lang || (String(body).match(/```(\w+)/) || [])[1] || "python";
      const from = a.steps && a.steps !== true ? +a.steps : null;
      const spans = codes.slice(1).map((_, i) => `<span class="fragment step"${from != null ? ` data-fragment-index="${from + i}"` : ""}></span>`).join("");
      return wrap("div", a, `c-magic lang-${esc(lang)}`, `<pre data-magic="${esc(JSON.stringify(codes))}" data-lang="${esc(lang)}">${esc(codes[codes.length - 1] || "")}</pre>${spans}`);
    },

    qr: (a) => wrap("div", a, "c-qr", `<div class="qr" data-qr></div>${a.label ? `<p${a.label === "auto" ? " data-qr-label" : ""}>${a.label === "auto" ? "" : mdi(a.label)}</p>` : ""}`),
    authors: (a, body, ctx) => wrap("div", a, "c-authors", (ctx.site.authors || []).map((p) => `<span class="author">${a.photos !== "off" && p.photo ? `<img src="${esc(rootPath(p.photo, ctx))}" alt="">` : ""}<b>${esc(p.name)}</b>${a.emails ? `<small>${esc(p.email || "")}</small>` : ""}</span>`).join("")),
    logos: (a, body, ctx) => wrap("div", a, "c-logos", (ctx.site.logos || []).map((l) => `<img src="${esc(rootPath(l.src, ctx))}" alt="${esc(l.alt || "")}">`).join("")),
    page: (a, body, ctx) => wrap("span", a, "c-page", String(ctx.page || "")),
    questions: (a, body, ctx) => wrap("div", a, "c-questions", `<div class="qa-board" data-qa-board></div><div class="qa-fallback">${blocks(body, ctx)}</div>`),
    spacer: () => `<div class="c-spacer"></div>`,
  };
  const ICON = (name) => `<svg class="ic" aria-hidden="true" viewBox="0 0 48 48"><use href="assets/icons.svg#ic-${esc(name)}"/></svg>`;
  const rootPath = (p, ctx) => (/^(https?:|\/|data:)/.test(p) ? p : `${ctx.rootBase}${p}`);

  // How the editor offers a component in its palette
  const CATALOG = {
    figure: { label: "Figure", w: 900, h: 600, attrs: 'src="assets/fig/study-setup.jpg"' },
    plot: { label: "Plot", w: 900, h: 600, attrs: 'src="assets/fig/plot-terrain.svg"' },
    video: { label: "Video", w: 900, h: 500, attrs: 'src=""' },
    stat: { label: "Number", w: 420, h: 200, attrs: 'value="78.5%" label="Targets"' },
    quote: { label: "Quote", w: 700, h: 200, attrs: 'text="A quote." who="P1"' },
    magic: { label: "Magic Move", w: 800, h: 400, attrs: "steps" },
    qr: { label: "QR code", w: 240, h: 300, attrs: 'label="auto"' },
    authors: { label: "Authors", w: 900, h: 120, attrs: "" },
    logos: { label: "Logos", w: 700, h: 70, attrs: "" },
    page: { label: "Page number", w: 120, h: 40, attrs: "" },
  };

  // ---------------------------------------------------------------- layouts
  const COLORS = { ink: "var(--ink)", muted: "var(--muted)", faint: "var(--faint)", accent: "var(--accent)", paper: "var(--paper)", soft: "var(--soft)", line: "var(--line)", panel: "var(--panel)", you: "var(--you)", partner: "var(--partner)", both: "var(--both)", "you-tint": "var(--you-tint)", "partner-tint": "var(--partner-tint)", "both-tint": "var(--both-tint)", none: "transparent" };
  const FONTS = { body: "var(--font)", heading: "var(--font)" };
  const tok = (map, v) => map[v] ?? v;

  // Every look a region can have, as CSS. Anything else goes in `style`.
  function regionStyle(r) {
    const s = [`left:${r.x}px`, `top:${r.y}px`, `width:${r.w}px`, `height:${r.h}px`];
    if (r.font) s.push(`font-family:${tok(FONTS, r.font)}`);
    if (r.size) s.push(`font-size:${r.size}px`);
    if (r.weight) s.push(`font-weight:${r.weight}`);
    if (r.italic) s.push("font-style:italic");
    if (r.color) s.push(`color:${tok(COLORS, r.color)}`);
    if (r.line) s.push(`line-height:${r.line}`);
    if (r.tracking) s.push(`letter-spacing:${r.tracking}em`);
    if (r.align) s.push(`text-align:${r.align}`, `align-items:${{ left: "flex-start", center: "center", right: "flex-end" }[r.align] || "stretch"}`);
    if (r.valign) s.push(`justify-content:${{ top: "flex-start", middle: "center", bottom: "flex-end" }[r.valign] || "flex-start"}`);
    if (r.padding) s.push(`padding:${r.padding}px`);
    if (r.fill) s.push(`background:${tok(COLORS, r.fill)}`);
    if (r.radius) s.push(`border-radius:${r.radius}px`);
    if (r.border) s.push(`border:${r.borderWidth || 1}px solid ${tok(COLORS, r.border)}`);
    if (r.opacity != null && r.opacity !== "" && r.opacity !== 1) s.push(`opacity:${r.opacity}`);
    if (r.z) s.push(`z-index:${r.z}`);
    if (r.style) s.push(String(r.style).replace(/[<>]/g, ""));
    return s.join(";");
  }

  const fill = (t, ctx) => String(t).replace(/\{\{\s*([\w-]+)\s*\}\}/g, (_, k) => esc(ctx.meta[k] ?? ctx.site[k] ?? ""));

  function regionInner(r, slots, ctx) {
    switch (r.kind) {
      case "slot": {
        const v = slots[r.slot || r.id];
        if (v == null) return ctx.placeholders ? `<span class="r-placeholder">${esc(r.slot || r.id)}</span>` : "";
        return /^(title|subtitle)$/.test(r.slot) && !/\n/.test(v) ? `<div>${mdi(v)}</div>` : blocks(v, ctx);
      }
      case "text": return md(fill(r.text || "", ctx));
      case "image": return `<img src="${esc(r.src || "")}" alt="${esc(r.alt || "")}" style="object-fit:${esc(r.fit || "contain")}">`;
      case "component": return component(r.component, parseAttrs(fill(r.attrs || "", ctx)), r.body ? fill(r.body, ctx) : null, ctx);
      default: return "";
    }
  }

  function regionHTML(r, slots, ctx) {
    const empty = r.kind === "slot" && slots[r.slot || r.id] == null && !ctx.placeholders;
    if (empty) return "";
    const cls = `r r-${esc(r.kind || "shape")}${r.fill ? " r-fill" : ""}${r.step ? " fragment" : ""}`;
    const idx = r.step && r.step !== true ? ` data-fragment-index="${+r.step}"` : "";
    return `<div class="${cls}" data-region="${esc(r.id)}"${idx} style="${esc(regionStyle(r))}">${regionInner(r, slots, ctx)}</div>`;
  }

  function layoutHTML(layout, slots, ctx) { return (layout.regions || []).map((r) => regionHTML(r, slots, ctx)).join(""); }

  // a layout's own CSS; `&` stands for its slides
  function layoutCSS(layouts) {
    return Object.entries(layouts).map(([name, l]) => (l.css ? String(l.css).replace(/<\/?style/gi, "").replace(/&/g, `[data-layout="${name}"]`) : "")).filter(Boolean).join("\n");
  }

  // The markdown you write for a layout: shown in the editor, and used for new slides
  function layoutTemplate(name, layout) {
    const slots = (layout.regions || []).filter((r) => r.kind === "slot").map((r) => r.slot || r.id);
    const lines = ["---", "id: my-slide", `layout: ${name}`, "time: 30", "---", ""];
    if (slots.includes("title")) lines.push("# Title", "");
    if (slots.includes("subtitle")) lines.push("## Subtitle", "");
    slots.filter((s) => s !== "title" && s !== "subtitle").forEach((s) => lines.push(`::${s}::`, `Your ${s} here. Markdown or any component.`, ""));
    lines.push(":::notes", "What you say.", ":::");
    return lines.join("\n");
  }

  // ---------------------------------------------------------------- slides
  function settings(meta) {
    const q = String(meta.questions ?? "on").trim();
    return {
      title: meta.title || "Talk",
      url: meta.talk || meta.url || "",
      site: meta.site || "",
      live: meta.live || "",
      room: meta.room || "talk",
      follow: on(meta.follow ?? "on"),
      questions: /^https?:\/\//.test(q) ? "link" : on(q) ? "on" : "off",
      questionsUrl: /^https?:\/\//.test(q) ? q : "",
      duration: parseFloat(meta.duration || 0) || 0,
    };
  }

  // opts.layouts: the object from layouts.json; opts.rootBase: path from the page to the site root
  function render(src, opts = {}) {
    const layouts = opts.layouts || {};
    const site = window.SITE || {};
    const doc = split(src);
    const meta = { ...site, ...doc.meta };
    const set = settings({ site: site.url, ...meta });
    const ctx = { defs: {}, notesMd: "", site, meta, rootBase: opts.rootBase ?? "../" };
    blocks(doc.preamble, ctx); // picks up :::define blocks
    const used = new Set();
    let page = 0;

    const slides = doc.slides.map((s, idx) => {
      const sm = s.meta;
      const backup = on(sm.backup);
      if (!backup) page++;
      ctx.page = backup ? "" : page;
      const slots = slotsOf(s.lines.join("\n"), ctx);
      const notesMd = ctx.notesMd;
      const name = sm.layout || "default";
      const layout = layouts[name];
      const inner = layout ? layoutHTML(layout, slots, ctx) : `<div class="c-unknown">Unknown layout <code>${esc(name)}</code></div>`;
      let id = sm.id || slug(slots.title || "") || `slide-${idx + 1}`;
      while (used.has(id)) id += "-x";
      used.add(id);
      const title = sm.title || strip(mdi(slots.title || "")) || meta.title || `Slide ${idx + 1}`;
      const bg = layout && layout.background ? ` data-background-color="${esc(tok({ paper: "#ffffff", ink: "#1d1d1f" }, layout.background))}"` : "";
      const html = `<section id="${esc(id)}" data-layout="${esc(name)}" data-title="${esc(title)}"${bg}${sm.time ? ` data-timing="${parseFloat(sm.time)}"` : ""}${backup ? ' data-backup data-visibility="uncounted"' : ""}${sm.class ? ` class="${esc(sm.class)}"` : ""}>${inner}<aside class="notes">${renderNotes(notesMd)}</aside></section>`;
      return { id, title, layout: name, backup, time: parseFloat(sm.time) || 0, notesMd, clicks: countBuilds(html), html, slots };
    });
    return { meta, settings: set, slides, ctx, doc };
  }

  // builds on a slide: fragments without an index each add one, indexed ones share theirs
  function countBuilds(html) {
    const tags = html.match(/<[^>]+class="[^"]*\bfragment\b[^"]*"[^>]*>/g) || [];
    const fixed = new Set();
    let free = 0;
    tags.forEach((t) => { const m = t.match(/data-fragment-index="(\d+)"/); if (m) fixed.add(m[1]); else free++; });
    return free + fixed.size;
  }

  function renderNotes(text) { return md(text); }

  // ---------------------------------------------------------------- loading
  const runtimes = [];
  function loadScript(src) {
    return new Promise((res) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = res; document.head.appendChild(s); });
  }
  function loadCSS(href) { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = href; document.head.appendChild(l); }

  // Reads talk.md and layouts.json from `base`. opts.plugins loads talk.md's plugins too.
  async function load(base = "", opts = {}) {
    const [src, layouts] = await Promise.all([
      fetch(`${base}talk.md`, { cache: "no-cache" }).then((r) => r.text()),
      fetch(`${base}layouts.json`, { cache: "no-cache" }).then((r) => r.json()),
    ]);
    const first = split(src).meta;
    if (opts.plugins) {
      const names = String(first.plugins || "").split(/[\s,]+/).filter(Boolean);
      await Promise.all(names.map((n) => { loadCSS(`${base}plugins/${n}.css`); return loadScript(`${base}plugins/${n}.js`); }));
    }
    return { ...render(src, { layouts, rootBase: opts.rootBase }), src, layouts };
  }

  window.MDeck = {
    render, load, settings, parseAttrs, renderNotes, wrap, layoutHTML, regionHTML, regionStyle, layoutCSS, layoutTemplate,
    components: C, catalog: CATALOG, runtimes, split, slotsOf,
    component(name, fn, info) { C[name] = fn; if (info) CATALOG[name] = info; },
    runtime(r) { runtimes.push(r); },
  };
})();
