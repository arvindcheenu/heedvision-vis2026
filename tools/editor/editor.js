// Visual layout designer. Draw a layout by dragging regions onto the page; the result is
// plain data in slides/layouts.json, and from then on slides that use it are plain markdown
// in slides/talk.md. Loaded only after the dev server has recognized this browser.
(async function () {
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const SNAP = 12;

  const talk0 = await MDeck.load("/slides/", { plugins: true, rootBase: "/" });
  let talkSrc = talk0.src;
  let layouts = clone(talk0.layouts);
  let talk = talk0;
  let cur = Object.keys(layouts).find((k) => k[0] !== "$");
  let sel = null, preview = "", dirty = false, talkDirty = false, mode = "layouts";
  const renames = {};
  const undo = [], redo = [];

  document.body.innerHTML = `
    <div class="ed">
      <header class="ed-top">
        <button class="btn tab" data-tab="layouts">Layouts</button>
        <button class="btn tab" data-tab="markdown">Markdown</button>
        <button class="btn" data-act="undo" title="Undo (⌘Z)">Undo</button>
        <button class="btn" data-act="redo" title="Redo (⇧⌘Z)">Redo</button>
        <span class="state"></span>
        <span data-theme-picker></span>
        <a class="btn" href="/slides/" target="_blank" rel="noopener">Open slides</a>
        <button class="btn accent" data-act="save" title="Save (⌘S)">Save</button>
      </header>
      <aside class="ed-left"></aside>
      <section class="ed-text">
        <div class="bar"><span>Add a slide:</span><span class="inserts"></span></div>
        <textarea spellcheck="false" aria-label="talk.md"></textarea>
      </section>
      <main class="ed-mid">
        <div class="stage-wrap"><div class="stage"><div class="canvas"></div><div class="sel" hidden><span class="tag"></span></div></div></div>
        <label class="preview-pick">Preview with <select></select></label>
      </main>
      <aside class="ed-right"></aside>
    </div>`;
  const $ = (s) => document.querySelector(s);
  const ed = $(".ed"), left = $(".ed-left"), right = $(".ed-right"), mid = $(".ed-mid"), stage = $(".stage"), wrap = $(".stage-wrap"), page = $(".canvas"), selBox = $(".sel"), stateEl = $(".state"), textEl = $(".ed-text textarea"), pick = $(".preview-pick select");
  const style = document.createElement("style");
  document.head.appendChild(style);
  HVTheme.mountAll();

  // ---------------------------------------------------------- helpers
  const layout = () => layouts[cur];
  const region = (id = sel) => layout()?.regions.find((r) => r.id === id);
  const names = () => Object.keys(layouts).filter((k) => k[0] !== "$");
  const usage = (name) => talk.slides.filter((s) => s.layout === name).length;
  const uniqueId = (base) => { let id = base, n = 2; while (layout().regions.some((r) => r.id === id)) id = `${base}-${n++}`; return id; };
  const uniqueName = (base) => { let id = base, n = 2; while (layouts[id]) id = `${base}-${n++}`; return id; };
  const ctx = () => ({ ...talk.ctx, placeholders: true, page: 1 });

  // canvases draw a still, so what you place is what you see
  function hydrate(root) {
    MDeck.runtimes.forEach((rt) => {
      if (rt.selector.includes("voxdemo")) return;
      root.querySelectorAll(rt.selector).forEach(async (el) => { try { const i = await rt.mount(el, { scale: () => 1 }); if (i.sync) i.sync(true); } catch {} });
    });
    root.querySelectorAll("[data-plot]").forEach(async (el) => { el.innerHTML = await fetch(el.dataset.plot).then((r) => r.text()).catch(() => ""); });
    root.querySelectorAll("[data-qr]").forEach((el) => { const q = qrcode(0, "M"); q.addData(window.SITE?.url || "https://example.com"); q.make(); el.innerHTML = q.createSvgTag({ cellSize: 4, margin: 0, scalable: true }); });
    root.querySelectorAll("[data-qr-label]").forEach((el) => (el.textContent = "Slides and script"));
  }

  function commit() {
    undo.push(JSON.stringify({ layouts: lastGood, cur }));
    if (undo.length > 200) undo.shift();
    redo.length = 0;
    lastGood = clone(layouts);
    setDirty(true);
    draw();
  }
  let lastGood = clone(layouts);
  function restore(from, to) {
    const snap = from.pop();
    if (!snap) return;
    to.push(JSON.stringify({ layouts, cur }));
    const s = JSON.parse(snap);
    layouts = s.layouts; cur = s.cur; lastGood = clone(layouts);
    if (!region()) sel = null;
    setDirty(true);
    draw();
  }
  function setDirty(on, msg) {
    dirty = on;
    stateEl.textContent = msg || (dirty || talkDirty ? "Unsaved" : "Saved");
    stateEl.classList.toggle("err", /fail|can't|must|bad/i.test(msg || ""));
  }
  addEventListener("beforeunload", (e) => { if (dirty || talkDirty) e.preventDefault(); });

  // ---------------------------------------------------------- saving
  // one region per line, so layouts.json stays readable and diffs stay small
  function pretty(all) {
    const field = ([k, v]) => (k === "regions"
      ? `    "regions": [\n${v.map((r) => `      ${JSON.stringify(r)}`).join(",\n")}\n    ]`
      : `    ${JSON.stringify(k)}: ${JSON.stringify(v)}`);
    return `{\n${Object.entries(all).map(([k, l]) => `  ${JSON.stringify(k)}: {\n${Object.entries(l).map(field).join(",\n")}\n  }`).join(",\n")}\n}\n`;
  }
  async function put(path, body) {
    const r = await fetch(`/__dev/file?path=${encodeURIComponent(path)}`, { method: "PUT", body, headers: { "X-HV-Dev": "1", "Content-Type": "text/plain" } });
    if (!r.ok) throw new Error((await r.text()) || `Save failed (${r.status})`);
  }
  async function save() {
    try {
      if (talkDirty || Object.keys(renames).length) {
        let src = talkSrc;
        for (const [a, b] of Object.entries(renames)) src = src.replace(new RegExp(`^(layout:\\s*)${a}(\\s*)$`, "gm"), `$1${b}$2`);
        await put("slides/talk.md", src);
        if (src !== talkSrc && mode === "markdown") textEl.value = src;
        talkSrc = src;
        Object.keys(renames).forEach((k) => delete renames[k]);
        talkDirty = false;
      }
      if (dirty) await put("slides/layouts.json", pretty(layouts));
      dirty = false;
      refreshTalk();
      setDirty(false);
      draw();
    } catch (e) { setDirty(dirty, `Save failed: ${e.message}`); }
  }

  function refreshTalk() {
    try { const t = MDeck.render(talkSrc, { layouts, rootBase: "/" }); talk = { ...t, layouts }; } catch (e) { console.warn(e); }
  }

  // ---------------------------------------------------------- canvas
  function fit() {
    const b = mid.getBoundingClientRect();
    if (b.width < 100 || b.height < 100) return; // not on screen yet
    const k = Math.min((b.width - 48) / 1920, (b.height - 72) / 1080);
    wrap.style.transform = `scale(${k})`;
    wrap.dataset.k = k;
  }
  new ResizeObserver(fit).observe(mid);
  const K = () => +wrap.dataset.k || 1;
  const toPage = (e) => { const r = stage.getBoundingClientRect(); return { x: (e.clientX - r.left) / K(), y: (e.clientY - r.top) / K() }; };

  function slotsFor() {
    if (mode === "markdown") return talk.slides.find((s) => s.id === preview)?.slots || {};
    return preview ? talk.slides.find((s) => s.id === preview)?.slots || {} : {};
  }

  function drawPage() {
    style.textContent = MDeck.layoutCSS(layouts);
    const c = ctx();
    let l = layout();
    if (mode === "markdown") {
      const sl = talk.slides.find((s) => s.id === preview) || talk.slides[0];
      l = sl ? layouts[sl.layout] || { regions: [] } : { regions: [] };
      c.placeholders = false;
      stage.setAttribute("data-layout", sl ? sl.layout : "");
      page.innerHTML = MDeck.layoutHTML(l, sl ? sl.slots : {}, c);
    } else {
      stage.setAttribute("data-layout", cur);
      page.style.background = l?.background || "";
      page.innerHTML = l ? MDeck.layoutHTML(l, slotsFor(), c) : "";
    }
    stage.classList.toggle("previewing", !!preview || mode === "markdown");
    hydrate(page);
    drawSel();
  }
  function drawSel() {
    const r = mode === "layouts" ? region() : null;
    selBox.hidden = !r;
    if (!r) return;
    Object.assign(selBox.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` });
    selBox.querySelector(".tag").textContent = r.kind === "slot" ? `::${r.slot || r.id}::` : r.id;
    if (!selBox.querySelector("i")) {
      selBox.insertAdjacentHTML("beforeend", ["nw", "n", "ne", "e", "se", "s", "sw", "w"].map((h) => `<i data-h="${h}" style="cursor:${h}-resize"></i>`).join(""));
    }
    selBox.querySelectorAll("i").forEach((i) => {
      const h = i.dataset.h;
      i.style.left = h.includes("w") ? "0" : h.includes("e") ? "100%" : "50%";
      i.style.top = h.includes("n") ? "0" : h.includes("s") ? "100%" : "50%";
    });
  }

  // snap to the grid and to other regions' edges and centres
  function snapper(self) {
    const xs = [0, 960, 1920, 120, 1800], ys = [0, 540, 1080];
    layout().regions.forEach((r) => { if (r.id !== self) { xs.push(r.x, r.x + r.w, r.x + r.w / 2); ys.push(r.y, r.y + r.h, r.y + r.h / 2); } });
    return (v, list) => {
      let best = null, d = 10 / Math.max(K(), 0.3);
      for (const c of list) if (Math.abs(c - v) < d) { d = Math.abs(c - v); best = c; }
      return best;
    };
  }
  function guides(list) {
    stage.querySelectorAll(".guide").forEach((g) => g.remove());
    list.forEach(([axis, v]) => {
      const g = document.createElement("div");
      g.className = "guide";
      g.style.cssText = axis === "x" ? `left:${v - 1}px;top:0;width:2px;height:1080px` : `top:${v - 1}px;left:0;height:2px;width:1920px`;
      stage.appendChild(g);
    });
  }
  const grid = (v) => Math.round(v / SNAP) * SNAP;

  stage.addEventListener("pointerdown", (e) => {
    if (mode !== "layouts") return;
    const handle = e.target.closest("i[data-h]");
    const el = e.target.closest("[data-region]");
    if (!handle && !el) { sel = null; draw(); return; }
    if (!handle) { sel = el.dataset.region; drawSel(); drawRight(); }
    const r = region();
    if (!r) return;
    const start = toPage(e), o = { x: r.x, y: r.y, w: r.w, h: r.h }, snap = snapper(r.id);
    const xs = [0, 960, 1920, 120, 1800], ys = [0, 540, 1080];
    layout().regions.forEach((q) => { if (q.id !== r.id) { xs.push(q.x, q.x + q.w, q.x + q.w / 2); ys.push(q.y, q.y + q.h, q.y + q.h / 2); } });
    let moved = false;
    stage.setPointerCapture(e.pointerId);
    const move = (ev) => {
      const p = toPage(ev), dx = p.x - start.x, dy = p.y - start.y;
      if (!moved && Math.hypot(dx, dy) < 4 / K()) return;
      moved = true;
      const free = ev.altKey, marks = [];
      if (handle) {
        const h = handle.dataset.h;
        let x1 = o.x, y1 = o.y, x2 = o.x + o.w, y2 = o.y + o.h;
        const edge = (v, list, axis) => { if (free) return v; const s = snap(v, list); if (s != null) { marks.push([axis, s]); return s; } return grid(v); };
        if (h.includes("w")) x1 = edge(o.x + dx, xs, "x");
        if (h.includes("e")) x2 = edge(o.x + o.w + dx, xs, "x");
        if (h.includes("n")) y1 = edge(o.y + dy, ys, "y");
        if (h.includes("s")) y2 = edge(o.y + o.h + dy, ys, "y");
        r.x = Math.min(x1, x2 - 12); r.y = Math.min(y1, y2 - 12);
        r.w = Math.max(12, x2 - x1); r.h = Math.max(12, y2 - y1);
      } else {
        const place = (v, size, list, axis) => {
          if (free) return v;
          for (const [off] of [[0], [size / 2], [size]]) { const s = snap(v + off, list); if (s != null) { marks.push([axis, s]); return s - off; } }
          return grid(v);
        };
        r.x = Math.round(place(o.x + dx, o.w, xs, "x"));
        r.y = Math.round(place(o.y + dy, o.h, ys, "y"));
      }
      guides(marks);
      const live = page.querySelector(`[data-region="${CSS.escape(r.id)}"]`);
      if (live) live.setAttribute("style", MDeck.regionStyle(r));
      drawSel();
      syncNums();
    };
    const up = () => {
      stage.removeEventListener("pointermove", move);
      guides([]);
      if (moved) commit();
    };
    stage.addEventListener("pointermove", move);
    stage.addEventListener("pointerup", up, { once: true });
    stage.addEventListener("pointercancel", up, { once: true });
  });
  stage.addEventListener("dblclick", (e) => { if (e.target.closest("[data-region]")) right.querySelector("[data-focus]")?.focus(); });

  // drag from the palette
  const blocks = () => layouts.$blocks || {};
  function template(key) {
    const [type, name] = key.split(":");
    if (type === "slot") return { title: { kind: "slot", slot: "title", w: 1792, h: 110, size: 72, weight: 500, tracking: -0.022, line: 1.1, color: "muted" }, subtitle: { kind: "slot", slot: "subtitle", w: 1792, h: 70, size: 44, color: "muted" }, body: { kind: "slot", slot: "body", w: 840, h: 480, size: 44, line: 1.22, color: "muted" } }[name];
    if (type === "text") return { kind: "text", text: "Text", w: 720, h: 120, size: 36 };
    if (type === "image") return { kind: "image", src: "assets/fig/study-setup.jpg", fit: "contain", w: 840, h: 480 };
    if (type === "shape") return { kind: "shape", fill: "panel", radius: 32, w: 480, h: 240 };
    if (type === "line") return { kind: "shape", fill: "line", w: 840, h: 2 };
    if (type === "comp") { const c = MDeck.catalog[name] || {}; return { kind: "component", component: name, attrs: c.attrs || "", w: c.w || 600, h: c.h || 300 }; }
    if (type === "def") return { kind: "component", component: name, attrs: "", w: 840, h: 480 };
    if (type === "block") return clone(blocks()[name]);
    return null;
  }
  function addRegion(key, cx, cy) {
    const t = template(key);
    if (!t || !layout()) return;
    const base = t.slot || t.component || t.kind;
    const r = { id: uniqueId(base), ...t, x: 0, y: 0 };
    if (r.slot && layout().regions.some((q) => q.slot === r.slot)) r.slot = r.id;
    r.x = grid(Math.max(0, Math.min(1920 - r.w, (cx ?? 960) - r.w / 2)));
    r.y = grid(Math.max(0, Math.min(1080 - r.h, (cy ?? 540) - r.h / 2)));
    layout().regions.push(r);
    sel = r.id;
    commit();
  }
  let dragKey = null, ghost = null;
  left.addEventListener("dragstart", (e) => { const p = e.target.closest("[data-pal]"); if (!p) return; dragKey = p.dataset.pal; e.dataTransfer.setData("text/plain", dragKey); e.dataTransfer.effectAllowed = "copy"; });
  mid.addEventListener("dragover", (e) => {
    if (!dragKey) return;
    e.preventDefault();
    const t = template(dragKey), p = toPage(e);
    if (!ghost) { ghost = document.createElement("div"); ghost.className = "drop-ghost"; stage.appendChild(ghost); }
    Object.assign(ghost.style, { left: `${grid(p.x - t.w / 2)}px`, top: `${grid(p.y - t.h / 2)}px`, width: `${t.w}px`, height: `${t.h}px` });
  });
  const clearGhost = () => { ghost?.remove(); ghost = null; };
  mid.addEventListener("dragleave", (e) => { if (!mid.contains(e.relatedTarget)) clearGhost(); });
  mid.addEventListener("drop", (e) => { e.preventDefault(); clearGhost(); if (dragKey) { const p = toPage(e); addRegion(dragKey, p.x, p.y); } dragKey = null; });
  addEventListener("dragend", () => { clearGhost(); dragKey = null; });

  // ---------------------------------------------------------- left: layouts and palette
  function thumb(name) {
    return `<span class="thumb" data-layout="${esc(name)}"><span class="canvas" style="display:block">${MDeck.layoutHTML(layouts[name], {}, ctx())}</span></span>`;
  }
  function drawLeft() {
    const pal = (key, label) => `<div class="pal" draggable="true" data-pal="${esc(key)}" role="button" tabindex="0" title="Drag onto the page, or click to add">${esc(label)}</div>`;
    const defs = Object.keys(talk.ctx.defs || {});
    const blk = Object.keys(blocks());
    left.innerHTML = `
      <div class="ed-head"><span>Layouts</span><span><button class="btn" data-act="new" style="padding:0 6px">New</button></span></div>
      ${names().map((n) => `<button class="lay" data-lay="${esc(n)}" aria-current="${n === cur}">${thumb(n)}<span>${esc(layouts[n].label || n)}</span><small>${usage(n) || ""}</small></button>`).join("")}
      <div class="ed-head"><span>Slots, filled from markdown</span></div>
      ${pal("slot:title", "Title")}${pal("slot:subtitle", "Subtitle")}${pal("slot:body", "Content")}
      <div class="ed-head"><span>Fixed</span></div>
      ${pal("text:", "Text")}${pal("image:", "Image")}${pal("shape:", "Shape")}${pal("line:", "Line")}
      <div class="ed-head"><span>Components</span></div>
      ${Object.entries(MDeck.catalog).map(([k, c]) => pal(`comp:${k}`, c.label || k)).join("")}
      ${defs.length ? `<div class="ed-head"><span>Defined in talk.md</span></div>${defs.map((k) => pal(`def:${k}`, k)).join("")}` : ""}
      ${blk.length ? `<div class="ed-head"><span>Your blocks</span></div>${blk.map((k) => pal(`block:${k}`, k)).join("")}` : ""}`;
    hydrate(left);
  }
  left.addEventListener("click", (e) => {
    const l = e.target.closest("[data-lay]");
    if (l) { cur = l.dataset.lay; sel = null; draw(); return; }
    const p = e.target.closest("[data-pal]");
    if (p) addRegion(p.dataset.pal);
    if (e.target.closest('[data-act="new"]')) {
      const name = uniqueName("untitled");
      layouts[name] = { label: "Untitled", regions: [] };
      cur = name; sel = null;
      commit();
    }
  });

  // ---------------------------------------------------------- right: inspector
  const COLORS = [["", "Default"], ["ink", "Ink"], ["muted", "Muted"], ["faint", "Faint"], ["accent", "Accent"], ["paper", "Paper"], ["panel", "Panel"], ["line", "Line"], ["you", "Blue"], ["partner", "Orange"], ["both", "Pink"], ["you-tint", "Blue tint"], ["partner-tint", "Orange tint"], ["both-tint", "Pink tint"]];
  const pickOr = (opts, v) => { const known = opts.some(([k]) => k === (v ?? "")); return opts.map(([k, l]) => `<option value="${k}" ${k === (v ?? "") ? "selected" : ""}>${l}</option>`).join("") + (known ? "" : `<option selected value="${esc(v)}">${esc(v)}</option>`); };
  const fld = (label, html) => `<label class="fld"><span>${label}</span>${html}</label>`;
  const input = (k, v, type = "text", extra = "") => `<input data-k="${k}" type="${type}" value="${esc(v ?? "")}" ${extra}>`;
  const seg = (k, opts, v) => `<div class="seg">${opts.map(([val, l]) => `<button type="button" data-seg="${k}" data-v="${val}" aria-pressed="${(v || "") === val}">${l}</button>`).join("")}</div>`;

  function snippet() { return MDeck.layoutTemplate(cur, layout()); }
  function drawRight() {
    if (!layout()) { right.innerHTML = ""; return; }
    const r = region();
    if (!r) {
      const l = layout(), used = usage(cur);
      right.innerHTML = `
        <div class="ins-title"><span>Layout</span></div>
        ${fld("Label", input("l.label", l.label))}
        ${fld("Name", `<input data-rename value="${esc(cur)}">`)}
        ${fld("Background", input("l.background", l.background, "text", 'placeholder="#ffffff"'))}
        ${fld("CSS", `<textarea data-k="l.css" placeholder="& h2 { … }  (& is this layout)">${esc(l.css || "")}</textarea>`)}
        <div class="actions">
          <button class="btn" data-act="dup-layout">Duplicate</button>
          <button class="btn danger" data-act="del-layout" ${used ? `disabled title="Used by ${used} slide(s)"` : ""}>Delete</button>
        </div>
        <hr>
        <div class="ins-title"><span>Use it in talk.md</span><button class="btn" data-act="copy" style="padding:0 6px">Copy</button></div>
        <pre class="snippet">${esc(snippet())}</pre>`;
      return;
    }
    const text = r.kind === "text" || r.kind === "slot" || r.kind === "component";
    const kinds = { slot: "Slot", text: "Text", image: "Image", shape: "Shape", component: "Component" };
    right.innerHTML = `
      <div class="ins-title"><span>${kinds[r.kind] || r.kind}</span></div>
      ${r.kind === "slot" ? fld("Slot", input("slot", r.slot || r.id, "text", "data-focus")) : ""}
      ${r.kind === "text" ? `<textarea class="full" data-k="text" data-focus placeholder="Markdown; {{title}} and friends come from your config">${esc(r.text || "")}</textarea>` : ""}
      ${r.kind === "image" ? fld("Source", input("src", r.src, "text", "data-focus")) + fld("Alt", input("alt", r.alt)) + fld("Fit", `<select data-k="fit">${pickOr([["contain", "Contain"], ["cover", "Cover"], ["fill", "Stretch"]], r.fit || "contain")}</select>`) : ""}
      ${r.kind === "component" ? fld("Component", `<select data-k="component">${pickOr([...Object.keys(MDeck.catalog), ...Object.keys(talk.ctx.defs || {})].map((k) => [k, k]), r.component)}</select>`) + fld("Attributes", input("attrs", r.attrs, "text", "data-focus")) : ""}
      <div class="ins-title"><span>Position</span></div>
      <div class="nums">${["x", "y", "w", "h"].map((k) => `<label>${k.toUpperCase()}<input data-k="${k}" data-num type="number" value="${r[k]}"></label>`).join("")}</div>
      ${text ? `<div class="ins-title"><span>Type</span></div>
      <div class="nums"><label>Sz<input data-k="size" data-num type="number" value="${r.size ?? ""}"></label><label>Wt<input data-k="weight" data-num type="number" step="100" value="${r.weight ?? ""}"></label><label>Ln<input data-k="line" data-num type="number" step="0.05" value="${r.line ?? ""}"></label><label>Tr<input data-k="tracking" data-num type="number" step="0.005" value="${r.tracking ?? ""}"></label></div>
      ${fld("Colour", `<select data-k="color">${pickOr(COLORS, r.color)}</select>`)}
      ${fld("Align", seg("align", [["left", "Left"], ["center", "Mid"], ["right", "Right"]], r.align || "left"))}
      ${fld("Vertical", seg("valign", [["top", "Top"], ["middle", "Mid"], ["bottom", "Base"]], r.valign || "top"))}` : ""}
      <div class="ins-title"><span>Box</span></div>
      ${fld("Fill", `<select data-k="fill">${pickOr([["", "None"], ...COLORS.slice(1)], r.fill)}</select>`)}
      ${fld("Border", `<select data-k="border">${pickOr([["", "None"], ...COLORS.slice(1)], r.border)}</select>`)}
      <div class="nums"><label>Rd<input data-k="radius" data-num type="number" value="${r.radius ?? ""}"></label><label>Pd<input data-k="padding" data-num type="number" value="${r.padding ?? ""}"></label><label>Op<input data-k="opacity" data-num type="number" step="0.05" min="0" max="1" value="${r.opacity ?? ""}"></label><label>Z<input data-k="z" data-num type="number" value="${r.z ?? ""}"></label></div>
      ${fld("Appears", `<select data-k="step">${pickOr([["", "With the slide"], ["1", "Click 1"], ["2", "Click 2"], ["3", "Click 3"]], r.step == null ? "" : String(r.step))}</select>`)}
      ${fld("CSS", `<textarea data-k="style" placeholder="any CSS declarations">${esc(r.style || "")}</textarea>`)}
      <hr>
      <div class="actions">
        <button class="btn" data-act="front">To front</button><button class="btn" data-act="back">To back</button>
        <button class="btn" data-act="dup">Duplicate</button><button class="btn" data-act="block">Save as block</button>
        <button class="btn danger" data-act="del">Delete</button>
      </div>`;
  }
  function syncNums() {
    const r = region();
    if (!r) return;
    ["x", "y", "w", "h"].forEach((k) => { const i = right.querySelector(`input[data-k="${k}"]`); if (i && document.activeElement !== i) i.value = r[k]; });
  }
  right.addEventListener("input", (e) => {
    const el = e.target;
    if (el.dataset.rename != null) return;
    const k = el.dataset.k;
    if (!k) return;
    if (k.startsWith("l.")) { const key = k.slice(2); if (el.value) layout()[key] = el.value; else delete layout()[key]; }
    else {
      const r = region();
      if (!r) return;
      const v = el.dataset.num != null ? (el.value === "" ? "" : +el.value) : el.value;
      if (v === "" && !["x", "y", "w", "h"].includes(k)) delete r[k]; else if (v !== "") r[k] = v;
    }
    lastGoodPending = true;
    setDirty(true);
    drawPage();
    drawLeft();
    if (right.querySelector(".snippet")) right.querySelector(".snippet").textContent = snippet();
  });
  let lastGoodPending = false;
  right.addEventListener("change", () => { if (lastGoodPending) { lastGoodPending = false; undo.push(JSON.stringify({ layouts: lastGood, cur })); redo.length = 0; lastGood = clone(layouts); } });
  right.addEventListener("change", (e) => {
    const el = e.target;
    if (el.dataset.rename == null) return;
    const name = el.value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
    if (!name || name === cur) { el.value = cur; return; }
    if (layouts[name]) { setDirty(dirty, "That name must be unique"); el.value = cur; return; }
    layouts[name] = layouts[cur];
    delete layouts[cur];
    if (usage(cur)) { renames[cur] = name; }
    cur = name;
    commit();
  });
  right.addEventListener("click", (e) => {
    const s = e.target.closest("[data-seg]");
    if (s) { const r = region(); if (r) { r[s.dataset.seg] = s.dataset.v; commit(); } return; }
    const a = e.target.closest("[data-act]")?.dataset.act;
    const r = region();
    if (a === "del" && r) { layout().regions = layout().regions.filter((q) => q !== r); sel = null; commit(); }
    if (a === "dup" && r) dup(r);
    if (a === "front" && r) { const l = layout().regions; l.push(l.splice(l.indexOf(r), 1)[0]); commit(); }
    if (a === "back" && r) { const l = layout().regions; l.unshift(l.splice(l.indexOf(r), 1)[0]); commit(); }
    if (a === "block" && r) {
      const name = r.id;
      const { x, y, id, ...rest } = clone(r);
      layouts.$blocks = { ...(layouts.$blocks || {}), [name]: rest };
      commit();
    }
    if (a === "copy") navigator.clipboard.writeText(snippet()).then(() => setDirty(dirty, "Copied"));
    if (a === "dup-layout") { const n = uniqueName(cur); layouts[n] = clone(layout()); layouts[n].label = `${layouts[n].label || cur} copy`; cur = n; sel = null; commit(); }
    if (a === "del-layout" && !usage(cur)) { delete layouts[cur]; cur = names()[0]; sel = null; commit(); }
  });
  function dup(r) {
    const c = clone(r);
    c.id = uniqueId(r.id);
    if (c.kind === "slot") c.slot = c.id;
    c.x += 24; c.y += 24;
    layout().regions.push(c);
    sel = c.id;
    commit();
  }

  // ---------------------------------------------------------- markdown
  function drawInserts() {
    $(".inserts").innerHTML = names().map((n) => `<button class="btn" data-insert="${esc(n)}">${esc(layouts[n].label || n)}</button>`).join("");
  }
  $(".ed-text .bar").addEventListener("click", (e) => {
    const b = e.target.closest("[data-insert]");
    if (!b) return;
    const pos = textEl.selectionStart;
    const at = textEl.value.indexOf("\n---\n", pos);
    const snippetText = `\n${MDeck.layoutTemplate(b.dataset.insert, layouts[b.dataset.insert])}\n`;
    const i = at < 0 ? textEl.value.length : at;
    textEl.setRangeText(snippetText, i, i, "end");
    textEl.dispatchEvent(new Event("input"));
    textEl.focus();
  });
  let textTimer = 0;
  textEl.addEventListener("input", () => {
    talkSrc = textEl.value;
    talkDirty = true;
    setDirty(dirty);
    clearTimeout(textTimer);
    textTimer = setTimeout(() => { refreshTalk(); followCaret(); drawPicker(); drawPage(); }, 200);
  });
  function followCaret() {
    const before = textEl.value.slice(0, textEl.selectionStart).match(/^id:\s*(\S+)/gm);
    const id = before ? before[before.length - 1].replace(/^id:\s*/, "") : talk.slides[0]?.id;
    if (id && id !== preview) { preview = id; drawPicker(); drawPage(); }
  }
  ["keyup", "click"].forEach((t) => textEl.addEventListener(t, followCaret));

  // ---------------------------------------------------------- top
  function drawPicker() {
    const list = mode === "markdown" ? talk.slides : talk.slides.filter((s) => s.layout === cur);
    pick.innerHTML = (mode === "layouts" ? `<option value="">Placeholders</option>` : "") + list.map((s) => `<option value="${esc(s.id)}" ${s.id === preview ? "selected" : ""}>${esc(s.title)}</option>`).join("");
    if (preview && !list.some((s) => s.id === preview)) preview = "";
    pick.value = preview;
  }
  pick.addEventListener("change", () => { preview = pick.value; drawPage(); });
  function setMode(m) {
    mode = m;
    ed.classList.toggle("md-mode", m === "markdown");
    document.querySelectorAll("[data-tab]").forEach((t) => t.setAttribute("aria-selected", String(t.dataset.tab === m)));
    if (m === "markdown") { textEl.value = talkSrc; preview = preview || talk.slides[0]?.id || ""; sel = null; drawInserts(); }
    else preview = "";
    draw();
    fit();
  }
  $(".ed-top").addEventListener("click", (e) => {
    const t = e.target.closest("[data-tab]");
    if (t) setMode(t.dataset.tab);
    const a = e.target.closest("[data-act]")?.dataset.act;
    if (a === "save") save();
    if (a === "undo") restore(undo, redo);
    if (a === "redo") restore(redo, undo);
  });
  addEventListener("keydown", (e) => {
    const typing = e.target.closest("input, textarea, select");
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === "s") { e.preventDefault(); save(); return; }
    if (typing) return;
    if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? restore(redo, undo) : restore(undo, redo); return; }
    const r = mode === "layouts" ? region() : null;
    if (!r) return;
    if (mod && e.key.toLowerCase() === "d") { e.preventDefault(); dup(r); return; }
    if (e.key === "Escape") { sel = null; draw(); }
    if (e.key === "Backspace" || e.key === "Delete") { layout().regions = layout().regions.filter((q) => q !== r); sel = null; commit(); }
    const step = e.shiftKey ? SNAP : 1;
    const nudge = { ArrowLeft: ["x", -step], ArrowRight: ["x", step], ArrowUp: ["y", -step], ArrowDown: ["y", step] }[e.key];
    if (nudge) { e.preventDefault(); r[nudge[0]] += nudge[1]; commit(); }
  });

  function draw() { drawLeft(); drawPicker(); drawPage(); drawRight(); }
  setMode("layouts");
  setDirty(false);
})();
