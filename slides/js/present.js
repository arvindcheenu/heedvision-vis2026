// Presenter view. Drives the slides window over a BroadcastChannel, and show the
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

  const src = await fetch("talk.md", { cache: "no-cache" }).then((r) => r.text());
  const talk = MDeck.render(src);
  const set = talk.settings;
  const slides = new Map(talk.slides.map((s) => [s.id, s]));
  const main = () => talk.slides.filter((s) => !s.backup);

  // ---------------------------------------------------------- only the host gets past here
  // The passphrase stays in this browser, so a reload or lost Wi-Fi doesn't lock you out of your own notes.
  // The relay still checks it, and if it no longer holds, this returns to the sign-in.
  const HOST = "hv.host";
  const gateNote = (t) => { $(".pv-gate-note").textContent = t; };
  const WHY = { wrong: "That passphrase isn't right.", wait: "Too many tries. Please wait a minute.", changed: "The passphrase has changed. Please sign in with the new one." };
  const remembered = store.get(HOST, null);
  const fromLink = params.get("present");
  if (fromLink) {
    const u = new URL(location.href); u.searchParams.delete("present");
    history.replaceState(null, "", u);
  }
  live.presenterKey = fromLink || remembered || "";
  live.on("auth", (a) => {
    if (a.ok) return store.set(HOST, live.presenterKey || store.get(HOST, null));
    if (!document.documentElement.classList.contains("gated")) {
      localStorage.removeItem(HOST);
      try { sessionStorage.setItem("hv.gate.why", a.reason || "wrong"); } catch {}
      location.reload();
    }
  });
  live.start({ endpoint: set.live, room: set.room });
  if (!live.presenterKey) {
    let why = null;
    try { why = sessionStorage.getItem("hv.gate.why"); sessionStorage.removeItem("hv.gate.why"); } catch {}
    if (why) gateNote(WHY[why] || WHY.wrong);
    const box = $("#gate-key");
    box.focus();
    await new Promise((signedIn) => {
      $(".pv-gate-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const key = box.value.trim();
        if (!key) return;
        gateNote("Checking…");
        const slow = setTimeout(() => gateNote("Can't reach the relay yet. Still trying…"), 6000);
        const a = await live.signIn(key);
        clearTimeout(slow);
        if (!a.ok) { gateNote(WHY[a.reason] || WHY.wrong); box.select(); return; }
        store.set(HOST, key);
        box.value = "";
        signedIn();
      });
    });
    document.documentElement.classList.remove("gated");
  }
  store.set("hv.presenter", 1);

  // ---------------------------------------------------------- link to the slides
  const channel = new BroadcastChannel(`hv-present-${set.room}`);
  let state = null, deckSeen = 0, leader = null;
  const lastOf = new Map();
  channel.onmessage = (e) => {
    const m = e.data || {};
    if (m.t === "state") {
      // The slides may be open in more than one tab. Follow one of them, and change only when another is
      // actually moved or the first goes quiet: otherwise this view flips between them every two seconds.
      const at = `${m.id}:${m.f}`, was = lastOf.get(m.deck);
      lastOf.set(m.deck, at);
      if (leader === null || Date.now() - deckSeen > 5000) leader = m.deck;
      else if (m.deck !== leader) { if (was === undefined || was === at) return; leader = m.deck; }
      deckSeen = Date.now();
      // answers to the "are you there?" below change nothing, and shouldn't move the script
      if (!state || m.id !== state.id || m.f !== state.f || m.ask !== state.ask || m.qa !== state.qa) onState(m);
    }
  };
  const hello = () => channel.postMessage({ t: "hello", key: live.presenterKey });
  hello();
  setInterval(() => {
    const ok = Date.now() - deckSeen < 6000 || (deckSeen && document.hidden);
    $(".pv-link").textContent = ok ? "" : "Open the slides in this browser";
    hello();
  }, 2000);
  const go = (msg) => channel.postMessage({ t: "go", to: leader, ...msg });
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
    if (editing && s.id !== editing) finishEdit();
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
  // Closing this window stops the timer. If it went without saying goodbye, the timer stopped at its last beat.
  if (timer.running) {
    timer.done += Math.max(0, (timer.beat || timer.since) - timer.since) / 1000;
    timer.running = false;
    saveTimer();
  }
  addEventListener("pagehide", () => { if (timer.running) pauseTimer(); });
  const elapsed = () => timer.done + (timer.running ? (Date.now() - timer.since) / 1000 : 0);
  const fmt = (sec) => { const a = Math.abs(Math.round(sec)); return `${Math.floor(a / 60)}:${String(a % 60).padStart(2, "0")}`; };
  function resumeTimer() { timer.running = true; timer.started = true; timer.since = Date.now(); saveTimer(); tick(); }
  function pauseTimer() { timer.done = elapsed(); timer.running = false; saveTimer(); tick(); }
  $(".pv-timer .toggle").addEventListener("click", () => (timer.running ? pauseTimer() : resumeTimer()));
  $(".pv-timer .reset").addEventListener("click", () => { Object.assign(timer, { done: 0, since: 0, running: false, started: false }); saveTimer(); tick(); });
  $(".pv-timer .auto").addEventListener("click", () => { timer.auto = !timer.auto; saveTimer(); tick(); });
  function tick() {
    if (timer.running) { timer.beat = Date.now(); saveTimer(); }
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

  // ---------------------------------------------------------- script
  // Whoever holds the presenter key can edit it here: every keystroke reaches the script page and this
  // view over the relay. talk.md stays the source; an edit is dropped once talk.md's text for that slide changes.
  const notesEl = $(".notes"), area = $(".notes-edit"), editBtn = $(".pn-edit"), editState = $(".pn-state");
  let editing = null, editTimer = 0;
  const scriptOf = (sl) => { const e = live.noteFor(sl); return e ? e.md : sl.notesMd; };
  function renderNotes(scroll) {
    if (!state || editing) return;
    const sl = slides.get(state.id);
    if (!sl) return;
    let k = 0;
    notesEl.innerHTML = MDeck.renderNotes(scriptOf(sl)).replace(/\[click\]/g, () => `<span class="click" data-k="${k++}">click</span>`);
    editState.textContent = live.noteFor(sl) ? "Edited live" : "";
    notesEl.querySelectorAll(".click").forEach((c) => {
      const i = +c.dataset.k;
      c.classList.toggle("passed", i <= state.f);
      c.classList.toggle("next", i === state.f + 1);
    });
    // the build about to come, or after the last one, the line being said (each [click] sits in its own paragraph)
    const passed = notesEl.querySelectorAll(".click.passed");
    const target = notesEl.querySelector(".click.next") || passed[passed.length - 1];
    if (target && state.f >= 0) target.scrollIntoView({ block: "center", behavior: scroll ? "auto" : "smooth" });
    else if (scroll) notesEl.parentElement.scrollTop = 0;
  }
  live.on("notes", () => renderNotes(false));
  function pushEdit() {
    clearTimeout(editTimer);
    const sl = slides.get(editing);
    if (!sl) return;
    // back to what talk.md says: no edit needed
    live.saveNotes(editing, area.value.trim() === sl.notesMd.trim() ? "" : area.value, sl.notesHash);
    editState.textContent = live.status === "open" ? "Live" : "Waiting for the connection";
  }
  function startEdit() {
    const sl = state && slides.get(state.id);
    if (!sl) return;
    editing = sl.id;
    area.value = scriptOf(sl);
    notesEl.hidden = true;
    area.hidden = false;
    editBtn.lastChild.textContent = ` ${"Done"}`;
    editBtn.setAttribute("aria-pressed", "true");
    editState.textContent = "Reaches everyone as you type";
    area.focus();
  }
  function finishEdit() {
    pushEdit();
    editing = null;
    area.hidden = true;
    notesEl.hidden = false;
    editBtn.lastChild.textContent = ` ${"Edit live"}`;
    editBtn.setAttribute("aria-pressed", "false");
    renderNotes(false);
  }
  editBtn.addEventListener("click", () => (editing ? finishEdit() : startEdit()));
  area.addEventListener("input", () => { clearTimeout(editTimer); editTimer = setTimeout(pushEdit, 350); });
  area.addEventListener("keydown", (e) => { if (e.key === "Escape") { finishEdit(); editBtn.focus(); } });

  // ---------------------------------------------------------- backups + questions
  function renderBackups() {
    const list = talk.slides.filter((s) => s.backup);
    $(".pv-backups").hidden = !list.length;
    $(".pv-backups ol").innerHTML = list.map((s) => `<li><button type="button" class="btn" data-jump="${esc(s.id)}">${esc(s.title)}</button></li>`).join("");
  }
  $(".pv-backups").addEventListener("click", (e) => { const b = e.target.closest("[data-jump]"); if (b) go({ id: b.dataset.jump, f: -1 }); });
  // Every question, live: not yet answered first, most votes first. Whoever holds the presenter key can
  // reply in writing (it appears under the question for everyone), mark it answered aloud, delete it for good,
  // or switch on "Approve first", which holds new questions here until they're approved.
  const qList = $(".pq-list");
  const SAID = "Answered in the talk.";
  const drafts = new Map();
  let replying = null, qWas = "";
  function questionRow(q) {
    const slide = slides.get(q.slide);
    const can = live.presenter, canReply = can && live.replies;
    const where = slide ? `${slide.id === state?.id ? "This slide" : esc(slide.title)}` : "General";
    return `<li class="pq${q.answer ? " done" : ""}" data-id="${esc(q.id)}">
      <div class="pq-votes" aria-label="${q.votes} ${q.votes === 1 ? "vote" : "votes"}">${q.votes}</div>
      <div>
        <p>${esc(q.text)}</p>
        <small>${q.pending ? "<b>Only you can see this.</b> " : ""}${esc(q.name || "Anonymous")} · ${where}</small>
        ${q.answer ? `<p class="q-answer"><b>You:</b> ${esc(q.answer)}</p>` : ""}
        ${q.pending ? `<div class="pq-acts">
          ${can ? `<button type="button" class="btn" data-act="approve"><svg data-fa="check" aria-hidden="true" viewBox="0 0 24 24" width="16" height="16"></svg> Approve</button><button type="button" class="btn" data-act="remove"><svg data-fa="trash-can" aria-hidden="true" viewBox="0 0 24 24" width="16" height="16"></svg> Delete</button>` : ""}
        </div>` : replying === q.id ? `<form>
          <label class="sr" for="pq-reply">Your reply to: ${esc(q.text)}</label>
          <textarea class="field" id="pq-reply" maxlength="1200" placeholder="Everyone sees this under the question" required></textarea>
          <div class="row"><button type="submit" class="btn">Send reply</button><button type="button" class="btn" data-act="cancel">Cancel</button></div>
        </form>` : `<div class="pq-acts">
          ${slide && slide.id !== state?.id ? `<button type="button" class="btn" data-act="show"><svg data-fa="arrow-right" aria-hidden="true" viewBox="0 0 24 24" width="16" height="16"></svg> Go to slide</button>` : ""}
          ${canReply ? `<button type="button" class="btn" data-act="reply"><svg data-fa="reply" aria-hidden="true" viewBox="0 0 24 24" width="16" height="16"></svg> ${q.answer ? "Change reply" : "Reply"}</button>` : ""}
          ${canReply && !q.answer ? `<button type="button" class="btn" data-act="said"><svg data-fa="circle-check" aria-hidden="true" viewBox="0 0 24 24" width="16" height="16"></svg> Answered aloud</button>` : ""}
          ${can ? `<button type="button" class="btn" data-act="remove"><svg data-fa="trash-can" aria-hidden="true" viewBox="0 0 24 24" width="16" height="16"></svg> Delete</button>` : ""}
        </div>`}
      </div>
    </li>`;
  }
  function renderQuestions() {
    const on = set.questions === "on" && live.enabled;
    $("[data-qa]").hidden = !on;
    $(".pv-questions").hidden = !on;
    if (!on) return;
    editBtn.hidden = !live.presenter;
    const mod = $(".pq-mod");
    mod.hidden = !live.presenter || !live.moderation;
    mod.setAttribute("aria-pressed", String(live.moderate));
    const qs = live.all();
    $(".pq-count").textContent = qs.length || "";
    const held = qs.filter((q) => q.pending).length;
    $(".pv-scope").textContent = live.presenter ? "You're presenting live: anyone following along moves with you."
      : "Not connected to the relay right now. Your slides, script and timer still work here; it reconnects by itself.";
    document.querySelector('[data-host="new"]').hidden = !live.presenter; // needs the relay; signing out doesn't
    document.querySelector('[data-host="out"]').hidden = false;
    $(".pq-hint").innerHTML = live.status !== "open" ? "Connecting to the questions…"
      : !live.replies || !live.moderation ? "Some actions need the updated relay. Run <code>npx wrangler deploy</code> in <code>worker/</code>."
      : held ? `${held} waiting for your approval.`
      : live.moderate ? "New questions wait here for your approval." : "";
    const html = qs.length ? qs.map(questionRow).join("") : `<li class="pq-empty">No questions yet. They appear here the moment someone asks, most upvoted first.</li>`;
    if (html === qWas) return;
    // the list is rebuilt when anything changes: keep the keyboard where it was
    const now = document.activeElement, typing = now?.id === "pq-reply";
    const row = qList.contains(now) ? now.closest("[data-id]")?.dataset.id : null, act = now?.dataset?.act;
    qList.innerHTML = qWas = html;
    const box = $("#pq-reply");
    if (box) { box.value = drafts.get(replying) || ""; if (typing) box.focus(); }
    if (row && !typing) {
      const r = qList.querySelector(`[data-id="${CSS.escape(row)}"]`);
      // its row may have just been deleted: then the keyboard goes back to the heading
      (r?.querySelector(`[data-act="${act}"]`) || r?.querySelector("button") || $("#pq-title")).focus();
    }
  }
  live.on("questions", renderQuestions);
  live.on("status", renderQuestions);
  $(".pq-mod").addEventListener("click", () => live.setModerate(!live.moderate));
  qList.addEventListener("input", (e) => { if (e.target.id === "pq-reply") drafts.set(replying, e.target.value); });
  qList.addEventListener("keydown", (e) => {
    if (e.target.id !== "pq-reply") return;
    if (e.key === "Escape") { replying = null; renderQuestions(); }
    else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) e.target.form.requestSubmit();
  });
  qList.addEventListener("submit", (e) => {
    e.preventDefault();
    const id = replying;
    live.answer(id, e.target.querySelector("textarea").value);
    drafts.delete(id);
    replying = null;
    renderQuestions();
    qList.querySelector(`[data-id="${CSS.escape(id)}"] button`)?.focus();
  });
  qList.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const id = b.closest("[data-id]").dataset.id, q = live.questions.get(id);
    if (b.dataset.act === "show") go({ id: q.slide, f: -1 });
    else if (b.dataset.act === "reply") { replying = id; if (q.answer && q.answer !== SAID && !drafts.has(id)) drafts.set(id, q.answer); renderQuestions(); $("#pq-reply").focus(); }
    else if (b.dataset.act === "cancel") { replying = null; renderQuestions(); }
    else if (b.dataset.act === "said") live.answer(id, SAID);
    else if (b.dataset.act === "approve") live.approve(id);
    else if (b.dataset.act === "remove") {
      // deleting can't be undone: it takes a second press
      if (b.dataset.sure) return live.hide(id);
      b.dataset.sure = "1";
      b.textContent = "Delete for everyone?";
      setTimeout(() => { if (b.isConnected) { delete b.dataset.sure; b.textContent = "Delete"; } }, 3000);
    }
  });

  // ---------------------------------------------------------- controls
  document.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => go({ dir: b.dataset.go })));
  $("[data-ask]").addEventListener("click", () => channel.postMessage({ t: "ask", on: !ask }));
  $("[data-qa]").addEventListener("click", () => channel.postMessage({ t: "qa", on: !qa }));
  addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest("textarea, input, select")) return;
    const k = e.key;
    if ((k === " " || k === "Enter") && e.target.closest("button, a, summary")) return;
    if ([" ", "ArrowRight", "ArrowDown", "PageDown", "Enter", "n", "N"].includes(k)) { e.preventDefault(); window.HVTactile?.play("press"); go({ dir: "next" }); }
    else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(k)) { e.preventDefault(); window.HVTactile?.play("press"); go({ dir: "prev" }); }
    else if (k === "b" || k === "B") channel.postMessage({ t: "backups" });
    else if (k === "q" || k === "Q") channel.postMessage({ t: "qa", on: !qa });
    else if (k === "t" || k === "T") HVTheme.cycle();
  });

  // ---------------------------------------------------------- the host's passphrase
  const newkey = $(".pv-newkey"), newValue = $(".pv-newkey-value"), newNote = $(".pv-newkey-note");
  let words = null, candidate = "";
  async function makePassphrase() {
    words = words || (await fetch("words.txt").then((r) => r.text())).trim().split("\n");
    const picks = crypto.getRandomValues(new Uint32Array(6));
    // 2048 words, six times over: about 66 bits, and unbiased because 2048 divides 2^32
    candidate = [...picks].map((n) => words[n % words.length]).join("-");
    newValue.textContent = candidate;
    newNote.textContent = "";
  }
  document.querySelector('[data-host="new"]').addEventListener("click", async () => {
    await makePassphrase();
    newkey.hidden = false;
    newValue.focus();
  });
  document.querySelector('[data-host="out"]').addEventListener("click", () => {
    live.signOut();
    channel.postMessage({ t: "signout" });
    localStorage.removeItem(HOST);
    store.set("hv.presenter", null);
    localStorage.removeItem("hv.presenter");
    location.reload();
  });
  newkey.addEventListener("click", async (e) => {
    const act = e.target.closest("[data-newkey]")?.dataset.newkey;
    if (!act) return;
    if (act === "cancel") { newkey.hidden = true; candidate = ""; newValue.textContent = ""; document.querySelector('[data-host="new"]').focus(); }
    else if (act === "again") await makePassphrase();
    else if (act === "copy") {
      try { await navigator.clipboard.writeText(candidate); newNote.textContent = "Copied."; }
      catch { newNote.textContent = "Couldn't copy. Select the passphrase above instead."; }
    } else if (act === "use") {
      newNote.textContent = "Saving…";
      const ok = await live.changeKey(candidate);
      if (!ok) { newNote.textContent = "That didn't work. Your old passphrase still holds."; return; }
      store.set(HOST, candidate);
      newNote.textContent = "Done. This is your passphrase now.";
      hello();
      setTimeout(() => { newkey.hidden = true; candidate = ""; newValue.textContent = ""; }, 1800);
    }
  });
  newkey.addEventListener("keydown", (e) => { if (e.key === "Escape") newkey.querySelector('[data-newkey="cancel"]').click(); });

  document.title = `${set.title} · Presenter`;
  renderNotes(true);
  renderQuestions();
  tick();
})();
