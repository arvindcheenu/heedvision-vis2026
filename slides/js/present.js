// Presenter and speaker views. Drive the slides window over a BroadcastChannel and show
// the current and next build, the time against talk.md's `time:` values, and the script.
// Elsewhere, without the slides open, they follow the live room read-only.
(async function () {
  const params = new URLSearchParams(location.search);
  const live = window.HVLive;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const $ = (s) => document.querySelector(s);
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };

  const talk = await MDeck.load("");
  const set = talk.settings;
  const slides = new Map(talk.slides.map((s) => [s.id, s]));
  const main = () => talk.slides.filter((s) => !s.backup);

  // ---------------------------------------------------------- view
  let view = params.get("view") === "speaker" ? "speaker" : "presenter";
  function setView(v) {
    view = v;
    document.body.className = `view-${v}`;
    document.title = `${set.title} · ${v === "speaker" ? "Speaker" : "Presenter"}`;
    const u = new URL(location.href); u.searchParams.set("view", v); history.replaceState(null, "", u);
    renderNotes(true);
  }

  // ---------------------------------------------------------- link to the slides
  const channel = new BroadcastChannel(`hv-present-${set.room}`);
  let state = null, deckSeen = 0, liveStarted = false;
  const startLive = () => { if (!liveStarted) { liveStarted = true; live.start({ endpoint: set.live, room: set.room }); } };
  channel.onmessage = (e) => {
    const m = e.data || {};
    if (m.t === "state") { deckSeen = Date.now(); onState(m); }
    else if (m.t === "key" && m.key && !live.presenterKey) live.presenterKey = m.key;
  };
  channel.postMessage({ t: "hello" });
  setTimeout(startLive, 700); // gives the slides a moment to hand over the presenter key
  setInterval(() => { if (Date.now() - deckSeen >= 4000) channel.postMessage({ t: "hello" }); }, 2000);
  live.on("slide", (s) => { if (Date.now() - deckSeen > 4000) onState({ ...s, builds: slides.get(s.id)?.clicks || 0, backup: !!slides.get(s.id)?.backup }); });
  const go = (msg) => channel.postMessage({ t: "go", ...msg });

  // ---------------------------------------------------------- previews
  const frames = { current: $('iframe[data-role="current"]'), next: $('iframe[data-role="next"]') };
  Object.values(frames).forEach((f) => (f.src = "index.html?embed&receiver"));
  const showIn = (frame, id, f) => frame.contentWindow && frame.contentWindow.postMessage({ hv: "go", id, f }, location.origin);
  addEventListener("message", (e) => {
    if (e.origin !== location.origin || !e.data || e.data.hv !== "state" || !state) return;
    const isCur = e.source === frames.current.contentWindow, isNext = e.source === frames.next.contentWindow;
    const want = isCur ? state : isNext ? nextOf(state) : null;
    if (want && (e.data.id !== want.id || e.data.f !== want.f)) showIn(isCur ? frames.current : frames.next, want.id, want.f);
  });
  function nextOf(s) {
    if (s.f + 1 < (s.builds || 0)) return { id: s.id, f: s.f + 1 };
    const list = s.backup ? talk.slides.filter((x) => x.backup) : main();
    const n = list[list.findIndex((x) => x.id === s.id) + 1];
    return n ? { id: n.id, f: -1 } : null;
  }

  // ---------------------------------------------------------- state
  let enteredAt = Date.now(), lastId = null;
  function onState(s) {
    const first = !state;
    state = s;
    const moved = s.id !== lastId;
    if (moved) { enteredAt = Date.now(); lastId = s.id; }
    renderNotes(moved);
    if (!first && timer.start == null && s.id !== main()[0]?.id) startTimer();
    showIn(frames.current, s.id, s.f);
    const n = nextOf(s);
    $(".pv-next .end").hidden = !!n;
    if (n) showIn(frames.next, n.id, n.f);
    const sl = slides.get(s.id);
    const idx = main().findIndex((x) => x.id === s.id);
    $(".pv-meta .pos").textContent = sl?.backup ? "Backup" : `${idx + 1} / ${main().length}`;
    $(".pv-meta .title").textContent = sl ? sl.title : s.id;
    if (s.ask != null) ask = s.ask;
    renderQuestions();
    tick();
  }

  // ---------------------------------------------------------- timer
  const timer = store.get(`hv.timer.${set.room}`, { start: null });
  const fmt = (sec) => { const a = Math.abs(Math.round(sec)); return `${Math.floor(a / 60)}:${String(a % 60).padStart(2, "0")}`; };
  function startTimer() { timer.start = Date.now(); store.set(`hv.timer.${set.room}`, timer); tick(); }
  $(".pv-timer").addEventListener("click", () => { timer.start = null; store.set(`hv.timer.${set.room}`, timer); tick(); });
  function tick() {
    const now = Date.now();
    const el = timer.start ? (now - timer.start) / 1000 : 0;
    $(".pv-timer .elapsed").textContent = fmt(el);
    const pace = $(".pv-timer .pace");
    const total = (set.duration || 0) * 60 || main().reduce((t, s) => t + s.time, 0);
    if (!state || !timer.start) { pace.textContent = total ? `of ${fmt(total)}` : ""; pace.className = "pace"; return; }
    let planned = 0;
    for (const s of main()) { if (s.id === state.id) break; planned += s.time; }
    const cur = slides.get(state.id);
    const drift = el - (planned + Math.min((now - enteredAt) / 1000, cur?.time || 0));
    pace.textContent = Math.abs(drift) < 10 ? "on time" : drift > 0 ? `${fmt(drift)} behind` : `${fmt(drift)} ahead`;
    pace.className = `pace${drift >= 10 ? " late" : ""}`;
  }
  setInterval(tick, 500);

  // ---------------------------------------------------------- script
  const notesEl = $(".notes");
  function renderNotes(scroll) {
    if (!state) return;
    const sl = slides.get(state.id);
    if (!sl) return;
    let k = 0;
    notesEl.innerHTML = MDeck.renderNotes(sl.notesMd).replace(/\[click\]/g, () => `<span class="click" data-k="${k++}">click</span>`);
    notesEl.querySelectorAll(".click").forEach((c) => {
      const i = +c.dataset.k;
      c.classList.toggle("passed", i <= state.f);
      c.classList.toggle("next", i === state.f + 1);
    });
    const target = notesEl.querySelector(".click.next") || notesEl.querySelector(".click.passed:last-of-type");
    if (target && state.f >= 0) target.scrollIntoView({ block: "center", behavior: scroll ? "auto" : "smooth" });
    else if (scroll) notesEl.parentElement.scrollTop = 0;
  }

  // ---------------------------------------------------------- questions (only when talk.md turns them on)
  function renderQuestions() {
    const on = set.questions === "on" && live.enabled;
    const box = $(".pv-questions");
    const top = on ? live.top(5) : [];
    box.hidden = !top.length;
    box.querySelector("ol").innerHTML = top.map((q) => `<li><b>${q.votes}</b>${esc(q.text)}</li>`).join("");
  }
  live.on("questions", renderQuestions);

  // ---------------------------------------------------------- keys
  let ask = null, toastTimer = 0;
  function toast(text) {
    const t = $(".pv-toast");
    t.textContent = text; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), 1800);
  }
  addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if ([" ", "ArrowRight", "ArrowDown", "PageDown", "Enter", "n", "N"].includes(k)) { e.preventDefault(); go({ dir: "next" }); }
    else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(k)) { e.preventDefault(); go({ dir: "prev" }); }
    else if (k === "b" || k === "B") channel.postMessage({ t: "backups" });
    else if (k === "a" || k === "A") { const on = !(ask !== false); channel.postMessage({ t: "ask", on }); toast(on ? "QR code opens the script page" : "QR code opens the project site"); }
    else if (k === "s" || k === "S") setView("speaker");
    else if (k === "p" || k === "P") setView("presenter");
  });

  setView(view);
  tick();
})();
