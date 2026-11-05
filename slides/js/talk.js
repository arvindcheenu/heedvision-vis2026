// Transcript page: reads talk.md and shows everything said in the talk, with the
// slides pinned above (one live deck, not an image per slide). The pinned slide
// follows your reading position, down to each [click]; tapping a line shows its
// slide; stepping the slide scrolls the script. When talk.md switches them on, it
// follows the presenter and takes questions per slide.
(async function () {
  const live = window.HVLive;
  const preRender = (src) => MDeck.prepare(src, "../slides/");
  const root = document.getElementById("transcript");
  const tocList = document.querySelector(".toc ol");
  const frame = document.getElementById("stage-deck");
  const stage = document.querySelector(".talk-stage");
  const pos = stage.querySelector(".pos");
  const liveBtn = stage.querySelector(".live-btn");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  let talk;
  try {
    const md = await fetch("../slides/talk.md", { cache: "no-cache" }).then((r) => r.text());
    await preRender(md);
    talk = MDeck.render(md);
  } catch {
    root.innerHTML = `<p class="loading">Couldn't load the talk. <a href="../slides/">Open the slides</a>.</p>`;
    return;
  }
  const set = talk.settings;
  const useQuestions = set.questions === "on" && !!set.live;
  const useFollow = set.follow && !!set.live;
  document.querySelectorAll("[data-meta]").forEach((el) => { const v = talk.meta[el.dataset.meta]; if (v) el.innerHTML = marked.parseInline(v); });
  document.querySelector("[data-live-intro]").textContent = useFollow && useQuestions ? "During the talk it follows the speaker by itself, and every slide has its own question thread."
    : useFollow ? "During the talk it follows the speaker by itself."
    : set.questions === "link" ? "Questions go through the venue's Q&A." : "";

  // ---------------------------------------------------------- build
  root.innerHTML = "";
  const entries = [];
  const main = talk.slides.filter((s) => !s.backup);
  let chapter = null, chEl = null, chapterNo = -1;
  const colourOf = (n) => `var(--c${(n % 6) + 1})`; // each section has its own colour
  talk.slides.forEach((s) => {
    const n = s.backup ? "B" : String(main.indexOf(s) + 1).padStart(2, "0");
    if (s.chapter !== chapter) {
      chapter = s.chapter;
      chEl = document.createElement("section");
      chEl.className = "chapter";
      chapterNo++;
      chEl.style.setProperty("--sec", colourOf(chapterNo));
      chEl.setAttribute("aria-labelledby", `ch-${chapterNo}`);
      chEl.innerHTML = `<h2 class="section-title" id="ch-${chapterNo}">${esc(chapter)}${s.backup ? ` <span class="sub">Spare slides for questions</span>` : ""}</h2>`;
      root.appendChild(chEl);
      tocList.insertAdjacentHTML("beforeend", `<li class="ch" style="--sec:${colourOf(chapterNo)}">${esc(chapter)}</li>`);
    }
    const art = document.createElement("article");
    art.className = "entry";
    art.id = `s-${s.id}`;
    art.setAttribute("aria-labelledby", `t-${s.id}`);
    art.innerHTML = `
      <h3 data-f="-1" id="t-${esc(s.id)}"><span class="n">${n}</span><button type="button" class="entry-go" title="Show this slide">${esc(s.title)}</button><span class="live-tag">On screen now</span></h3>
      <div class="prose script"></div>
      ${useQuestions ? `<details class="qs">
        <summary>Questions <span class="count"><span class="sr">asked so far: </span><span class="num">0</span></span></summary>
        <div class="qs-body">
          <ul class="q-list" role="list" aria-live="polite"></ul>
          <form class="ask-form">
            <label class="sr" for="q-${esc(s.id)}">Your question about ${esc(s.title)}</label>
            <textarea class="field" id="q-${esc(s.id)}" name="text" maxlength="600" placeholder="Ask about this slide…" required></textarea>
            <div class="row"><label class="sr" for="n-${esc(s.id)}">Your name, optional</label><input class="field" id="n-${esc(s.id)}" name="name" maxlength="60" placeholder="Name (optional)" autocomplete="name"><button class="btn" type="submit">Ask</button></div>
            <p class="q-note" role="status"></p>
          </form>
        </div>
      </details>` : set.questions === "link" ? `<a class="btn" href="${esc(set.questionsUrl)}" target="_blank" rel="noopener">Ask in the venue's Q&amp;A ↗</a>` : ""}`;
    const e = { id: s.id, slide: s, title: s.title, n, el: art };
    chEl.appendChild(art);
    tocList.insertAdjacentHTML("beforeend", `<li style="--sec:${colourOf(chapterNo)}"><a href="#s-${esc(s.id)}" style="--sec:${colourOf(chapterNo)}" data-slide="${esc(s.id)}"><span class="ld"></span><span>${esc(s.title)}</span><span class="qn"></span></a></li>`);
    entries.push(e);
    renderScript(e);
  });
  const byId = (id) => entries.find((x) => x.id === id);

  // slide progress under the pinned slide: one coloured segment per section
  const slideBar = document.querySelector(".slide-progress");
  const sections = [];
  main.forEach((s) => { const last = sections[sections.length - 1]; if (last && last.name === s.chapter) last.slides.push(s); else sections.push({ name: s.chapter, slides: [s] }); });
  slideBar.innerHTML = sections.map((c, i) => `<span style="flex:${c.slides.length};--sec:${colourOf(i)}"><i></i></span>`).join("");
  function showSlideProgress(slide) {
    const at = main.indexOf(slide);
    let seen = 0;
    sections.forEach((c, i) => {
      const inSection = Math.max(0, Math.min(c.slides.length, at + 1 - seen));
      slideBar.children[i].firstChild.style.setProperty("--p", `${(inSection / c.slides.length) * 100}%`);
      seen += c.slides.length;
    });
  }
  // the contents list's own scroll progress
  HVProgress.rail(tocList, entries.map((e) => ({ el: e.el, link: tocList.querySelector(`a[data-slide="${CSS.escape(e.id)}"]`) })), {
    line: () => stage.getBoundingClientRect().bottom + Math.max(80, (innerHeight - stage.getBoundingClientRect().bottom) * 0.3),
  });

  // the script, with an edit from the presenter view if one applies
  function renderScript(e) {
    const edit = live.noteFor ? live.noteFor(e.slide) : null;
    let k = 0;
    e.el.querySelector(".script").innerHTML = MDeck.renderNotes(edit ? edit.md : e.slide.notesMd)
      .replace(/\[click\]/g, () => `<button type="button" class="click" data-f="${k++}" title="Show this build">click</button>`);
    e.markers = [...e.el.querySelectorAll("[data-f]")];
  }
  // the presenter's edits arrive while you read
  live.on("notes", () => { entries.forEach(renderScript); if (shown) markReading(shown.id, shown.f); });

  // ---------------------------------------------------------- the pinned slide
  let ready = false, shown = null, want = null;
  const stageH = () => stage.getBoundingClientRect().bottom;
  new ResizeObserver(() => document.documentElement.style.setProperty("--stage-h", `${stage.offsetHeight}px`)).observe(stage);
  let retries = 0;
  function show(id, f) {
    if (!want || want.id !== id || want.f !== f) retries = 0;
    want = { id, f };
    if (!ready || (shown && shown.id === id && shown.f === f)) return;
    frame.contentWindow.postMessage({ hv: "go", id, f }, location.origin);
  }
  stage.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => {
    stepping = true;
    frame.contentWindow.postMessage({ hv: "go", dir: b.dataset.go }, location.origin);
  }));
  // the deck may have said it's ready before this listener existed: ask it again until it answers
  const askDeck = () => { try { frame.contentWindow.postMessage({ hv: "hello" }, location.origin); } catch {} };
  const helloTimer = setInterval(() => { if (ready) clearInterval(helloTimer); else askDeck(); }, 250);
  let stepping = false; // the reader moved the slide itself (buttons or a click on it)
  // a click inside the slide steps it too. The frame may have loaded already, so listen now as well.
  const markStepping = () => (stepping = true);
  const watchFrame = () => { try { frame.contentDocument.addEventListener("click", markStepping, true); } catch {} };
  frame.addEventListener("load", watchFrame);
  watchFrame();
  addEventListener("message", (ev) => {
    if (ev.origin !== location.origin || ev.source !== frame.contentWindow || !ev.data || ev.data.hv !== "state") return;
    const s = ev.data;
    if (!ready) { ready = true; frame.parentElement.classList.add("ready"); if (want) show(want.id, want.f); }
    shown = { id: s.id, f: s.f };
    stage.querySelector('[data-go="prev"]').disabled = !s.prev;
    stage.querySelector('[data-go="next"]').disabled = !s.next;
    const e = byId(s.id);
    if (e && !e.slide.backup) showSlideProgress(e.slide);
    pos.textContent = e ? `${e.n === "B" ? "Backup" : `${Number(e.n)} / ${main.length}`} · ${e.title}` : "";
    markReading(s.id, s.f);
    if (stepping) { stepping = false; want = { id: s.id, f: s.f }; scrollToMarker(s.id, s.f); }
    // the deck can report an in-between state while it changes slides; ask again (a little)
    else if (want && (want.id !== s.id || want.f !== s.f) && retries++ < 3) setTimeout(() => frame.contentWindow.postMessage({ hv: "go", ...want }, location.origin), 120);
  });

  // ---------------------------------------------------------- reading position → slide
  let programmatic = false, programmaticTimer = 0, landing = null;
  function markerOf(id, f) {
    const e = byId(id);
    if (!e) return null;
    return e.markers.find((m) => +m.dataset.f === f) || e.markers.filter((m) => +m.dataset.f <= f).pop() || e.markers[0];
  }
  function markReading(id, f) {
    entries.forEach((x) => x.el.classList.toggle("reading", x.id === id));
    document.querySelectorAll(".script .click.at").forEach((c) => c.classList.remove("at"));
    const m = markerOf(id, f);
    if (m && m.classList.contains("click")) m.classList.add("at");
    tocList.querySelectorAll("a.here").forEach((a) => { a.classList.remove("here"); a.removeAttribute("aria-current"); });
    // keep the current entry in view in the sidebar, without moving the page
    const here = tocList.querySelector(`a[data-slide="${CSS.escape(id)}"]`);
    if (here) {
      here.classList.add("here");
      here.setAttribute("aria-current", "location");
      const box = document.querySelector(".toc-inner");
      if (box && box.scrollHeight > box.clientHeight) {
        const a = here.getBoundingClientRect(), b = box.getBoundingClientRect();
        if (a.top < b.top + 40 || a.bottom > b.bottom - 40) box.scrollTop += a.top - b.top - box.clientHeight / 2 + a.height / 2;
      }
    }
  }
  const readingLine = () => stageH() + Math.max(80, (innerHeight - stageH()) * 0.3);
  function scrollToMarker(id, f, smooth = true) {
    const m = markerOf(id, f);
    if (!m) return;
    programmatic = true;
    clearTimeout(programmaticTimer);
    const y = scrollY + m.getBoundingClientRect().top - (readingLine() - 24);
    const calm = !smooth || matchMedia("(prefers-reduced-motion: reduce)").matches || document.hidden;
    scrollTo({ top: Math.max(0, y), behavior: calm ? "auto" : "smooth" });
    // a long jump takes a while: don't let the slides it scrolls past take over until it lands
    const land = () => { clearTimeout(programmaticTimer); programmaticTimer = setTimeout(() => (programmatic = false), 80); };
    removeEventListener("scrollend", landing);
    landing = land;
    if (calm || Math.abs(scrollY - Math.max(0, y)) < 2 || !("onscrollend" in window)) programmaticTimer = setTimeout(() => (programmatic = false), calm ? 80 : 900);
    else { programmaticTimer = setTimeout(() => (programmatic = false), 8000); addEventListener("scrollend", land, { once: true }); }
  }
  let raf = 0;
  function onScroll() {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      if (programmatic) return;
      const line = readingLine();
      let best = null;
      for (const e of entries) for (const m of e.markers) {
        if (m.getBoundingClientRect().top <= line) best = { id: e.id, f: +m.dataset.f };
        else break;
      }
      best = best || { id: entries[0].id, f: -1 };
      if (!shown || best.id !== shown.id || best.f !== shown.f) settleOn(best);
    });
  }
  // A fast scroll passes many slides; change the pinned one only once the reading
  // position rests (or every 400 ms while it keeps moving), so it doesn't strobe.
  let settleTimer = 0, lastShow = 0;
  function settleOn(b) {
    clearTimeout(settleTimer);
    const go = () => { lastShow = performance.now(); show(b.id, b.f); };
    if (performance.now() - lastShow > 400) go();
    else settleTimer = setTimeout(go, 140);
  }
  addEventListener("scroll", onScroll, { passive: true });

  // tap a line (or a click chip) to show its slide
  root.addEventListener("click", (ev) => {
    if (ev.target.closest("details, a, form")) return;
    if (!getSelection().isCollapsed) return; // selecting text, not asking for a slide
    const art = ev.target.closest(".entry");
    if (!art) return;
    const e = byId(art.id.slice(2));
    const chip = ev.target.closest("[data-f]");
    let f = chip ? +chip.dataset.f : -1;
    if (!chip) for (const m of e.markers) if (m.compareDocumentPosition(ev.target) & Node.DOCUMENT_POSITION_FOLLOWING) f = +m.dataset.f;
    setFollow(false);
    show(e.id, f);
    if (chip) scrollToMarker(e.id, f);
  });

  // ---------------------------------------------------------- questions
  if (useQuestions) {
    entries.forEach(({ id, el }) => {
      const form = el.querySelector("form");
      const note = form.querySelector(".q-note");
      form.addEventListener("submit", (ev) => {
        ev.preventDefault();
        const ok = live.ask(id, form.text.value, form.name.value);
        note.textContent = ok ? (live.status === "open" ? "Sent. Thanks! The speaker can see it now." : "Saved; it will send when the connection is back.") : "Questions are offline right now.";
        if (ok) form.text.value = "";
      });
      el.querySelector(".q-list").addEventListener("click", (ev) => {
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
      if (c) { c.querySelector(".num").textContent = qs.length; c.classList.toggle("has", qs.length > 0); }
      const list = el.querySelector(".q-list");
      if (list) live.fill(list, qs, "No questions yet. Be the first.");
      const t = tocList.querySelector(`a[data-slide="${CSS.escape(id)}"] .qn`);
      if (t) t.textContent = qs.length || "";
    });
  }

  // ---------------------------------------------------------- follow the presenter
  let following = false, lastLive = null;
  const fresh = (s) => s && (!s.ts || Date.now() - s.ts < 3 * 3600 * 1000);
  function setFollow(on) {
    following = on && !!lastLive;
    liveBtn.hidden = !lastLive || following;
    if (following) { show(lastLive.id, lastLive.f); scrollToMarker(lastLive.id, lastLive.f); }
  }
  function onLiveSlide(s) {
    if (!fresh(s)) return;
    const first = !lastLive;
    lastLive = s;
    const e = byId(s.id);
    entries.forEach((x) => x.el.classList.toggle("live", x === e));
    tocList.querySelectorAll("a").forEach((a) => a.classList.toggle("live", a.dataset.slide === s.id));
    if (!e) return;
    if (first && !location.hash) setFollow(true);
    else if (following) { show(s.id, s.f); scrollToMarker(s.id, s.f); }
    else liveBtn.hidden = false;
  }
  liveBtn.addEventListener("click", () => setFollow(true));
  // this browser is presenting: it never needs to rejoin itself
  try { if (localStorage.getItem("hv.presenter") === "1") document.body.classList.add("presenting"); } catch {}
  // reading on your own pauses following
  ["wheel", "touchmove"].forEach((t) => addEventListener(t, () => { if (following && !programmatic) setFollow(false); }, { passive: true }));
  addEventListener("keydown", (ev) => {
    if (following && ["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "].includes(ev.key) && !ev.target.closest("textarea,input")) setFollow(false);
  });

  live.start({ endpoint: useFollow || useQuestions ? set.live : "", room: set.room });
  if (useFollow) {
    live.on("slide", onLiveSlide);
    if (live.slide) onLiveSlide(live.slide);
  }

  // start where the link points, or at the top
  const target = location.hash && byId(location.hash.replace(/^#s-/, ""));
  if (target) document.fonts.ready.then(() => scrollToMarker(target.id, -1, false));
  show(target ? target.id : entries[0].id, -1);
})();
