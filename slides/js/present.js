// Presenter and speaker views. Drives the slides window over a BroadcastChannel,
// shows the current and next build, a timer paced against talk.md's `time:`
// values, the script (editable), backup slides and questions.
//
// Edited scripts are kept in this browser, sent to the live relay (so /talk/
// shows them; needs the presenter key), and written into talk.md when the site
// runs on tools/serve.mjs. "Download talk.md" works everywhere.
(async function () {
  const params = new URLSearchParams(location.search);
  const live = window.HVLive;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const $ = (s) => document.querySelector(s);
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };

  // ---------------------------------------------------------- talk
  let src = await fetch("talk.md", { cache: "no-cache" }).then((r) => r.text());
  let talk = MDeck.render(src);
  const set = talk.settings;
  const byId = () => new Map(talk.slides.map((s) => [s.id, s]));
  let slides = byId();
  const main = () => talk.slides.filter((s) => !s.backup);
  const LOCAL = `hv.notes.${set.room}`;

  // ---------------------------------------------------------- view
  let view = params.get("view") === "speaker" ? "speaker" : "presenter";
  function setView(v) {
    view = v;
    document.body.className = `view-${v}`;
    document.querySelectorAll("[data-view]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.view === v)));
    document.title = `${set.title} · ${v === "speaker" ? "Speaker" : "Presenter"}`;
    const u = new URL(location.href); u.searchParams.set("view", v); history.replaceState(null, "", u);
    renderNotes(true);
  }
  document.querySelectorAll("[data-view]").forEach((b) => b.addEventListener("click", () => setView(b.dataset.view)));

  // ---------------------------------------------------------- link to the slides
  const channel = new BroadcastChannel(`hv-present-${set.room}`);
  let state = null, deckSeen = 0, liveStarted = false;
  const link = { dot: $(".pv-link .dot"), txt: $(".pv-link .txt") };
  function startLive() {
    if (liveStarted) return;
    liveStarted = true;
    live.start({ endpoint: set.live, room: set.room });
  }
  channel.onmessage = (e) => {
    const m = e.data || {};
    if (m.t === "state") { deckSeen = Date.now(); onState(m); }
    else if (m.t === "key" && m.key && !live.presenterKey) live.presenterKey = m.key;
  };
  channel.postMessage({ t: "hello" });
  // give the slides a moment to hand over the presenter key, then connect
  setTimeout(startLive, 700);
  setInterval(() => {
    const ok = Date.now() - deckSeen < 4000 || (deckSeen && document.hidden);
    link.dot.className = `dot ${ok ? "on" : following() ? "follow" : ""}`;
    link.txt.textContent = ok ? "Driving the slides" : following() ? "Following the live room (read only)" : "Open the slides in this browser, then press P or S there";
    if (!ok) channel.postMessage({ t: "hello" });
  }, 2000);
  const following = () => !deckSeen && live.status === "open" && !!live.slide;
  live.on("slide", (s) => { if (Date.now() - deckSeen > 4000) onState({ ...s, builds: buildsOf(s.id), backup: !!slides.get(s.id)?.backup }); });
  const buildsOf = (id) => (slides.get(id) ? slides.get(id).clicks : 0);
  const go = (msg) => channel.postMessage({ t: "go", ...msg });

  // ---------------------------------------------------------- previews
  const frames = { current: $('iframe[data-role="current"]'), next: $('iframe[data-role="next"]') };
  const theme = params.get("theme") ? `&theme=${encodeURIComponent(params.get("theme"))}` : "";
  Object.values(frames).forEach((f) => (f.src = `index.html?embed&receiver${theme}`));
  const showIn = (frame, id, f) => frame.contentWindow && frame.contentWindow.postMessage({ hv: "go", id, f }, location.origin);
  addEventListener("message", (e) => {
    if (e.origin !== location.origin || !e.data || e.data.hv !== "state") return;
    // a preview finished loading: put it where it should be
    if (!state) return;
    const want = e.source === frames.current.contentWindow ? state : e.source === frames.next.contentWindow ? nextOf(state) : null;
    if (want && (e.data.id !== want.id || e.data.f !== want.f)) showIn(e.source === frames.current.contentWindow ? frames.current : frames.next, want.id, want.f);
  });
  function nextOf(s) {
    if (s.f + 1 < (s.builds || 0)) return { id: s.id, f: s.f + 1, sameSlide: true };
    const list = s.backup ? talk.slides.filter((x) => x.backup) : main();
    const i = list.findIndex((x) => x.id === s.id);
    const n = list[i + 1];
    return n ? { id: n.id, f: -1 } : null;
  }

  // ---------------------------------------------------------- state
  let enteredAt = Date.now(), lastId = null;
  function onState(s) {
    const first = !state;
    state = s;
    if (s.id !== lastId) { enteredAt = Date.now(); lastId = s.id; if (!editing) renderNotes(true); }
    else if (!editing) renderNotes(false);
    if (!first && timer.start == null && s.id !== main()[0]?.id) startTimer();
    showIn(frames.current, s.id, s.f);
    const n = nextOf(s);
    $(".pv-next .end").hidden = !!n;
    frames.next.style.visibility = n ? "" : "hidden";
    if (n) showIn(frames.next, n.id, n.f);
    const sl = slides.get(s.id);
    const idx = main().findIndex((x) => x.id === s.id);
    $(".pv-meta .pos").textContent = sl?.backup ? "Backup" : `${idx + 1} / ${main().length}${s.builds ? ` · build ${s.f + 2} of ${s.builds + 1}` : ""}`;
    $(".pv-meta .title").textContent = sl ? sl.title : s.id;
    $(".next-title").textContent = n ? (n.sameSlide ? "Next build on this slide" : slides.get(n.id)?.title || n.id) : "";
    renderBackups();
    renderQuestions();
    tick();
  }

  // ---------------------------------------------------------- timer
  const timer = store.get(`hv.timer.${set.room}`, { start: null });
  const fmt = (sec) => { const a = Math.abs(Math.round(sec)); return `${Math.floor(a / 60)}:${String(a % 60).padStart(2, "0")}`; };
  function startTimer() { timer.start = Date.now(); store.set(`hv.timer.${set.room}`, timer); tick(); }
  $(".pv-timer .start").addEventListener("click", startTimer);
  $(".pv-timer .reset").addEventListener("click", () => { timer.start = null; store.set(`hv.timer.${set.room}`, timer); tick(); });
  function tick() {
    const now = Date.now();
    $(".pv-timer .clock").textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const el = timer.start ? (now - timer.start) / 1000 : 0;
    $(".pv-timer .elapsed").textContent = fmt(el);
    $(".pv-timer .start").hidden = timer.start != null;
    const pace = $(".pv-timer .pace");
    const total = (set.duration || 0) * 60 || main().reduce((t, s) => t + s.time, 0);
    if (!state || !timer.start) { pace.textContent = total ? `plan ${fmt(total)}` : ""; pace.className = "pace"; }
    else {
      // where the plan says you should be when this slide started
      let planned = 0;
      for (const s of main()) { if (s.id === state.id) break; planned += s.time; }
      const onSlide = (now - enteredAt) / 1000;
      const cur = slides.get(state.id);
      const drift = el - (planned + Math.min(onSlide, cur?.time || 0));
      pace.textContent = Math.abs(drift) < 10 ? "on time" : drift > 0 ? `${fmt(drift)} behind` : `${fmt(drift)} ahead`;
      pace.className = `pace ${Math.abs(drift) < 10 ? "ok" : drift > 0 ? "late" : "early"}`;
      $(".pv-bar i").style.width = cur && cur.time ? `${Math.min(100, (onSlide / cur.time) * 100)}%` : "0";
      $(".pv-bar").classList.toggle("over", !!cur && cur.time > 0 && onSlide > cur.time);
    }
  }
  setInterval(tick, 500);

  // ---------------------------------------------------------- script (notes)
  // An edit applies while the talk.md text it replaced is unchanged (same hash).
  const localEdits = () => store.get(LOCAL, {});
  function noteOf(sl) {
    const cands = [];
    const l = localEdits()[sl.id];
    if (l && l.base === sl.notesHash) cands.push(l);
    const r = live.noteFor(sl);
    if (r) cands.push(r);
    cands.sort((a, b) => (b.ts || 0) - (a.ts || 0));
    return cands[0] ? { md: cands[0].md, edited: true } : { md: sl.notesMd, edited: false };
  }
  const notesEl = $(".pv-notes .notes");
  function renderNotes(scroll) {
    if (!state) return;
    const sl = slides.get(state.id);
    if (!sl) return;
    const n = noteOf(sl);
    let k = 0;
    notesEl.innerHTML = MDeck.renderNotes(n.md).replace(/\[click\]/g, () => `<span class="click" data-k="${k++}">click</span>`);
    // builds already shown are dimmed; the next one is marked
    notesEl.querySelectorAll(".click").forEach((c) => {
      const i = +c.dataset.k;
      c.classList.toggle("passed", i <= state.f);
      c.classList.toggle("next", i === state.f + 1);
    });
    $(".pv-notes .save-state").textContent = n.edited ? "Edited" : "";
    const target = notesEl.querySelector(".click.next") || notesEl.querySelector(".click.passed:last-of-type");
    if (scroll || view === "speaker") {
      if (target && state.f >= 0) target.scrollIntoView({ block: "center", behavior: scroll ? "auto" : "smooth" });
      else if (scroll) notesEl.parentElement.scrollTop = 0;
    }
  }
  live.on("notes", () => { if (!editing) renderNotes(false); });

  // editing
  let editing = false;
  const ed = { box: $(".pv-notes .editing"), ta: $(".pv-notes textarea"), state: $(".pv-notes .save-state") };
  function openEditor() {
    if (!state || editing) return;
    const sl = slides.get(state.id);
    editing = { id: sl.id };
    ed.ta.value = noteOf(sl).md;
    ed.box.hidden = false; notesEl.hidden = true;
    ed.ta.focus();
  }
  function closeEditor() { editing = false; ed.box.hidden = true; notesEl.hidden = false; renderNotes(false); }
  async function save(id, md) {
    const sl = slides.get(id);
    const ts = Date.now();
    const all = localEdits();
    if (md.trim() === sl.notesMd.trim()) delete all[id]; else all[id] = { md, base: sl.notesHash, ts };
    store.set(LOCAL, all);
    const parts = ["saved in this browser"];
    if (live.saveNotes(id, md.trim() === sl.notesMd.trim() ? "" : md, sl.notesHash)) parts.push("sent to the script page");
    if (await writeTalkFile(id, md)) parts.splice(0, parts.length, "saved to talk.md");
    return parts.join(", ");
  }
  async function saveAndShow(id, md) {
    const msg = await save(id, md);
    renderNotes(false);
    ed.state.textContent = msg[0].toUpperCase() + msg.slice(1);
  }
  // tools/serve.mjs accepts PUT /slides/talk.md from this machine; GitHub Pages doesn't
  let canWrite = null;
  async function writeTalkFile(id, md) {
    if (canWrite === null) canWrite = await fetch("../__hv/save", { cache: "no-store" }).then((r) => r.ok).catch(() => false);
    if (!canWrite) return false;
    const fresh = await fetch("talk.md", { cache: "no-store" }).then((r) => r.text());
    const out = MDeck.replaceNotes(fresh, id, md);
    if (!out) return false;
    const ok = await fetch("talk.md", { method: "PUT", body: out, headers: { "Content-Type": "text/markdown" } }).then((r) => r.ok).catch(() => false);
    if (ok) {
      src = out; talk = MDeck.render(src); slides = byId();
      const all = localEdits(); delete all[id]; store.set(LOCAL, all);
    }
    return ok;
  }
  $(".pv-notes .edit").addEventListener("click", openEditor);
  $(".pv-notes .save").addEventListener("click", () => { const id = editing.id; const md = ed.ta.value; closeEditor(); saveAndShow(id, md); });
  $(".pv-notes .cancel").addEventListener("click", closeEditor);
  $(".pv-notes .revert").addEventListener("click", () => { const id = editing.id; closeEditor(); saveAndShow(id, slides.get(id).notesMd); });
  ed.ta.addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (e.key === "Escape") closeEditor();
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); $(".pv-notes .save").click(); }
  });

  // talk.md with every edit that still applies
  $("[data-download]").addEventListener("click", () => {
    let out = src;
    for (const sl of talk.slides) { const n = noteOf(sl); if (n.edited) out = MDeck.replaceNotes(out, sl.id, n.md) || out; }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([out], { type: "text/markdown" }));
    a.download = "talk.md";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });

  // ---------------------------------------------------------- backups + questions
  function renderBackups() {
    const list = talk.slides.filter((s) => s.backup);
    $(".pv-backups").hidden = !list.length;
    $(".pv-backups ol").innerHTML = list.map((s) => `<li><button type="button" data-jump="${esc(s.id)}" aria-current="${state && state.id === s.id}">${esc(s.title)}</button></li>`).join("") +
      (state && state.backup ? `<li><button type="button" data-jump="thanks" class="back">← Back to the end slide</button></li>` : "");
  }
  $(".pv-backups").addEventListener("click", (e) => { const b = e.target.closest("[data-jump]"); if (b) go({ id: b.dataset.jump, f: -1 }); });
  function renderQuestions() {
    const on = set.questions === "on" && live.enabled;
    $(".pv-questions").hidden = !on;
    if (!on) return;
    const top = live.top(12);
    $(".pv-questions .count").textContent = top.length || "";
    $(".pv-questions ol").innerHTML = top.length
      ? top.map((q) => `<li><span class="v">${q.votes}</span><span class="t">${esc(q.text)}<small>${esc(slides.get(q.slide)?.title || "General")}${q.name ? " · " + esc(q.name) : ""}</small></span>${live.presenterKey ? `<button type="button" data-hide="${esc(q.id)}" title="Hide">×</button>` : ""}</li>`).join("")
      : `<li class="empty">No questions yet.</li>`;
  }
  $(".pv-questions").addEventListener("click", (e) => { const b = e.target.closest("[data-hide]"); if (b) live.hide(b.dataset.hide); });
  live.on("questions", renderQuestions);

  // ---------------------------------------------------------- controls
  document.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => go({ dir: b.dataset.go })));
  $("[data-backups]").addEventListener("click", () => channel.postMessage({ t: "backups" }));
  addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || (e.target.closest && e.target.closest("textarea, input"))) return;
    const k = e.key;
    if ([" ", "ArrowRight", "ArrowDown", "PageDown", "Enter", "n", "N"].includes(k)) { e.preventDefault(); go({ dir: "next" }); }
    else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(k)) { e.preventDefault(); go({ dir: "prev" }); }
    else if (k === "b" || k === "B") channel.postMessage({ t: "backups" });
    else if (k === "e" || k === "E") { e.preventDefault(); openEditor(); }
    else if (k === "s" || k === "S") setView("speaker");
    else if (k === "p" || k === "P") setView("presenter");
    else if (k === "t" || k === "T") HVTheme.toggle();
  });

  setView(view);
  tick();
})();
