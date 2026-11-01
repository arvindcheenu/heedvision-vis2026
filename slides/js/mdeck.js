// MDeck — turns talk.md into reveal.js slides.
//
//   ---                      settings for the whole talk (title, url, questions: on|off|<url>, …)
//   ---
//   ---                      a slide: optional `key: value` lines between two `---`
//   id: hook
//   layout: content          title | section | content | end
//   columns: 7 5             how the body is split (fractions)
//   ---
//   # Headline               the slide's message, as a sentence
//   ## Dek                   optional supporting line
//   :::card title="…" step   block component, closed by :::
//   ::stat value="70%" …     one-line component
//   :::notes                 what you say (speaker notes + transcript)
//
// Components are listed in MDeck.components. Define your own in the file with
//   :::define name  …markdown or HTML with {{attr}} and {{content}}…  :::
(function () {
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const md = (s) => (s && s.trim() ? marked.parse(s) : "");
  const mdi = (s) => (s ? marked.parseInline(String(s)) : "");
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
    if (a.step) { c += " fragment rise"; if (a.step !== true) d = ` data-fragment-index="${+a.step}"`; }
    if (a.wide) c += " wide";
    if (a.tall) c += " tall";
    if (a.tone) c += ` tone-${esc(a.tone)}`;
    if (a.class) c += ` ${esc(a.class)}`;
    return `<${tag} class="${c}"${d}${extra}>${inner}</${tag}>`;
  }
  const num = (v) => parseFloat(String(v).replace(/[^\d.\-−]/g, "").replace("−", "-"));
  // hidden build markers: `steps` adds n clicks, `steps=3` pins the first one to click 3
  const stepSpans = (a, n) => {
    if (!a.steps) return "";
    const from = a.steps !== true ? +a.steps : null;
    return Array.from({ length: n }, (_, i) => `<span class="fragment step"${from != null ? ` data-fragment-index="${from + i}"` : ""}></span>`).join("");
  };

  // ---------------------------------------------------------------- components
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

    // layout helpers
    stack: (a, body, ctx) => wrap("div", a, "c-stack", blocks(body, ctx).join("")),
    row: (a, body, ctx) => { const k = blocks(body, ctx); return wrap("div", a, "c-row", k.join(""), ` style="--n:${a.cols || k.length}"`); },
    cards: (a, body, ctx) => C.row(a, body, ctx),
    stats: (a, body, ctx) => C.row(a, body, ctx),

    card(a, body, ctx) {
      let inner = (a.label ? `<div class="label">${mdi(a.label)}</div>` : "") +
        (a.title ? `<h3>${mdi(a.title)}</h3>` : "") + blocks(body, ctx).join("");
      if (a.steps) inner = inner.replace(/<li>/g, '<li class="fragment rise">');
      return wrap("div", a, "c-card tile", inner);
    },

    stat: (a, body, ctx) => wrap("div", a, "c-stat tile",
      (a.label && a["label-first"] ? `<div class="l">${mdi(a.label)}</div>` : "") +
      `<div class="v">${esc(a.value)}</div>` +
      (a.label && !a["label-first"] ? `<div class="l">${mdi(a.label)}</div>` : "") +
      (a.sub ? `<div class="s">${mdi(a.sub)}</div>` : "") + blocks(body, ctx).join("")),

    compare(a) {
      const va = num(a.a), vb = num(a.b);
      const unit = a.unit ?? "%";
      const max = a.max ? num(a.max) : Math.max(va, vb) / 0.88;
      const row = (who, v, raw, cls) =>
        `<div class="cmp-row ${cls}"><span class="who">${mdi(who)}</span><div class="track"><i style="--w:${Math.max(0, Math.min(100, (v / max) * 100)).toFixed(1)}%"></i></div><b>${esc(raw)}${esc(unit)}</b></div>`;
      return wrap("div", a, "c-compare tile",
        `<div class="cmp-head"><span class="label">${mdi(a.label || "")}</span>${a.change ? `<span class="change">${esc(a.change)}</span>` : ""}</div>` +
        row(a["a-label"] || "Without", va, a.a, "a") + row(a["b-label"] || "With", vb, a.b, "b") +
        (a.note ? `<p class="cmp-note">${mdi(a.note)}</p>` : ""));
    },

    dots(a) {
      const of = Math.max(1, Math.min(100, parseInt(a.of || 10, 10)));
      const n = Math.max(0, Math.min(of, parseInt(a.n || 0, 10)));
      const d = Array.from({ length: of }, (_, i) => `<i class="${i < n ? "on" : ""}"></i>`).join("");
      return wrap("div", a, "c-dots tile",
        `<div class="v">${n}<span> of ${of}</span></div><div class="grid" style="--of:${of}">${d}</div>${a.label ? `<div class="l">${mdi(a.label)}</div>` : ""}`);
    },

    image: (a) => wrap("figure", a, `c-media tile fit-${esc(a.fit || "cover")}`,
      `<img src="${esc(a.src)}" alt="${esc(a.alt || "")}" loading="lazy">${a.caption ? `<figcaption>${mdi(a.caption)}</figcaption>` : ""}`),

    video: (a) => wrap("figure", a, "c-media tile",
      `<div class="embed" data-video="${esc(a.src)}" data-poster="${esc(a.poster || "")}" data-label="${esc(a.caption || "Recording")}"${a.live ? ` data-live="${esc(a.live)}"` : ""}${a.fit ? ` data-fit="${esc(a.fit)}"` : ""}></div>`),

    quote(a, body) {
      const text = body && body.trim() ? mdi(body.trim()) : mdi(a.text);
      return wrap("blockquote", a, "c-quote tile", `<p>“${text}”</p>${a.who ? `<cite>${mdi(a.who)}</cite>` : ""}`);
    },

    steps(a, body) {
      const items = String(body || "").split("\n").map((l) => l.match(/^\s*(?:[-*]|\d+\.)\s+(.*)$/)).filter(Boolean).map((m) => m[1]);
      const tones = (a.tones || "").split(/[\s,]+/).filter(Boolean);
      const cells = items.map((t, i) => {
        const m = t.match(/^\*\*(.+?)\*\*\s*[—–:-]?\s*(.*)$/);
        const title = m ? m[1] : t, text = m ? m[2] : "";
        const cls = `c-step tile${tones[i] ? ` tone-${esc(tones[i])}` : ""}${a.reveal ? " fragment rise" : ""}`;
        return `<div class="${cls}"><span class="n">${String(i + 1).padStart(2, "0")}</span><h3>${mdi(title)}</h3>${text ? `<p>${mdi(text)}</p>` : ""}</div>`;
      });
      return wrap("div", a, "c-row c-steps", cells.join(""), ` style="--n:${items.length}"`);
    },

    // stacked images that build one over the other: src="a.png, b.png" captions="A | B"
    layers(a) {
      const srcs = String(a.src || "").split(",").map((x) => x.trim()).filter(Boolean);
      const caps = String(a.captions || "").split("|").map((x) => x.trim());
      const imgs = srcs.map((src, i) => `<img class="layer" data-i="${i}" src="${esc(src)}" alt="${esc(i ? "" : a.alt || "")}" loading="lazy">`).join("");
      const legend = caps.some(Boolean) ? `<div class="layer-caps">${caps.map((c, i) => `<span data-i="${i}">${mdi(c)}</span>`).join("")}</div>` : "";
      return wrap("figure", a, `c-layers tile fit-${esc(a.fit || "contain")}`, `<div class="layer-box" style="--fade:${esc(a.fade || 0.85)}">${imgs}</div>${legend}${stepSpans(a, srcs.length - 1)}`, ' data-stepper data-at="0"');
    },

    // explainer animations (see js/explain.js); `steps` walks through their phases
    bvh: (a) => wrap("div", a, "c-explain tile flush", `<canvas data-explain="bvh" aria-label="${esc(a.alt || "Animation: a bounding volume hierarchy voxelizes a chart and head rays collect attention")}"></canvas><span class="tag">${esc(a.tag || "Animation")}</span>${stepSpans(a, 2)}`, ' data-stepper data-at="0"'),
    hunt: (a) => wrap("div", a, "c-explain tile flush", `<canvas data-explain="hunt" aria-label="${esc(a.alt || "Animation: two people search for hidden targets that light up only up close")}"></canvas><span class="tag">${esc(a.tag || "Animation")}</span>${stepSpans(a, 3)}`, ' data-stepper data-at="0"'),

    glyph: (a) => `<div class="c-glyph">${GLYPHS[a.type] || ""}</div>`,

    // modes are shown in the order given; `steps` moves to the next one on each
    // click (`steps=3` starts at fragment 3), `bare` hides the mode buttons.
    demo(a) {
      const all = { none: ["Nothing", "no one can see the trail"], count: ["Count", "how many people looked here"], sum: ["Sum", "how much attention in total"], max: ["Max", "the strongest single focus"], diff: ["Difference", "one person, or shared?"], who: ["Who", "blue you · orange partner · pink both"] };
      const modes = (a.modes || "count,sum,max,diff,who").split(/[\s,]+/).filter((m) => all[m]);
      const btn = modes.map((m, i) => `<button type="button" data-mode="${m}" aria-pressed="${i === 0}"><i data-swatch="${m}"></i><b>${all[m][0]}</b><span>${all[m][1]}</span></button>`).join("");
      const from = a.steps && a.steps !== true ? +a.steps : null;
      const steps = a.steps ? modes.slice(1).map((m, i) => `<span class="fragment step" data-mode="${m}"${from != null ? ` data-fragment-index="${from + i}"` : ""}></span>`).join("") : "";
      return wrap("div", a, `c-demo${a.bare ? " bare" : ""}${a.steps ? " stepped" : ""}${a.snapshot ? " snapshot" : ""}`,
        `<div class="tile flush"><canvas data-field="demo" aria-label="Simulation of two people's attention"></canvas><span class="tag">${esc(a.tag || "Simulation")}</span></div><div class="seg-ctl" role="group" aria-label="Aggregation">${btn}</div>${steps}`);
    },

    // highlight / done take one or more quadrant ids: world-embedded world-separated camera-embedded camera-separated
    designspace(a) {
      const list = (v) => String(v || "").split(/[\s,]+/).filter(Boolean);
      const hl = list(a.highlight || "world-embedded"), done = list(a.done);
      const q = (id, label, svg, f) => {
        const on = hl.includes(id), was = done.includes(id);
        const badge = on && a.badge ? a.badge : was && a["done-badge"] ? a["done-badge"] : "";
        return `<div class="tile quad${on ? " hv" : ""}${was ? " done" : ""}${a.steps ? ` fragment rise" data-fragment-index="${f}` : ""}"><span class="q-label">${label}</span>${badge ? `<span class="badge">${esc(badge)}</span>` : ""}${svg}</div>`;
      };
      const trig = (id, label, sub, icon) => `<div class="tile trig-item${id === (a.trigger || "explicit") ? " hv" : ""}"><svg><use href="#i-${icon}"/></svg><div><b>${label}</b><span>${sub}</span></div></div>`;
      return wrap("div", a, "c-ds", `
        <div></div><div class="axis-x">Embedded in the vis</div><div class="axis-x">Separate view</div><div class="axis-x${a.steps ? ' fragment rise" data-fragment-index="3' : ""}">Triggering</div>
        <div class="axis-y">World space</div>${q("world-embedded", "World · embedded", DS.we, 1)}${q("world-separated", "World · separated", DS.ws, 1)}
        <div class="trig${a.steps ? ' fragment rise" data-fragment-index="3' : ""}">${trig("always", "Always on", "risks Midas touch", "loop")}${trig("explicit", "Explicit", "you ask to see it", "hand")}${trig("implicit", "Implicit", "the system decides", "bolt")}</div>
        <div class="axis-y">Camera space</div>${q("camera-embedded", "Camera · embedded", DS.ce, 2)}${q("camera-separated", "Camera · separated", DS.cs, 2)}
        ${a.steps ? '<span class="fragment step" data-fragment-index="4" data-ds-pick></span>' : ""}`, a.steps ? "" : ' data-picked');
    },

    caveat: (a, body) => wrap("p", a, "c-caveat", mdi((body || a.text || "").trim())),
    qr: (a) => wrap("div", a, "c-qr", `<div class="qr" data-qr="talk"></div>${a.label ? `<p>${mdi(a.label)}</p>` : ""}`),
    logos: (a) => wrap("div", a, "c-logos", LOGOS(a.base || "")),
    questions: (a, body, ctx) => wrap("div", a, "c-questions tile",
      `<div class="label">${mdi(a.label || "Your questions, live")}</div><div class="qa-board" data-qa-board></div><div class="qa-fallback">${blocks(body, ctx).join("")}</div>`),
    spacer: () => `<div class="c-spacer"></div>`,
  };

  const LOGOS = (base) =>
    `<img class="logo-vis" src="${base}../shared/logos/vis2026.png" alt="IEEE VIS 2026">` +
    `<img class="logo-mono" src="${base}../shared/logos/au.svg" alt="Aarhus University">` +
    `<img class="logo-mono" src="${base}../shared/logos/ca3.svg" alt="Center for Anytime Anywhere Analytics">`;

  const GLYPHS = {
    joint: `<svg viewBox="0 0 300 170" aria-hidden="true"><use href="#i-eye" x="30" y="120" width="40" height="40" color="var(--you)"/><use href="#i-eye" x="230" y="120" width="40" height="40" color="var(--partner)"/><path d="M60 130L150 46M240 130L150 46" stroke="var(--glyph-line)" stroke-width="3" stroke-dasharray="6 8"/><circle cx="150" cy="42" r="34" fill="url(#g-blob)"/><circle cx="150" cy="42" r="9" fill="var(--both)"/></svg>`,
    distributed: `<svg viewBox="0 0 300 170" aria-hidden="true"><use href="#i-eye" x="30" y="120" width="40" height="40" color="var(--you)"/><use href="#i-eye" x="230" y="120" width="40" height="40" color="var(--partner)"/><path d="M55 122L60 46M245 122L240 46" stroke="var(--glyph-line)" stroke-width="3" stroke-dasharray="6 8"/><circle cx="60" cy="40" r="10" fill="var(--you)"/><circle cx="240" cy="40" r="10" fill="var(--partner)"/></svg>`,
    sequential: `<svg viewBox="0 0 300 170" aria-hidden="true"><circle cx="60" cy="86" r="12" fill="var(--you)"/><path d="M84 86H200" stroke="var(--glyph-line)" stroke-width="3"/><path d="M196 74l16 12-16 12" fill="none" stroke="var(--glyph-line)" stroke-width="3"/><circle cx="240" cy="86" r="12" fill="var(--partner)"/><text x="60" y="140" text-anchor="middle" fill="currentColor" opacity=".5" font-size="22">t₁</text><text x="240" y="140" text-anchor="middle" fill="currentColor" opacity=".5" font-size="22">t₂</text></svg>`,
    cumulative: `<svg viewBox="0 0 300 170" aria-hidden="true"><g transform="translate(38 16)">${[["you","you","both","partner",""],["you","both","partner","partner",""],["you","","","partner",""]].map((r, y) => r.map((c, x) => `<rect x="${x * 46}" y="${y * 46}" width="40" height="40" rx="8" fill="${c ? `var(--${c})` : "var(--dot-off)"}"/>`).join("")).join("")}</g></svg>`,
  };

  const person = (x, y) => `<use href="#i-person" x="${x}" y="${y}" width="80" height="90" color="var(--person)"/>`;
  const ray = (x1, y1, x2, y2) => `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="var(--glyph-line)" stroke-width="2.5" stroke-dasharray="5 7"/>`;
  const DS = {
    we: `<svg viewBox="0 0 400 240" aria-hidden="true"><circle cx="250" cy="120" r="78" fill="url(#g-sphere)"/><circle cx="232" cy="104" r="38" fill="url(#g-blob)"/>${ray(110, 176, 232, 104)}${person(62, 150)}</svg>`,
    ws: `<svg viewBox="0 0 400 240" aria-hidden="true"><circle cx="170" cy="110" r="70" fill="url(#g-sphere)"/>${ray(300, 172, 170, 110)}${person(262, 150)}<circle cx="358" cy="196" r="26" fill="url(#g-sphere)"/><circle cx="352" cy="190" r="16" fill="url(#g-blob)"/></svg>`,
    ce: `<svg viewBox="0 0 400 240" aria-hidden="true"><circle cx="250" cy="120" r="70" fill="url(#g-sphere)"/><path d="M170 50h150v150H170zM190 30h150v150" fill="none" stroke="var(--glyph-line)" stroke-width="2"/><path d="M170 50l20-20M320 50l20-20M320 200l20-20" stroke="var(--glyph-line)" stroke-width="2"/><ellipse cx="214" cy="120" rx="30" ry="38" fill="var(--glyph-fill)"/><circle cx="214" cy="120" r="22" fill="url(#g-blob)"/>${ray(110, 176, 214, 120)}${person(62, 150)}</svg>`,
    cs: `<svg viewBox="0 0 400 240" aria-hidden="true"><circle cx="160" cy="110" r="70" fill="url(#g-sphere)"/>${ray(270, 172, 160, 110)}${person(232, 150)}<path d="M318 120l60-16v86l-60 16z" fill="var(--dot-off)" stroke="var(--glyph-line)" stroke-width="2"/><circle cx="348" cy="156" r="18" fill="url(#g-blob)"/></svg>`,
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
      live: meta.live || "",
      room: meta.room || "talk",
      follow: on(meta.follow ?? "on"),
      questions: /^https?:\/\//.test(q) ? "link" : on(q) ? "on" : "off",
      questionsUrl: /^https?:\/\//.test(q) ? q : "",
      duration: parseFloat(meta.duration || 0) || 0,
    };
  }

  function render(src) {
    const doc = split(src);
    const ctx = { defs: {}, notes: [], notesMd: [], sections: 0, doc };
    blocks(doc.preamble, ctx); // picks up :::define blocks
    const m = doc.meta;
    const set = settings(m);
    let chapter = m.chapter || "";
    const used = new Set();

    const slides = doc.slides.map((s, idx) => {
      ctx.notesMd = [];
      const sm = s.meta;
      const layout = (sm.layout || "content").toLowerCase();
      const { headline, dek, rest } = takeHeadline(s.lines.join("\n"));
      const items = blocks(rest, ctx);
      chapter = sm.chapter || chapter;
      let id = sm.id || slug(headline) || `slide-${idx + 1}`;
      while (used.has(id)) id += "-x";
      used.add(id);
      const title = sm.title || strip(mdi(headline)) || (layout === "title" ? m.title : `Slide ${idx + 1}`);
      const notesMd = ctx.notesMd.join("\n\n");
      const notes = renderNotes(notesMd);
      const backup = on(sm.backup);
      let inner = "";

      if (layout === "title") {
        const venue = (m.venue || "").split("·").map((v) => esc(v.trim())).filter(Boolean).join("<i></i>");
        const authors = (m.authors || "").split(",").map((v, i) => (i === 0 ? `<b>${esc(v.trim())}</b>` : esc(v.trim()))).join(" &amp; ");
        inner = `<canvas class="field" data-field="ambient" aria-hidden="true"></canvas><div class="tab tab-top" aria-hidden="true"></div>
          <div class="t-logos">${LOGOS("")}</div>
          <div class="title-panel"><div class="kicker">${esc(m.kicker || "")}</div><h1>${mdi(m.title)}</h1><p class="subtitle">${mdi(m.subtitle || "")}</p><p class="byline">${authors}<span>${esc(m.affiliation || "")}</span></p></div>
          <div class="qr-card"><div class="qr" data-qr="talk"></div><p data-qr-label></p></div>
          <div class="event-line">${venue}</div>`;
      } else if (layout === "section") {
        ctx.sections++;
        inner = `<div class="section-panel"><div class="part">${String(ctx.sections).padStart(2, "0")}</div><h2>${mdi(headline)}</h2>${dek ? `<p>${mdi(dek)}</p>` : ""}<img class="vis-white" src="../shared/logos/vis2026.png" alt=""></div>`;
      } else if (layout === "end") {
        inner = `<div class="end-panel"><h1>${mdi(headline || "Thank you")}</h1>${dek ? `<p class="dek">${mdi(dek)}</p>` : ""}<p class="talk-url" data-talk-url></p>
            <div class="end-qr"><div class="qr" data-qr="talk"></div></div><p class="contacts">${(m.contacts || "").split(";").map((c) => mdi(c.trim())).join("<br>")}</p></div>
          <div class="end-side">${items.join("")}</div><div class="end-logos">${LOGOS("")}</div><div class="tab tab-bottom" aria-hidden="true"></div>`;
      } else {
        const rows = sm.rows ? sm.rows.split(/[\s/,]+/).filter(Boolean).map((n) => (n === "auto" ? "auto" : `minmax(0,${parseFloat(n) || 1}fr)`)).join(" ") : "";
        const cols = (sm.columns || "1").split(/[\s/,]+/).filter(Boolean).map((n) => `${parseFloat(n) || 1}fr`).join(" ");
        inner = `<div class="frame"><header class="s-head">${sm.kicker ? `<div class="kicker">${mdi(sm.kicker)}</div>` : ""}${headline ? `<h2>${mdi(headline)}</h2>` : ""}${dek ? `<p class="dek">${mdi(dek)}</p>` : ""}</header>
          <div class="s-body" style="grid-template-columns:${cols}${rows ? `;grid-template-rows:${rows}` : ""}">${items.join("")}</div></div>`;
      }

      const cls = `layout-${layout}${["title", "section", "end"].includes(layout) ? " bleed" : ""}${sm.class ? ` ${esc(sm.class)}` : ""}`;
      const html = `<section id="${esc(id)}" class="${cls}" data-chapter="${esc(chapter)}" data-title="${esc(title)}"${sm.time ? ` data-timing="${parseFloat(sm.time)}"` : ""}${sm.animate ? " data-auto-animate" : ""}${backup ? ' data-backup data-visibility="uncounted"' : ""}>${inner}<aside class="notes">${notes}</aside></section>`;
      return { id, title, chapter, layout, backup, time: parseFloat(sm.time) || 0, notes, notesMd, notesHash: hash(notesMd), clicks: countBuilds(html), html };
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

  // short stable hash, used to tell whether an edited note still matches talk.md
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(36);
  }

  // Replace one slide's :::notes block in the talk.md source (used when saving edits).
  function replaceNotes(src, id, text) {
    const lines = src.split("\n");
    const at = lines.findIndex((l) => l.trim() === `id: ${id}`);
    if (at < 0) return null;
    // the slide ends where the next slide's settings block starts
    let end = lines.findIndex((l, i) => i > at && /^id:\s/.test(l.trim()));
    if (end < 0) end = lines.length;
    else while (end > at && lines[end].trim() !== "---") end--;
    const open = lines.findIndex((l, i) => i > at && i < end && /^\s*:{3,}\s*notes\s*$/.test(l));
    const body = text.replace(/\s+$/, "");
    if (open < 0) { lines.splice(end, 0, ":::notes", body, ":::", ""); return lines.join("\n"); }
    let close = open + 1;
    while (close < end && !/^\s*:{3,}\s*$/.test(lines[close])) close++;
    lines.splice(open + 1, close - open - 1, body);
    return lines.join("\n");
  }

  window.MDeck = { render, settings, components: C, parseAttrs, renderNotes, replaceNotes, hash };
})();
