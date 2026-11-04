// Dev-mode editor: pick a slide, change its markdown or its notes, save. talk.md stays the one source,
// and the slides reload by themselves in any tab. Loaded only after the dev server recognizes this browser.
(async function () {
  document.body.innerHTML = `
    <div class="ed">
      <header class="ed-top">
        <button type="button" class="btn" data-a="save" title="⌘S">Save</button>
        <button type="button" class="btn" data-a="add">New slide</button>
        <button type="button" class="btn" data-a="dup">Duplicate</button>
        <button type="button" class="btn" data-a="up">Move up</button>
        <button type="button" class="btn" data-a="down">Move down</button>
        <button type="button" class="btn" data-a="del">Delete</button>
        <span class="state"></span>
        <a class="btn" href="/slides/" target="_blank" rel="noopener">Slides</a>
        <a class="btn" href="/slides/?view=print&amp;autoprint" target="_blank" rel="noopener">Export PDF</a>
        <span data-theme-picker></span>
      </header>
      <nav class="ed-list" aria-label="Slides"></nav>
      <section class="ed-text">
        <label>Slide<textarea class="body" spellcheck="false"></textarea></label>
        <label>Notes<textarea class="notes" spellcheck="true"></textarea></label>
      </section>
      <section class="ed-view">
        <div class="frame"><iframe title="Preview"></iframe></div>
        <p>The preview shows every build, and updates when you save. <code>[click]</code> in the notes marks a build.</p>
      </section>
    </div>`;
  HVTheme.mountAll();
  const $ = (s) => document.querySelector(s);
  const list = $(".ed-list"), bodyEl = $(".body"), notesEl = $(".notes"), frame = $("iframe"), stateEl = $(".state");
  const NOTES = /^:::notes[ \t]*\n([\s\S]*?)\n?^:::[ \t]*$\n?/m;

  // talk.md → settings and a list of slides, each kept as the exact text you wrote
  function parse(src) {
    const lines = src.split("\n");
    let i = 0;
    while (i < lines.length && lines[i].trim() !== "---") i++;
    i++;
    while (i < lines.length && lines[i].trim() !== "---") i++;
    const starts = [];
    let inComment = false, fence = false;
    for (let k = i + 1; k < lines.length; k++) {
      if (lines[k].includes("<!--")) inComment = true;
      if (lines[k].includes("-->")) { inComment = false; continue; }
      if (/^\s*```/.test(lines[k])) fence = !fence;
      if (!inComment && !fence && lines[k].trim() === "---" && /^[\w-]+:/.test(lines[k + 1] || "")) {
        starts.push(k);
        let j = k + 1;
        while (j < lines.length && lines[j].trim() !== "---") j++;
        k = j;
      }
    }
    const head = lines.slice(0, starts[0]).join("\n");
    const slides = starts.map((s, n) => lines.slice(s, starts[n + 1] ?? lines.length).join("\n").replace(/\n+$/, ""));
    return { head, slides };
  }
  const compose = () => `${doc.head.replace(/\n+$/, "")}\n\n${doc.slides.join("\n\n")}\n`;
  const idOf = (t) => (t.match(/^id:\s*(\S+)/m) || [])[1] || "";
  const titleOf = (t) => (t.match(/^#\s+(.*)$/m) || [])[1] || idOf(t) || "Untitled";
  const splitNotes = (t) => { const m = t.match(NOTES); return { body: t.replace(NOTES, "").replace(/\n+$/, ""), notes: m ? m[1] : "" }; };
  const joinNotes = (body, notes) => `${body.replace(/\n+$/, "")}\n\n:::notes\n${notes.replace(/\n+$/, "")}\n:::`;

  let doc = parse(await fetch("/slides/talk.md", { cache: "no-store" }).then((r) => r.text()));
  let at = 0, dirty = false;

  function drawList() {
    list.innerHTML = doc.slides.map((t, i) => `<button type="button" data-i="${i}" aria-current="${i === at}"><span class="n">${i + 1}</span><span></span></button>`).join("");
    list.querySelectorAll("button").forEach((b, i) => { b.lastElementChild.textContent = titleOf(doc.slides[i]); });
  }
  function show(i) {
    at = Math.max(0, Math.min(doc.slides.length - 1, i));
    const { body, notes } = splitNotes(doc.slides[at]);
    bodyEl.value = body;
    notesEl.value = notes;
    drawList();
    preview();
  }
  function preview() { frame.src = `/slides/?embed=${encodeURIComponent(idOf(doc.slides[at]))}&poster&t=${Date.now()}`; }
  function setDirty(v, msg) { dirty = v; stateEl.textContent = msg || (v ? "Unsaved" : "Saved"); }
  function commit() { doc.slides[at] = joinNotes(bodyEl.value, notesEl.value); }

  async function save() {
    commit();
    const r = await fetch("/__dev/file?path=slides/talk.md", { method: "PUT", body: compose(), headers: { "X-HV-Dev": "1", "Content-Type": "text/plain" } }).catch(() => null);
    if (!r || !r.ok) { setDirty(true, "Couldn't save: is the dev server still running?"); return; }
    setDirty(false);
    drawList();
    preview();
  }
  [bodyEl, notesEl].forEach((el) => el.addEventListener("input", () => setDirty(true)));
  list.addEventListener("click", (e) => { const b = e.target.closest("[data-i]"); if (b) { commit(); show(+b.dataset.i); } });
  const fresh = () => { let n = doc.slides.length + 1, id; do id = `slide-${n++}`; while (doc.slides.some((t) => idOf(t) === id)); return id; };
  $(".ed-top").addEventListener("click", (e) => {
    const a = e.target.closest("[data-a]")?.dataset.a;
    if (!a) return;
    if (a === "save") return save();
    commit();
    if (a === "add") doc.slides.splice(at + 1, 0, `---\nid: ${fresh()}\nlayout: full\ntime: 30\n---\n\n# Title\n\n:::items steps\n- First point\n- Second point\n:::\n\n:::notes\nWhat you say. [click] marks a build.\n:::`);
    if (a === "dup") doc.slides.splice(at + 1, 0, doc.slides[at].replace(/^id:\s*\S+/m, `id: ${fresh()}`));
    if (a === "del") { if (doc.slides.length < 2 || !confirm(`Delete "${titleOf(doc.slides[at])}"?`)) return; doc.slides.splice(at, 1); at = Math.min(at, doc.slides.length - 1); return save().then(() => show(at)); }
    if (a === "up" && at > 0) { [doc.slides[at - 1], doc.slides[at]] = [doc.slides[at], doc.slides[at - 1]]; at--; }
    if (a === "down" && at < doc.slides.length - 1) { [doc.slides[at + 1], doc.slides[at]] = [doc.slides[at], doc.slides[at + 1]]; at++; }
    if (a === "add" || a === "dup") at++;
    save().then(() => show(at));
  });
  addEventListener("keydown", (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") { e.preventDefault(); save(); } });
  addEventListener("beforeunload", (e) => { if (dirty) e.preventDefault(); });
  show(0);
  setDirty(false);
})();
