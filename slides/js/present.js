// Presenter and speaker views. Drive the slides window over a BroadcastChannel, and show the
// current and next build, the time against talk.md's `time:` values, and the script.
(async function () {
  const params = new URLSearchParams(location.search);
  const live = window.HVLive;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const $ = (s) => document.querySelector(s);
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };
  store.set("hv.presenter", 1);

  const src = await fetch("talk.md", { cache: "no-cache" }).then((r) => r.text());
  const talk = MDeck.render(src);
  const set = talk.settings;
  const slides = new Map(talk.slides.map((s) => [s.id, s]));
  const main = () => talk.slides.filter((s) => !s.backup);

  // ---------------------------------------------------------- view
  let view = params.get("view") === "speaker" ? "speaker" : "presenter";
  function setView(v) {
    view = v;
    document.body.className = `view-${v}`;
    document.querySelectorAll("[data-view]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === v)));
    document.title = `${set.title} · ${v === "speaker" ? "Speaker" : "Presenter"}`;
    const u = new URL(location.href); u.searchParams.set("view", v); history.replaceState(null, "", u);
    renderNotes(true);
  }
  document.querySelectorAll("[data-view]").forEach((b) => b.addEventListener("click", () => setView(b.dataset.view)));

  // ---------------------------------------------------------- link to the slides
  const channel = new BroadcastChannel(`hv-present-${set.room}`);
  let state = null, deckSeen = 0, liveStarted = false;
  function startLive() { if (!liveStarted) { liveStarted = true; live.start({ endpoint: set.live, room: set.room }); } }
  channel.onmessage = (e) => {
    const m = e.data || {};
    if (m.t === "state") { deckSeen = Date.now(); onState(m); }
    else if (m.t === "key" && m.key && !live.presenterKey) live.presenterKey = m.key;
  };
  channel.postMessage({ t: "hello" });
  setTimeout(startLive, 700); // gives the slides a moment to hand over the presenter key
  setInterval(() => {
    const ok = Date.now() - deckSeen < 4000 || (deckSeen && document.hidden);
    $(".pv-link").textContent = ok ? "" : "Open the slides in this browser";
    if (!ok) channel.postMessage({ t: "hello" });
  }, 2000);
  const go = (msg) => channel.postMessage({ t: "go", ...msg });
  live.on("slide", (s) => { if (Date.now() - deckSeen > 4000) onState({ ...s, builds: slides.get(s.id)?.clicks || 0, backup: !!slides.get(s.id)?.backup }); });

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
    if (s.f + 1 < (s.builds || 0)) return { id: s.id, f: s.f + 1, sameSlide: true };
    const list = s.backup ? talk.slides.filter((x) => x.backup) : main();
    const n = list[list.findIndex((x) => x.id === s.id) + 1];
    return n ? { id: n.id, f: -1 } : null;
  }

  // ---------------------------------------------------------- state
  let enteredAt = Date.now(), lastId = null, ask = true, qa = false;
  function onState(s) {
    const first = !state;
    const moved = !first && (s.id !== state.id || s.f !== state.f);
    state = s;
    const newSlide = s.id !== lastId;
    if (newSlide) { enteredAt = Date.now(); lastId = s.id; }
    renderNotes(newSlide);
    if (moved && timer.auto && !timer.running) resumeTimer();
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
    if (s.ask != null) { ask = s.ask; $("[data-ask]").setAttribute("aria-pressed", String(ask)); }
    if (s.qa != null) { qa = s.qa; $("[data-qa]").setAttribute("aria-pressed", String(qa)); }
    renderBackups();
    renderQuestions();
    tick();
  }

  // ---------------------------------------------------------- timer: pause, and auto-resume you can turn off
  const KEY = `hv.timer.${set.room}`;
  const timer = { done: 0, since: 0, running: false, started: false, auto: true, ...store.get(KEY, {}) };
  const saveTimer = () => store.set(KEY, timer);
  const elapsed = () => timer.done + (timer.running ? (Date.now() - timer.since) / 1000 : 0);
  const fmt = (sec) => { const a = Math.abs(Math.round(sec)); return `${Math.floor(a / 60)}:${String(a % 60).padStart(2, "0")}`; };
  function resumeTimer() { timer.running = true; timer.started = true; timer.since = Date.now(); saveTimer(); tick(); }
  function pauseTimer() { timer.done = elapsed(); timer.running = false; saveTimer(); tick(); }
  $(".pv-timer .toggle").addEventListener("click", () => (timer.running ? pauseTimer() : resumeTimer()));
  $(".pv-timer .reset").addEventListener("click", () => { Object.assign(timer, { done: 0, since: 0, running: false, started: false }); saveTimer(); tick(); });
  $(".pv-timer .auto").addEventListener("click", () => { timer.auto = !timer.auto; saveTimer(); tick(); });
  function tick() {
    const el = elapsed();
    $(".pv-timer .elapsed").textContent = fmt(el);
    $(".pv-timer .toggle").textContent = timer.running ? "Pause" : timer.started ? "Resume" : "Start";
    $(".pv-timer .auto").setAttribute("aria-pressed", String(timer.auto));
    const pace = $(".pv-timer .pace");
    const total = (set.duration || 0) * 60 || main().reduce((t, s) => t + s.time, 0);
    if (!state || !timer.started) { pace.textContent = total ? `of ${fmt(total)}` : ""; pace.className = "pace"; return; }
    if (!timer.running) { pace.textContent = "paused"; pace.className = "pace"; return; }
    let planned = 0;
    for (const s of main()) { if (s.id === state.id) break; planned += s.time; }
    const cur = slides.get(state.id);
    const drift = el - (planned + Math.min((Date.now() - enteredAt) / 1000, cur?.time || 0));
    pace.textContent = Math.abs(drift) < 10 ? "on time" : drift > 0 ? `${fmt(drift)} behind` : `${fmt(drift)} ahead`;
    pace.className = `pace${drift >= 10 ? " late" : ""}`;
  }
  setInterval(tick, 500);

  // ---------------------------------------------------------- script (read-only: edit it in dev mode)
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

  // ---------------------------------------------------------- backups + questions
  function renderBackups() {
    const list = talk.slides.filter((s) => s.backup);
    $(".pv-backups").hidden = !list.length;
    $(".pv-backups ol").innerHTML = list.map((s) => `<li><button type="button" class="btn" data-jump="${esc(s.id)}">${esc(s.title)}</button></li>`).join("");
  }
  $(".pv-backups").addEventListener("click", (e) => { const b = e.target.closest("[data-jump]"); if (b) go({ id: b.dataset.jump, f: -1 }); });
  function renderQuestions() {
    const on = set.questions === "on" && live.enabled;
    $("[data-qa]").hidden = !on;
    const top = on ? live.top(8) : [];
    $(".pv-questions").hidden = !top.length;
    $(".pv-questions ol").innerHTML = top.map((q) => `<li><b>${q.votes}</b>${esc(q.text)}<small>${esc(slides.get(q.slide)?.title || "General")}${q.name ? " · " + esc(q.name) : ""}</small></li>`).join("");
  }
  live.on("questions", renderQuestions);

  // ---------------------------------------------------------- controls
  document.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => go({ dir: b.dataset.go })));
  $("[data-ask]").addEventListener("click", () => channel.postMessage({ t: "ask", on: !ask }));
  $("[data-qa]").addEventListener("click", () => channel.postMessage({ t: "qa", on: !qa }));
  addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if ([" ", "ArrowRight", "ArrowDown", "PageDown", "Enter", "n", "N"].includes(k)) { e.preventDefault(); go({ dir: "next" }); }
    else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(k)) { e.preventDefault(); go({ dir: "prev" }); }
    else if (k === "b" || k === "B") channel.postMessage({ t: "backups" });
    else if (k === "q" || k === "Q") channel.postMessage({ t: "qa", on: !qa });
    else if (k === "s" || k === "S") setView("speaker");
    else if (k === "p" || k === "P") setView("presenter");
    else if (k === "t" || k === "T") HVTheme.cycle();
  });

  setView(view);
  renderQuestions();
  tick();
})();
