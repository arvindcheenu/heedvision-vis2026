// Deck controller: renders talk.md, starts reveal, and wires the footer band,
// QR codes, the voxel demo, embeds, and the audience follow/ask controls.
(async function () {
  const live = window.HVLive;
  const params = new URLSearchParams(location.search);
  const isPoster = params.has("poster");
  const isReceiver = params.has("receiver");
  const isPresenting = !!live.presenterKey;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  // ?embed shows the deck inside another page; ?embed=<id> shows just that slide
  const isEmbed = params.has("embed");
  const single = params.get("embed") || null;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const short = (u) => (u || "").replace(/^https?:\/\//, "").replace(/\/$/, "");

  document.body.classList.toggle("is-embed", isEmbed);
  document.body.classList.toggle("poster", isPoster);
  document.body.classList.toggle("receiver", isReceiver);
  document.body.classList.toggle("presenting", isPresenting);

  // ---------------------------------------------------------- render talk.md
  const src = await fetch("talk.md", { cache: "no-cache" }).then((r) => r.text());
  const talk = MDeck.render(src);
  const set = talk.settings;
  const slidesEl = document.querySelector(".reveal .slides");
  slidesEl.innerHTML = talk.slides.filter((s) => !single || s.id === single).map((s) => s.html).join("") +
    `<div class="hv-chrome" aria-hidden="true"><div class="band"><div class="rail"></div><div class="foot-right"><span class="url" data-talk-url></span><img src="../shared/logos/vis2026.png" alt=""><span class="count"></span></div></div></div>`;
  document.title = `${set.title} · talk`;
  const useQuestions = set.questions === "on" && !!set.live;
  live.start({ endpoint: set.live, room: set.room });

  const deck = Reveal;
  deck.initialize({
    width: 1920,
    height: 1080,
    margin: 0,
    minScale: 0.1,
    maxScale: 3,
    center: false,
    hash: !isEmbed,
    embedded: isEmbed,
    ...(isEmbed ? { scrollActivationWidth: null } : {}),
    history: false,
    controls: false,
    progress: false,
    slideNumber: false,
    fragments: !isPoster,
    transition: isPoster ? "none" : "fade",
    backgroundTransition: "fade",
    autoAnimate: !isPoster && !reduceMotion,
    autoAnimateEasing: "cubic-bezier(0.2, 0, 0, 1)",
    autoAnimateDuration: 0.8,
    viewDistance: 3,
    preloadIframes: false,
    totalTime: set.duration ? set.duration * 60 : undefined, // speaker view pacing; per-slide `time:` refines it
    plugins: [RevealNotes],
  });

  const slides = () => [...document.querySelectorAll(".reveal .slides > section")];
  const titleOf = (id) => (document.getElementById(id) || {}).dataset?.title || id;

  // ---------------------------------------------------------- QR + links
  function renderQR() {
    if (!set.url) return;
    const qr = qrcode(0, "M");
    qr.addData(set.url);
    qr.make();
    const svg = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
    document.querySelectorAll('[data-qr="talk"]').forEach((el) => (el.innerHTML = svg));
    document.querySelectorAll("[data-talk-url]").forEach((el) => (el.textContent = short(set.url)));
    const label = useQuestions && set.follow ? "Follow along & ask questions" : set.follow && set.live ? "Follow along" : "Slides & script";
    document.querySelectorAll("[data-qr-label]").forEach((el) => (el.textContent = label));
  }

  // ---------------------------------------------------------- chapter rail
  const chrome = slidesEl.querySelector(".hv-chrome");
  const rail = chrome.querySelector(".rail");
  const count = chrome.querySelector(".count");
  const chapters = [];
  slides().forEach((s) => {
    const c = s.dataset.chapter;
    let ch = chapters.find((x) => x.name === c);
    if (!ch) chapters.push((ch = { name: c, slides: [] }));
    ch.slides.push(s);
  });
  rail.innerHTML = chapters.map((c) => `<div class="seg"><i></i><span>${esc(c.name)}</span></div>`).join("");

  function updateChrome(cur) {
    const all = slides();
    const idx = all.indexOf(cur);
    chrome.classList.toggle("hidden", cur.classList.contains("bleed") || !!single);
    count.textContent = `${idx + 1}`;
    let passed = 0;
    chapters.forEach((c, i) => {
      const at = c.slides.indexOf(cur);
      const seg = rail.children[i];
      seg.classList.toggle("now", at >= 0);
      seg.classList.toggle("done", at < 0 && idx >= passed + c.slides.length);
      seg.querySelector("i").style.setProperty("--p", at >= 0 ? (at + 1) / c.slides.length : "");
      passed += c.slides.length;
    });
  }

  // ---------------------------------------------------------- voxel fields
  const fields = new Map();
  const SWATCH = { who: "linear-gradient(135deg,var(--you),var(--both),var(--partner))", sum: "#e9e6ff", max: "linear-gradient(90deg,var(--you) 50%,var(--partner) 50%)", diff: "linear-gradient(90deg,var(--you),#1b1d26,var(--partner))", count: "linear-gradient(90deg,rgba(255,255,255,.35) 50%,var(--both) 50%)" };
  function initFields() {
    document.querySelectorAll("canvas[data-field]").forEach((cv) => {
      fields.set(cv, new VoxelField(cv, { ambient: cv.dataset.field === "ambient", scale: () => deck.getScale() }));
    });
    document.querySelectorAll(".c-demo").forEach((demo) => {
      const field = fields.get(demo.querySelector("canvas"));
      const buttons = [...demo.querySelectorAll(".seg-ctl button")];
      const setMode = (m) => {
        field.setMode(m === "who" ? "identity" : m);
        buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === m)));
      };
      buttons.forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));
      demo.querySelectorAll("[data-swatch]").forEach((i) => (i.style.background = SWATCH[i.dataset.swatch]));
      // builds on the slide step through the modes, so a clicker drives the demo
      const sync = () => {
        const shown = demo.querySelectorAll(".fragment.step.visible");
        setMode(shown.length ? shown[shown.length - 1].dataset.mode : buttons[0].dataset.mode);
      };
      ["fragmentshown", "fragmenthidden"].forEach((t) => deck.on(t, sync));
    });
  }
  const runFields = (cur) => fields.forEach((f, cv) => (cur.contains(cv) ? f.start() : f.stop()));

  // ---------------------------------------------------------- design space
  function syncDesignSpace() {
    document.querySelectorAll(".c-ds").forEach((ds) => {
      const pick = ds.querySelector("[data-ds-pick]");
      if (pick) ds.classList.toggle("picked", isPoster || pick.classList.contains("visible"));
    });
  }

  // ---------------------------------------------------------- embeds
  // <div class="embed" data-video data-poster [data-live]>: plays the recording,
  // or an iframe when talk.md sets `demo-<data-live>: <url>` and it loads. "R" toggles.
  const demoUrl = (key) => talk.meta[`demo-${key}`] || "";
  function buildEmbed(el) {
    const badge = document.createElement("div");
    badge.className = "embed-badge";
    el.appendChild(badge);
    const v = document.createElement(isPoster ? "img" : "video");
    if (isPoster) { v.src = el.dataset.poster; v.pause = v.play = () => Promise.resolve(); }
    v.muted = true; v.loop = true; v.playsInline = true; v.preload = "none";
    if (el.dataset.poster) v.poster = el.dataset.poster;
    v.dataset.src = el.dataset.video;
    v.setAttribute("aria-label", el.dataset.label || "Recording");
    el.appendChild(v);
    el._video = v;
    el._badge = badge;
    setEmbedMode(el, "video");
  }
  function setEmbedMode(el, mode) {
    const url = el.dataset.live && demoUrl(el.dataset.live);
    if (mode === "live" && (!url || !navigator.onLine)) mode = "video";
    el.dataset.mode = mode;
    if (mode === "live") {
      if (!el._iframe) {
        const f = document.createElement("iframe");
        f.allow = "xr-spatial-tracking; fullscreen; autoplay";
        let loaded = false;
        f.addEventListener("load", () => (loaded = true));
        setTimeout(() => { if (!loaded && el.dataset.mode === "live") setEmbedMode(el, "video"); }, 8000);
        f.src = url;
        el.insertBefore(f, el._badge);
        el._iframe = f;
      }
      el._iframe.hidden = false;
      el._video.hidden = true;
      el._video.pause();
      el._badge.textContent = "Live demo";
    } else {
      if (el._iframe) el._iframe.hidden = true;
      el._video.hidden = false;
      el._badge.textContent = el.dataset.label || "Recording";
    }
  }
  function runEmbeds(cur) {
    const all = slides();
    const i = all.indexOf(cur);
    document.querySelectorAll(".embed").forEach((el) => {
      if (!el._video) return;
      const s = el.closest("section");
      if (Math.abs(all.indexOf(s) - i) <= 1 && !el._video.src && el._video.dataset.src) { el._video.src = el._video.dataset.src; el._video.preload = "auto"; }
      if (s === cur) {
        if (el.dataset.live && demoUrl(el.dataset.live) && !el.dataset.userMode) setEmbedMode(el, "live");
        if (el.dataset.mode === "video") el._video.play().catch(() => {});
      } else el._video.pause();
    });
  }
  function toggleEmbeds() {
    deck.getCurrentSlide().querySelectorAll(".embed[data-live]").forEach((el) => {
      el.dataset.userMode = "1";
      setEmbedMode(el, el.dataset.mode === "live" ? "video" : "live");
      if (el.dataset.mode === "video") el._video.play().catch(() => {});
    });
  }

  // ---------------------------------------------------------- live: follow + ask
  let following = set.follow;
  let applyingRemote = false;
  let fab, sheet;

  function currentState() {
    const idx = deck.getIndices();
    return { id: deck.getCurrentSlide().id, h: idx.h, v: idx.v || 0, f: idx.f == null ? -1 : idx.f };
  }
  function goTo(s) {
    const el = document.getElementById(s.id);
    if (!el) return;
    const idx = deck.getIndices(el);
    applyingRemote = true;
    deck.slide(idx.h, idx.v, s.f);
    applyingRemote = false;
  }

  function buildAudienceUI() {
    fab = document.createElement("div");
    fab.className = "hv-fab";
    const ask = set.questions === "link"
      ? `<a class="ask" href="${esc(set.questionsUrl)}" target="_blank" rel="noopener">Ask</a>`
      : useQuestions ? `<button type="button" class="ask" aria-expanded="false" title="Questions on this slide (Q)">Ask <span class="badge" hidden>0</span></button>` : "";
    fab.innerHTML = (set.follow && live.enabled ? `<button type="button" class="follow" aria-pressed="true"><span class="dot"></span><span class="lbl">Following</span></button>` : "") +
      ask + `<a class="script" href="../talk/">Script</a>`;
    document.body.appendChild(fab);

    const followBtn = fab.querySelector(".follow");
    const setFollow = (on) => {
      following = on;
      if (!followBtn) return;
      followBtn.setAttribute("aria-pressed", String(on));
      followBtn.querySelector(".lbl").textContent = on ? "Following" : "Rejoin live";
      if (on && live.slide) goTo(live.slide);
    };
    if (followBtn) followBtn.addEventListener("click", () => setFollow(!following));
    const scriptLink = fab.querySelector(".script");
    const syncScript = () => (scriptLink.href = `../talk/#s-${deck.getCurrentSlide().id}`);
    deck.on("slidechanged", syncScript);
    syncScript();

    if (useQuestions) {
      sheet = document.createElement("section");
      sheet.className = "hv-sheet";
      sheet.hidden = true;
      sheet.innerHTML = `
        <header><b class="sheet-title"></b><span>Questions on this slide</span></header>
        <div class="list"></div>
        <form>
          <textarea name="text" maxlength="600" placeholder="Ask something about this slide…" required></textarea>
          <div class="row"><input name="name" maxlength="60" placeholder="Name (optional)"><button type="submit">Send</button></div>
          <div class="note"></div>
        </form>`;
      document.body.appendChild(sheet);
      const askBtn = fab.querySelector(".ask");
      const toggleSheet = (open = sheet.hidden) => {
        sheet.hidden = !open;
        askBtn.setAttribute("aria-expanded", String(open));
        if (open) { renderSheet(); sheet.querySelector("textarea").focus({ preventScroll: true }); }
      };
      askBtn.addEventListener("click", () => toggleSheet());
      deck.addKeyBinding({ keyCode: 81, key: "Q", description: "Questions on this slide" }, () => toggleSheet());
      sheet.addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Escape") toggleSheet(false); });
      sheet.querySelector("form").addEventListener("submit", (e) => {
        e.preventDefault();
        const f = e.target;
        const ok = live.ask(deck.getCurrentSlide().id, f.text.value, f.name.value);
        f.querySelector(".note").textContent = ok ? "Sent. Thanks!" : "Questions are offline right now.";
        if (ok) f.text.value = "";
      });
      sheet.querySelector(".list").addEventListener("click", (e) => {
        const b = e.target.closest("button[data-vote]");
        if (b) { live.vote(b.dataset.vote); renderSheet(); }
      });
      live.on("questions", renderSheet);
      deck.on("slidechanged", renderSheet);
    }

    if (set.follow) {
      live.on("slide", (s) => { if (following) goTo(s); });
      if (live.slide && following) goTo(live.slide); // the first update can arrive before the deck is ready
      deck.on("slidechanged", () => {
        if (!applyingRemote && following && live.slide && live.status === "open" && deck.getCurrentSlide().id !== live.slide.id) setFollow(false);
      });
      live.on("status", (s) => { if (followBtn) followBtn.disabled = s !== "open"; });
    }
  }

  function renderSheet() {
    if (!sheet) return;
    const cur = deck.getCurrentSlide();
    const qs = live.forSlide(cur.id);
    const badge = fab.querySelector(".badge");
    badge.hidden = !qs.length;
    badge.textContent = qs.length;
    if (sheet.hidden) return;
    sheet.querySelector(".sheet-title").textContent = titleOf(cur.id);
    sheet.querySelector(".list").innerHTML = qs.length
      ? qs.map((q) => `<div class="q-item"><div><p>${esc(q.text)}</p><small>${esc(q.name || "Anonymous")}</small></div><button type="button" data-vote="${esc(q.id)}" aria-pressed="${live.voted.has(q.id)}">▲ ${q.votes}</button></div>`).join("")
      : `<div class="q-empty">No questions yet. Be the first.</div>`;
  }

  // Live board on the end slide; falls back to what talk.md wrote inside :::questions.
  function renderBoard() {
    document.querySelectorAll(".c-questions").forEach((box) => {
      box.classList.toggle("live", useQuestions && !isPoster);
      if (!useQuestions) return;
      const top = live.top(6);
      box.querySelector("[data-qa-board]").innerHTML = top.length
        ? top.map((q) => `<div class="qa-item" data-id="${esc(q.id)}"><div class="qa-votes">${q.votes}</div><div><div class="qa-text">${esc(q.text)}</div><div class="qa-slide">${esc(titleOf(q.slide))}${q.name ? " · " + esc(q.name) : ""}</div></div></div>`).join("")
        : `<div class="empty">No questions yet. Scan the code to ask one.</div>`;
    });
  }
  // presenter: double-click a question on the board to hide it
  document.addEventListener("dblclick", (e) => {
    const it = isPresenting && e.target.closest(".qa-item");
    if (it) live.hide(it.dataset.id);
  });

  function broadcast() { if (isPresenting && set.follow) live.broadcast(currentState()); }

  // ---------------------------------------------------------- embed bridge
  // The host page steps through builds with {hv:"go", dir} and gets {hv:"state"} back.
  function postState() {
    if (!isEmbed || window.parent === window) return;
    const a = deck.availableFragments(), r = deck.availableRoutes();
    window.parent.postMessage({ hv: "state", id: deck.getCurrentSlide().id, prev: a.prev || r.left, next: a.next || r.right, index: deck.getIndices().h, total: deck.getTotalSlides() }, location.origin);
  }
  if (isEmbed) {
    addEventListener("message", (e) => {
      if (e.origin !== location.origin || !e.data || e.data.hv !== "go") return;
      if (e.data.dir === "next") deck.next();
      else if (e.data.dir === "prev") deck.prev();
      else if (e.data.dir === "build") deck.slide(deck.getIndices().h, 0, e.data.f);
    });
    document.addEventListener("click", (e) => {
      if (e.target.closest("button, a, iframe, video, .seg-ctl")) return;
      deck.next();
    });
    ["slidechanged", "fragmentshown", "fragmenthidden"].forEach((t) => deck.on(t, postState));
  }

  // ---------------------------------------------------------- wiring
  function onSlide(cur) {
    updateChrome(cur);
    runFields(cur);
    runEmbeds(cur);
    syncDesignSpace();
  }
  deck.on("ready", (e) => {
    renderQR();
    initFields();
    document.querySelectorAll(".embed").forEach(buildEmbed);
    deck.addKeyBinding({ keyCode: 82, key: "R", description: "Toggle live demo / recording" }, toggleEmbeds);
    if (!isPoster && !isReceiver && !isPresenting && !isEmbed) buildAudienceUI();
    live.on("questions", renderBoard);
    live.on("status", (s) => { if (s === "open") broadcast(); });
    live.on("error", (m) => console.warn("[live]", m));
    renderBoard();
    onSlide(e.currentSlide);
    postState();
  });
  deck.on("slidechanged", (e) => { onSlide(e.currentSlide); broadcast(); });
  ["fragmentshown", "fragmenthidden"].forEach((t) => deck.on(t, () => { syncDesignSpace(); broadcast(); }));
  deck.on("resize", () => fields.forEach((f) => { f.resize(); f.draw(); }));
})();
