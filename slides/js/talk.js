// Transcript page: reads the slides and speaker notes straight from the deck,
// renders slide card + script + question thread per slide, and follows the
// presenter when the live layer is connected.
(function () {
  const HV = window.HV || {};
  const live = window.HVLive;
  const root = document.getElementById("transcript");
  const tocList = document.querySelector(".toc ol");
  const pill = document.querySelector(".live-pill");
  const pillText = pill.querySelector(".live-text");
  const followBtn = pill.querySelector(".follow");
  const jump = document.querySelector(".jump-live");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  for (const [k, url] of Object.entries(HV.links || {})) {
    const a = document.querySelector(`[data-link="${k}"]`);
    if (a && url) { a.href = url; a.hidden = false; a.target = "_blank"; a.rel = "noopener"; }
  }

  let entries = [];
  let following = true;

  fetch("../slides/index.html")
    .then((r) => r.text())
    .then((html) => build(new DOMParser().parseFromString(html, "text/html")))
    .catch(() => { root.innerHTML = `<p class="loading">Couldn't load the slides. <a href="../slides/">Open them directly</a>.</p>`; });

  function build(doc) {
    const sections = [...doc.querySelectorAll(".reveal .slides > section")];
    let chapter = null, chEl = null, n = 0;
    root.innerHTML = "";
    tocList.innerHTML = "";
    sections.forEach((s) => {
      n++;
      const id = s.id;
      const title = s.dataset.title || (s.querySelector("h1,h2") || {}).textContent || `Slide ${n}`;
      if (s.dataset.chapter !== chapter) {
        chapter = s.dataset.chapter;
        chEl = document.createElement("section");
        chEl.className = "chapter";
        chEl.innerHTML = `<h2>${esc(chapter)}</h2>`;
        root.appendChild(chEl);
        tocList.insertAdjacentHTML("beforeend", `<li class="ch">${esc(chapter)}</li>`);
      }
      const notes = s.querySelector("aside.notes");
      const script = notes ? notes.innerHTML.replace(/\[click\]/g, '<span class="click">click</span>') : "";
      const art = document.createElement("article");
      art.className = "entry";
      art.id = `s-${id}`;
      art.dataset.slide = id;
      art.innerHTML = `
        <span class="live-tag">● On screen now</span>
        <h3><span class="n">${String(n).padStart(2, "0")}</span>${esc(title)}</h3>
        <div class="slide-card">
          <img loading="lazy" decoding="async" src="../slides/assets/posters/${encodeURIComponent(id)}.jpg" alt="Slide ${n}: ${esc(title)}">
        </div>
        <div class="slide-ctl">
          <button type="button" data-go="prev" aria-label="Previous build" disabled>‹</button>
          <button type="button" data-go="next" aria-label="Next build" disabled>›</button>
          <span class="hint">Click the slide or use the arrows to step through it</span>
          <a href="../slides/#/${encodeURIComponent(id)}" target="_blank" rel="noopener">Open in the deck ↗</a>
        </div>
        <div class="script">${script}</div>
        <details class="qs">
          <summary>Questions on this slide <span class="count">0</span></summary>
          <div class="body">
            <div class="list"></div>
            <form>
              <textarea name="text" maxlength="600" placeholder="Ask about this slide…" required></textarea>
              <div class="row"><input name="name" maxlength="60" placeholder="Name (optional)" autocomplete="name"><button type="submit">Ask</button></div>
              <div class="note"></div>
            </form>
          </div>
        </details>`;
      art.querySelectorAll("[data-go]").forEach((b) =>
        b.addEventListener("click", () => send(entries.find((x) => x.el === art), { dir: b.dataset.go })));
      chEl.appendChild(art);
      tocList.insertAdjacentHTML("beforeend", `<li><a href="#s-${esc(id)}" data-slide="${esc(id)}"><span class="ld"></span><span>${esc(title)}</span><span class="qn"></span></a></li>`);
      entries.push({ id, title, n, el: art });
    });
    wireQuestions();
    observeReading();
    mountLiveSlides();
    // re-apply the hash once fonts have settled the layout
    if (location.hash) document.fonts.ready.then(() => document.querySelector(location.hash)?.scrollIntoView());
    if (live) {
      live.on("questions", renderQuestions);
      live.on("slide", onLiveSlide);
      live.on("status", onStatus);
      onStatus(live.status);
      if (live.slide) onLiveSlide(live.slide);
    }
    renderQuestions();
  }

  // ---------- live slides
  // Each card shows the poster until it nears the viewport, then the real slide
  // (the deck in ?embed=<id> mode). Far-away slides are unloaded again.
  function mountLiveSlides() {
    const io = new IntersectionObserver((list) => {
      list.forEach((en) => {
        const e = entries.find((x) => x.el === en.target);
        if (en.isIntersecting) mount(e); else unmount(e);
      });
    }, { rootMargin: "900px 0px" });
    entries.forEach((e) => io.observe(e.el));
  }
  function mount(e) {
    if (!e || e.frame) return;
    const card = e.el.querySelector(".slide-card");
    const f = document.createElement("iframe");
    f.src = `../slides/?embed=${encodeURIComponent(e.id)}`;
    f.title = `Slide ${e.n}: ${e.title}`;
    f.allow = "fullscreen; autoplay";
    f.addEventListener("load", () => card.classList.add("ready"));
    card.appendChild(f);
    e.frame = f;
  }
  function unmount(e) {
    if (!e || !e.frame) return;
    e.frame.remove();
    e.frame = null;
    e.el.querySelector(".slide-card").classList.remove("ready");
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
  // mirror the room: the live slide shows the same build as the projector
  function syncBuild(s) {
    const e = entries.find((x) => x.id === s.id);
    if (!e) return;
    if (e.frame) send(e, { dir: "build", f: s.f });
    else e.pendingBuild = s.f;
  }

  // ---------- questions
  function wireQuestions() {
    entries.forEach(({ id, el }) => {
      const form = el.querySelector("form");
      const note = form.querySelector(".note");
      if (!live || !live.enabled) {
        form.querySelector("button").disabled = true;
        note.textContent = "Questions aren't connected on this copy of the page.";
      }
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const ok = live && live.ask(id, form.text.value, form.name.value);
        note.textContent = ok ? (live.status === "open" ? "Sent. Thanks!" : "Saved; it will send when the connection is back.") : "Questions are offline right now.";
        if (ok) form.text.value = "";
      });
      el.querySelector(".list").addEventListener("click", (e) => {
        const b = e.target.closest("button[data-vote]");
        if (b && live) { live.vote(b.dataset.vote); renderQuestions(); }
      });
    });
  }

  function renderQuestions() {
    entries.forEach(({ id, el }) => {
      const qs = live ? live.forSlide(id) : [];
      const c = el.querySelector(".count");
      c.textContent = qs.length;
      c.classList.toggle("has", qs.length > 0);
      el.querySelector(".list").innerHTML = qs.length
        ? qs.map((q) => `<div class="q"><div><p>${esc(q.text)}</p><small>${esc(q.name || "Anonymous")}</small></div><button type="button" data-vote="${esc(q.id)}" aria-pressed="${live.voted.has(q.id)}" aria-label="Upvote">▲ ${q.votes}</button></div>`).join("")
        : `<div class="empty">No questions yet.</div>`;
      const t = tocList.querySelector(`a[data-slide="${CSS.escape(id)}"] .qn`);
      if (t) t.textContent = qs.length ? qs.length : "";
    });
  }

  // ---------- reading position -> TOC highlight
  function observeReading() {
    const io = new IntersectionObserver((list) => {
      list.forEach((en) => {
        if (!en.isIntersecting) return;
        tocList.querySelectorAll("a.here").forEach((a) => a.classList.remove("here"));
        tocList.querySelector(`a[data-slide="${CSS.escape(en.target.dataset.slide)}"]`)?.classList.add("here");
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    entries.forEach((e) => io.observe(e.el));
  }

  // ---------- live follow
  let lastLive = null;
  function onStatus(s) {
    pill.hidden = !(live && live.enabled);
    if (s !== "open") pillText.textContent = s === "connecting" ? "Connecting…" : "Offline";
  }
  function onLiveSlide(s) {
    lastLive = s;
    const e = entries.find((x) => x.id === s.id);
    entries.forEach((x) => x.el.classList.toggle("live", x === e));
    tocList.querySelectorAll("a").forEach((a) => a.classList.toggle("live", a.dataset.slide === s.id));
    if (!e) return;
    syncBuild(s);
    pill.hidden = false;
    pillText.textContent = `Live · ${e.n}. ${e.title}`;
    if (following) scrollToLive();
    else jump.hidden = false;
  }
  let programmatic = false;
  function scrollToLive() {
    const e = lastLive && entries.find((x) => x.id === lastLive.id);
    if (!e) return;
    programmatic = true;
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches || document.hidden;
    e.el.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
    // smooth scrolling is skipped in background tabs; make sure we got there
    setTimeout(() => {
      if (Math.abs(e.el.getBoundingClientRect().top - 84) > 40) e.el.scrollIntoView({ block: "start" });
      programmatic = false;
    }, 900);
    jump.hidden = true;
  }
  function setFollow(on) {
    following = on;
    followBtn.setAttribute("aria-pressed", String(on));
    followBtn.textContent = on ? "Following" : "Follow";
    if (on) scrollToLive();
    else if (lastLive) jump.hidden = false;
  }
  followBtn.addEventListener("click", () => setFollow(!following));
  jump.addEventListener("click", () => setFollow(true));
  // reading on your own pauses following
  ["wheel", "touchmove", "keydown"].forEach((t) =>
    addEventListener(t, (e) => {
      if (programmatic || !following || !lastLive) return;
      if (t === "keydown" && !["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "].includes(e.key)) return;
      if (e.target.closest && e.target.closest("textarea,input")) return;
      setFollow(false);
    }, { passive: true }));
  // typing a question also pauses it
  document.addEventListener("focusin", (e) => { if (e.target.matches("textarea,input") && following && lastLive) setFollow(false); });
})();
