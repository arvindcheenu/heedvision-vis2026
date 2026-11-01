// Transcript page: reads talk.md, shows every slide live next to its script,
// and (when talk.md switches them on) follows the presenter and takes questions.
(async function () {
  const live = window.HVLive;
  const root = document.getElementById("transcript");
  const tocList = document.querySelector(".toc ol");
  const pill = document.querySelector(".live-pill");
  const pillText = pill.querySelector(".live-text");
  const followBtn = pill.querySelector(".follow");
  const jump = document.querySelector(".jump-live");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  let talk;
  try {
    talk = MDeck.render(await fetch("../slides/talk.md", { cache: "no-cache" }).then((r) => r.text()));
  } catch {
    root.innerHTML = `<p class="loading">Couldn't load the talk. <a href="../slides/">Open the slides</a>.</p>`;
    return;
  }
  const set = talk.settings;
  const useQuestions = set.questions === "on" && !!set.live;
  const useFollow = set.follow && !!set.live;
  document.querySelectorAll("[data-meta]").forEach((el) => { const v = talk.meta[el.dataset.meta]; if (v) el.innerHTML = marked.parseInline(v); });
  const intro = document.querySelector("[data-live-intro]");
  intro.textContent = useFollow && useQuestions ? "During the talk this page follows along by itself, and each slide has its own question thread."
    : useFollow ? "During the talk this page follows along by itself."
    : set.questions === "link" ? "Questions go through the venue's Q&A." : "";

  // ---------- build
  root.innerHTML = "";
  const entries = [];
  let chapter = null, chEl = null;
  talk.slides.forEach((s, i) => {
    const n = i + 1;
    if (s.chapter !== chapter) {
      chapter = s.chapter;
      chEl = document.createElement("section");
      chEl.className = "chapter";
      chEl.innerHTML = `<h2 class="section-title">${esc(chapter)}</h2>`;
      root.appendChild(chEl);
      tocList.insertAdjacentHTML("beforeend", `<li class="ch">${esc(chapter)}</li>`);
    }
    const art = document.createElement("article");
    art.className = "entry";
    art.id = `s-${s.id}`;
    art.innerHTML = `
      <h3><span class="n">${String(n).padStart(2, "0")}</span>${esc(s.title)}<span class="live-tag">On screen now</span></h3>
      <div class="deck-frame card"><img loading="lazy" decoding="async" src="../slides/assets/posters/${encodeURIComponent(s.id)}.jpg" alt="Slide ${n}: ${esc(s.title)}"></div>
      <div class="deck-ctl">
        <button class="btn" type="button" data-go="prev" aria-label="Previous build" disabled>‹</button>
        <button class="btn" type="button" data-go="next" aria-label="Next build" disabled>›</button>
        <span class="pos">Click the slide to step through it</span>
        <a href="../slides/#/${encodeURIComponent(s.id)}" target="_blank" rel="noopener">Open in the deck ↗</a>
      </div>
      <div class="prose script">${s.notes.replace(/\[click\]/g, '<span class="click">click</span>')}</div>
      ${useQuestions ? `<details class="qs card">
        <summary>Questions on this slide <span class="count">0</span></summary>
        <div class="qs-body">
          <div class="list"></div>
          <form>
            <textarea name="text" maxlength="600" placeholder="Ask about this slide…" required></textarea>
            <div class="row"><input name="name" maxlength="60" placeholder="Name (optional)" autocomplete="name"><button class="btn primary" type="submit">Ask</button></div>
            <div class="note"></div>
          </form>
        </div>
      </details>` : set.questions === "link" ? `<a class="btn" href="${esc(set.questionsUrl)}" target="_blank" rel="noopener">Ask in the venue's Q&amp;A ↗</a>` : ""}`;
    const e = { id: s.id, title: s.title, n, el: art };
    art.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => send(e, { dir: b.dataset.go })));
    chEl.appendChild(art);
    tocList.insertAdjacentHTML("beforeend", `<li><a href="#s-${esc(s.id)}" data-slide="${esc(s.id)}"><span class="ld"></span><span>${esc(s.title)}</span><span class="qn"></span></a></li>`);
    entries.push(e);
  });
  if (location.hash) document.fonts.ready.then(() => document.querySelector(location.hash)?.scrollIntoView());
  mountLiveSlides();
  observeReading();
  if (useQuestions) wireQuestions();
  live.start({ endpoint: useFollow || useQuestions ? set.live : "", room: set.room });
  if (useFollow) {
    live.on("slide", onLiveSlide);
    live.on("status", onStatus);
    if (live.slide) onLiveSlide(live.slide);
  }

  // ---------- live slides: the real slide replaces the poster near the viewport
  function mountLiveSlides() {
    const io = new IntersectionObserver((list) => list.forEach((en) => {
      const e = entries.find((x) => x.el === en.target);
      if (en.isIntersecting) mount(e); else unmount(e);
    }), { rootMargin: "900px 0px" });
    entries.forEach((e) => io.observe(e.el));
  }
  function mount(e) {
    if (!e || e.frame) return;
    const box = e.el.querySelector(".deck-frame");
    const f = document.createElement("iframe");
    f.src = `../slides/?embed=${encodeURIComponent(e.id)}`;
    f.title = `Slide ${e.n}: ${e.title}`;
    f.allow = "fullscreen; autoplay";
    f.addEventListener("load", () => box.classList.add("ready"));
    box.appendChild(f);
    e.frame = f;
  }
  function unmount(e) {
    if (!e || !e.frame) return;
    e.frame.remove();
    e.frame = null;
    e.el.querySelector(".deck-frame").classList.remove("ready");
    e.el.querySelectorAll("[data-go]").forEach((b) => (b.disabled = true));
  }
  function send(e, msg) {
    if (e && e.frame && e.frame.contentWindow) e.frame.contentWindow.postMessage({ hv: "go", ...msg }, location.origin);
  }
  addEventListener("message", (ev) => {
    if (ev.origin !== location.origin || !ev.data || ev.data.hv !== "state") return;
    const e = entries.find((x) => x.frame && x.frame.contentWindow === ev.source);
    if (!e) return;
    e.el.querySelector('[data-go="prev"]').disabled = !ev.data.prev;
    e.el.querySelector('[data-go="next"]').disabled = !ev.data.next;
    if (e.pendingBuild != null) { send(e, { dir: "build", f: e.pendingBuild }); e.pendingBuild = null; }
  });

  // ---------- questions
  function wireQuestions() {
    entries.forEach(({ id, el }) => {
      const form = el.querySelector("form");
      const note = form.querySelector(".note");
      form.addEventListener("submit", (ev) => {
        ev.preventDefault();
        const ok = live.ask(id, form.text.value, form.name.value);
        note.textContent = ok ? (live.status === "open" ? "Sent. Thanks!" : "Saved; it will send when the connection is back.") : "Questions are offline right now.";
        if (ok) form.text.value = "";
      });
      el.querySelector(".list").addEventListener("click", (ev) => {
        const b = ev.target.closest("button[data-vote]");
        if (b) { live.vote(b.dataset.vote); renderQuestions(); }
      });
    });
    live.on("questions", renderQuestions);
    renderQuestions();
  }
  function renderQuestions() {
    entries.forEach(({ id, el }) => {
      const qs = live.forSlide(id);
      const c = el.querySelector(".count");
      c.textContent = qs.length;
      c.classList.toggle("has", qs.length > 0);
      el.querySelector(".list").innerHTML = qs.length
        ? qs.map((q) => `<div class="q"><div><p>${esc(q.text)}</p><small>${esc(q.name || "Anonymous")}</small></div><button type="button" data-vote="${esc(q.id)}" aria-pressed="${live.voted.has(q.id)}" aria-label="Upvote">▲ ${q.votes}</button></div>`).join("")
        : `<div class="empty">No questions yet.</div>`;
      const t = tocList.querySelector(`a[data-slide="${CSS.escape(id)}"] .qn`);
      if (t) t.textContent = qs.length || "";
    });
  }

  // ---------- reading position -> contents highlight
  function observeReading() {
    const io = new IntersectionObserver((list) => list.forEach((en) => {
      if (!en.isIntersecting) return;
      tocList.querySelectorAll("a.here").forEach((a) => a.classList.remove("here"));
      tocList.querySelector(`a[data-slide="${CSS.escape(en.target.id.slice(2))}"]`)?.classList.add("here");
    }), { rootMargin: "-40% 0px -55% 0px" });
    entries.forEach((e) => io.observe(e.el));
  }

  // ---------- follow the presenter
  let following = true, lastLive = null, programmatic = false;
  function onStatus(s) {
    pill.hidden = false;
    if (s !== "open") pillText.textContent = s === "connecting" ? "Connecting…" : "Offline";
  }
  function onLiveSlide(s) {
    lastLive = s;
    const e = entries.find((x) => x.id === s.id);
    entries.forEach((x) => x.el.classList.toggle("live", x === e));
    tocList.querySelectorAll("a").forEach((a) => a.classList.toggle("live", a.dataset.slide === s.id));
    if (!e) return;
    if (e.frame) send(e, { dir: "build", f: s.f }); else e.pendingBuild = s.f;
    pill.hidden = false;
    pillText.textContent = `Live · ${e.n}. ${e.title}`;
    if (following) scrollToLive(); else jump.hidden = false;
  }
  function scrollToLive() {
    const e = lastLive && entries.find((x) => x.id === lastLive.id);
    if (!e) return;
    programmatic = true;
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches || document.hidden;
    e.el.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
    // smooth scrolling is skipped in background tabs; make sure we got there
    setTimeout(() => {
      if (Math.abs(e.el.getBoundingClientRect().top - 76) > 40) e.el.scrollIntoView({ block: "start" });
      programmatic = false;
    }, 900);
    jump.hidden = true;
  }
  function setFollow(onOff) {
    following = onOff;
    followBtn.setAttribute("aria-pressed", String(onOff));
    followBtn.textContent = onOff ? "Following" : "Follow";
    if (onOff) scrollToLive(); else if (lastLive) jump.hidden = false;
  }
  followBtn.addEventListener("click", () => setFollow(!following));
  jump.addEventListener("click", () => setFollow(true));
  // reading on your own pauses following
  ["wheel", "touchmove", "keydown"].forEach((t) => addEventListener(t, (ev) => {
    if (programmatic || !following || !lastLive) return;
    if (t === "keydown" && !["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "].includes(ev.key)) return;
    if (ev.target.closest && ev.target.closest("textarea,input")) return;
    setFollow(false);
  }, { passive: true }));
  document.addEventListener("focusin", (ev) => { if (ev.target.matches("textarea,input") && following && lastLive) setFollow(false); });
})();
