// MDeck — turns talk.md into reveal.js slides.
//
//   ---                      settings for the whole talk (title, url, questions: on|off|<url>, …)
//   ---
//   ---                      a slide: optional `key: value` lines between two `---`
//   id: hook
//   layout: content          title | section | photo | content | end
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

    // icon="…" puts a duotone icon (an #ic-… symbol in index.html) on top; cite="…" adds a source line
    card(a, body, ctx) {
      const label = a.label ? `<div class="label">${mdi(a.label)}</div>` : "", title = a.title ? `<h3>${mdi(a.title)}</h3>` : "";
      // with an icon, the icon and the first heading share a row
      const top = a.icon ? `<div class="c-top"><svg class="ic" aria-hidden="true"><use href="#ic-${esc(a.icon)}"/></svg>${label || title}</div>${label ? title : ""}` : label + title;
      let inner = top + blocks(body, ctx).join("") +
        (a.cite ? `<p class="cite">${mdi(a.cite)}</p>` : "");
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
      return wrap("blockquote", a, "c-quote tile", `<p>${text}</p>${a.who ? `<cite>${mdi(a.who)}</cite>` : ""}`);
    },

    steps(a, body) {
      const items = String(body || "").split("\n").map((l) => l.match(/^\s*(?:[-*]|\d+\.)\s+(.*)$/)).filter(Boolean).map((m) => m[1]);
      const tones = (a.tones || "").split(/[\s,]+/).filter(Boolean);
      const icons = (a.icons || "").split(/[\s,]+/).filter(Boolean);
      const cells = items.map((t, i) => {
        const m = t.match(/^\*\*(.+?)\*\*\s*[—–:-]?\s*(.*)$/);
        const title = m ? m[1] : t;
        let text = m ? m[2] : "";
        // a trailing {RQ1} becomes a label in the corner; {RQ1 | the question} adds its wording
        const tag = text.match(/\s*\{([^}|]+?)(?:\s*\|\s*([^}]+))?\}\s*$/);
        if (tag) text = text.slice(0, tag.index);
        const cls = `c-step tile${tones[i] ? ` tone-${esc(tones[i])}` : ""}${a.reveal ? " fragment rise" : ""}`;
        const top = icons[i] ? `<svg class="ic" aria-hidden="true"><use href="#ic-${esc(icons[i])}"/></svg>` : a.numbers ? `<span class="n">${String(i + 1).padStart(2, "0")}</span>` : "";
        return `<div class="${cls}">${top}<div class="st-body"><h3>${mdi(title)}</h3>${text ? `<p>${mdi(text)}</p>` : ""}${tag && tag[2] ? `<p class="st-rq">${mdi(tag[2])}</p>` : ""}</div>${tag ? `<span class="st-tag">${esc(tag[1])}</span>` : ""}</div>`;
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

    // a looping clip with its caption underneath: ::clip src poster title="…" caption="…" ratio=16/10
    clip: (a) => wrap("figure", a, "c-clip",
      `<div class="tile flush clip-v" style="aspect-ratio:${esc(a.ratio || "16/10")}"><div class="embed" data-video="${esc(a.src)}" data-poster="${esc(a.poster || "")}" data-label="${esc(strip(mdi(a.title || a.caption || "Recording")))}" data-quiet></div></div>` +
      `<figcaption>${a.title ? `<b>${mdi(a.title)}</b>` : ""}${a.caption ? `<span>${mdi(a.caption)}</span>` : ""}</figcaption>`),

    // the HeedVision demo, forked: two headsets side by side over one shared voxel store (js/hvdemo.js)
    live: (a) => wrap("div", a, "c-live",
      `<div class="hvd-panes">${["A", "B"].map((u, i) => `<div class="hvd-pane tile flush"><canvas data-user="${i}" aria-label="User ${u}'s headset: drag to move them, click the sphere to hide or show their voxels"></canvas><span class="who">User ${u}'s headset</span></div>`).join("")}</div>` +
      `<div class="live-bar"><span class="tag">${esc(a.tag || "Live")}</span><span class="hint">${mdi(a.hint || "Drag a view to move that person · click the sphere to hide or show their voxels")}</span><button type="button" data-act="reset">Reset</button></div>`,
      ` data-voxdemo data-stepper data-at="0"`),

    // what pair gain means: two people's finds as circles, overlapping less when gain is higher.
    // ::venn a=1.19 b=1.46 a-label="Cues off" b-label="Cues on"  (gain = finds together ÷ average member)
    venn(a) {
      const one = (g, label, cls) => {
        const o = Math.max(0, Math.min(1, 2 - num(g))); // share of each person's finds that the other also found, if both found as many
        const r = 60, d = lensDistance(o, r), cx = 110, id = `vn-${++vennId}`;
        return `<div class="venn ${cls}"><svg viewBox="0 0 220 140" aria-hidden="true"><defs><clipPath id="${id}"><circle cx="${cx - d / 2}" cy="70" r="${r}"/></clipPath></defs>` +
          `<circle cx="${cx - d / 2}" cy="70" r="${r}" class="v-you"/><circle cx="${cx + d / 2}" cy="70" r="${r}" class="v-partner"/><circle cx="${cx + d / 2}" cy="70" r="${r}" class="v-both" clip-path="url(#${id})"/></svg>` +
          `<div class="v-cap"><b>${esc(g)}×</b><span>${mdi(label)}</span><small>${Math.round(o * 100)}% of finds shared</small></div></div>`;
      };
      return wrap("div", a, "c-venn tile", `${a.label ? `<div class="label">${mdi(a.label)}</div>` : ""}<div class="venn-row">${one(a.a, a["a-label"] || "Without", "a")}${one(a.b, a["b-label"] || "With", "b")}</div>${a.note ? `<p class="v-note">${mdi(a.note)}</p>` : ""}`);
    },

    // line illustrations (ART below), drawn in the text colour
    art: (a) => wrap("figure", a, "c-art tile", `${ART[a.name] || ""}${a.caption ? `<figcaption>${mdi(a.caption)}</figcaption>` : ""}`),

    // explainer animations (see js/explain.js); `steps` walks through their phases
    bvh: (a) => wrap("div", a, "c-explain tile flush", `<canvas data-explain="bvh" aria-label="${esc(a.alt || "Animation: a bounding volume hierarchy voxelizes a chart and head rays collect attention")}"></canvas><span class="tag">${esc(a.tag || "Animation")}</span>${stepSpans(a, 2)}`, ' data-stepper data-at="0"'),
    hunt: (a) => wrap("div", a, "c-explain tile flush", `<canvas data-explain="hunt" aria-label="${esc(a.alt || "Animation: two people search for hidden targets that light up only up close")}"></canvas><span class="tag">${esc(a.tag || "Animation")}</span>${stepSpans(a, 3)}`, ' data-stepper data-at="0"'),
    hv: (a) => wrap("div", a, "c-explain tile flush", `<canvas data-explain="hv" aria-label="${esc(a.alt || "Animation: two people look at one shared voxelized sphere; voxels turn blue, orange or pink where they look")}"></canvas><span class="tag">${esc(a.tag || "Animation")}</span>${stepSpans(a, 1)}`, ' data-stepper data-at="0"'),

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
      return wrap("div", a, `c-ds${a.trigger === "none" ? " no-trig" : ""}`, `
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

  // distance between two circles of radius r whose overlap is share o of each circle's area
  let vennId = 0;
  function lensDistance(o, r) {
    const lens = (d) => 2 * r * r * Math.acos(d / (2 * r)) - (d / 2) * Math.sqrt(4 * r * r - d * d);
    let lo = 0, hi = 2 * r;
    for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (lens(mid) / (Math.PI * r * r) > o) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  }

  // Line illustrations: ink strokes on the page colour, one accent of tone.
  const ART = {
    // a pair splits a scatterplot into top and bottom, one half each
    split: `<svg viewBox="0 0 420 300" aria-hidden="true" class="ink">
      <defs><pattern id="art-hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><path d="M0 0v9" class="hair"/></pattern>
        <pattern id="art-dots" width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="5" cy="5" r="1.4" class="dotfill"/></pattern>
        <clipPath id="art-top"><rect x="0" y="0" width="420" height="152"/></clipPath><clipPath id="art-bot"><rect x="0" y="152" width="420" height="148"/></clipPath></defs>
      <circle cx="210" cy="152" r="86" class="paper"/>
      <circle cx="210" cy="152" r="86" fill="url(#art-hatch)" clip-path="url(#art-top)"/>
      <circle cx="210" cy="152" r="86" fill="url(#art-dots)" clip-path="url(#art-bot)"/>
      <circle cx="210" cy="152" r="86" class="line"/>
      <path d="M110 152H310" class="line dash"/>
      <g class="pts">${[[178,96],[236,88],[206,120],[160,130],[252,128],[226,104],[186,176],[240,170],[210,200],[166,190],[262,190],[198,224]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5"/>`).join("")}</g>
      <g transform="translate(58 118)"><path d="M-44 132c0-44 18-70 44-70s44 26 44 70" class="paper line"/><circle cx="0" cy="22" r="26" class="paper line"/><path d="M-6 6c8-12 30-12 32 8" class="line"/><rect x="2" y="12" width="32" height="18" rx="7" class="solid"/><path d="M26 82l56-46" class="line"/><circle cx="85" cy="33" r="7" class="paper line"/></g>
      <g transform="translate(362 136) scale(-1 1)"><path d="M-44 132c0-44 18-70 44-70s44 26 44 70" class="paper line"/><circle cx="0" cy="22" r="26" class="paper line"/><path d="M-22 4c10-10 34-8 40 6" class="line"/><rect x="2" y="12" width="32" height="18" rx="7" class="solid"/><path d="M26 90l60 18" class="line"/><circle cx="90" cy="110" r="7" class="paper line"/></g>
      <g transform="translate(150 22)"><path d="M0 16c0-9 8-16 18-16h44c10 0 18 7 18 16s-8 16-18 16H26l-12 10 2-10C7 30 0 24 0 16z" class="paper line"/><circle cx="26" cy="16" r="3" class="solid"/><circle cx="40" cy="16" r="3" class="solid"/><circle cx="54" cy="16" r="3" class="solid"/></g>
    </svg>`,
  };

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
  // "RQ2 · Record" → a running head: the marker, then the name
  function kicker(k) {
    const [a, ...b] = String(k).split("·").map((x) => x.trim());
    return `<div class="kicker">${b.length ? `<span class="k-a">${mdi(a)}</span><span class="k-b">${mdi(b.join(" · "))}</span>` : `<span class="k-b">${mdi(a)}</span>`}</div>`;
  }
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
        const photos = (m.photos || "").split(",").map((v) => v.trim());
        const authors = (m.authors || "").split(",").map((v, i) => `<span class="author">${photos[i] ? `<img src="${esc(photos[i])}" alt="">` : ""}<b>${esc(v.trim())}</b></span>`).join("");
        inner = `<canvas class="field" data-field="ambient" aria-hidden="true"></canvas><div class="tab tab-top" aria-hidden="true"></div>
          <div class="t-logos">${LOGOS("")}</div>
          <div class="title-panel"><div class="kicker">${esc(m.kicker || "")}</div><h1>${mdi(m.title)}</h1><p class="subtitle">${mdi(m.subtitle || "")}</p><div class="byline">${authors}</div></div>
          <div class="qr-card"><div class="qr" data-qr="talk"></div><p data-qr-label></p></div>
          <div class="event-line">${venue}</div>`;
      } else if (layout === "section") {
        // image: a photo behind the panel, tinted with the panel colour
        inner = `<div class="section-panel">${sm.image ? `<img class="sp-bg" src="${esc(sm.image)}" alt="">` : ""}<div class="sp-text"><h2>${mdi(headline)}</h2>${dek ? `<p>${mdi(dek)}</p>` : ""}</div><img class="vis-white" src="../shared/logos/vis2026.png" alt=""></div>`;
      } else if (layout === "photo") {
        // a full-bleed image with the headline over it; credit: a small source line
        inner = `<figure class="photo-panel">${sm.image ? `<img src="${esc(sm.image)}" alt="${esc(sm.alt || "")}">` : ""}</figure>
          <div class="photo-text">${headline ? `<h2>${mdi(headline)}</h2>` : ""}${dek ? `<p>${mdi(dek)}</p>` : ""}${sm.cite ? `<p class="photo-cite">${mdi(sm.cite)}</p>` : ""}</div>${sm.credit ? `<p class="photo-credit">${mdi(sm.credit)}</p>` : ""}${items.join("")}`;
      } else if (layout === "end") {
        inner = `<div class="end-panel"><h1>${mdi(headline || "Thank you")}</h1>${dek ? `<p class="dek">${mdi(dek)}</p>` : ""}<p class="talk-url" data-talk-url></p>
            <div class="end-qr"><div class="qr" data-qr="talk"></div></div><p class="contacts">${(m.contacts || "").split(";").map((c) => mdi(c.trim())).join("<br>")}</p></div>
          <div class="end-side">${items.join("")}</div><div class="end-logos">${LOGOS("")}</div><div class="tab tab-bottom" aria-hidden="true"></div>`;
      } else {
        const rows = sm.rows ? sm.rows.split(/[\s/,]+/).filter(Boolean).map((n) => (n === "auto" ? "auto" : `minmax(0,${parseFloat(n) || 1}fr)`)).join(" ") : "";
        const cols = (sm.columns || "1").split(/[\s/,]+/).filter(Boolean).map((n) => `${parseFloat(n) || 1}fr`).join(" ");
        // caveats are footnotes: they sit under the body, never inside its grid
        const notes = items.filter((x) => x.startsWith('<p class="c-caveat'));
        const body = items.filter((x) => !notes.includes(x));
        inner = `<div class="frame"><header class="s-head">${sm.kicker ? kicker(sm.kicker) : ""}${headline ? `<h2>${mdi(headline)}</h2>` : ""}${dek ? `<p class="dek">${mdi(dek)}</p>` : ""}</header>
          <div class="s-body${sm.align ? ` align-${esc(sm.align)}` : ""}" style="grid-template-columns:${cols}${rows ? `;grid-template-rows:${rows}` : ""}">${body.join("")}</div>${notes.length ? `<footer class="s-foot">${notes.join("")}</footer>` : ""}</div>`;
      }

      const cls = `layout-${layout}${["title", "section", "photo", "end"].includes(layout) ? " bleed" : ""}${sm.class ? ` ${esc(sm.class)}` : ""}`;
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
