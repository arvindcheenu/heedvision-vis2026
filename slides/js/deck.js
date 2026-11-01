// Deck controller: renders talk.md, starts reveal, and wires the footer band,
// QR codes, the animations, embeds, the presenter/speaker windows and the
// audience follow/ask controls.
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
  // Backup slides come after the end slide and are skipped when presenting:
  // the talk stops at "Thank you", and backups are opened from the presenter view (or B).
  const skipBackups = !isEmbed && !isPoster;
  const advance = () => {
    if (deck.availableFragments().next) return deck.nextFragment();
    const cur = deck.getCurrentSlide();
    const nxt = cur.nextElementSibling;
    if (skipBackups && !cur.hasAttribute("data-backup") && nxt && nxt.hasAttribute("data-backup")) return;
    deck.next();
  };
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
    // embedded in the talk page, the slide follows scrolling: switch instantly, no cross-fades
    transition: isPoster || isEmbed ? "none" : "fade",
    backgroundTransition: isEmbed ? "none" : "fade",
    autoAnimate: !isPoster && !isEmbed && !reduceMotion,
    autoAnimateEasing: "cubic-bezier(0.2, 0, 0, 1)",
    autoAnimateDuration: 0.8,
    viewDistance: 3,
    preloadIframes: false,
    keyboard: { 32: advance, 34: advance, 39: advance, 78: advance, 13: advance },
  });

  const slides = () => [...document.querySelectorAll(".reveal .slides > section")];
  const titleOf = (id) => (document.getElementById(id) || {}).dataset?.title || id;
  const mainSlides = () => slides().filter((s) => !s.hasAttribute("data-backup"));

  // ---------------------------------------------------------- theme
  // Light or dark, shared with the rest of the site (shared/site.js). T toggles.
  function toggleTheme() { window.HVTheme && HVTheme.toggle(); }

  // ---------------------------------------------------------- QR + links
  // With asking on, the code opens the talk page (follow along, ask). Turned off
  // (`questions: off`, or the presenter view's toggle), it opens the project site.
  const askKey = `hv.ask.${set.room}`;
  const askStored = () => { try { return localStorage.getItem(askKey); } catch (e) { return null; } };
  const askOn = () => (askStored() != null ? askStored() === "on" : set.questions !== "off");
  function setAsk(on) {
    try { localStorage.setItem(askKey, on ? "on" : "off"); } catch (e) {}
    renderQR();
    postConsole();
  }
  function renderQR() {
    const ask = askOn();
    const target = ask ? set.url : set.site || set.url;
    if (!target) return;
    const qr = qrcode(0, "M");
    qr.addData(target);
    qr.make();
    const svg = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
    document.querySelectorAll('[data-qr="talk"]').forEach((el) => (el.innerHTML = svg));
    document.querySelectorAll("[data-talk-url]").forEach((el) => (el.textContent = short(target)));
    const label = !ask ? "Paper, video & slides" : useQuestions && set.follow ? "Follow along & ask questions" : set.follow && set.live ? "Follow along" : "Slides & script";
    document.querySelectorAll("[data-qr-label]").forEach((el) => (el.textContent = label));
  }
  addEventListener("storage", (e) => { if (e.key === askKey) renderQR(); });

  // ---------------------------------------------------------- chapter rail
  const chrome = slidesEl.querySelector(".hv-chrome");
  const rail = chrome.querySelector(".rail");
  const count = chrome.querySelector(".count");
  const chapters = [];
  mainSlides().forEach((s) => {
    const c = s.dataset.chapter;
    let ch = chapters.find((x) => x.name === c);
    if (!ch) chapters.push((ch = { name: c, slides: [] }));
    ch.slides.push(s);
  });
  rail.innerHTML = chapters.map((c) => `<div class="seg"><i></i><span>${esc(c.name)}</span></div>`).join("");

  function updateChrome(cur) {
    const all = mainSlides();
    const idx = all.indexOf(cur);
    const backup = cur.hasAttribute("data-backup");
    chrome.classList.toggle("hidden", cur.classList.contains("bleed") || !!single);
    count.textContent = backup ? "Backup" : `${idx + 1}`;
    let passed = 0;
    chapters.forEach((c, i) => {
      const at = c.slides.indexOf(cur);
      const seg = rail.children[i];
      seg.classList.toggle("now", at >= 0);
      seg.classList.toggle("done", backup || (at < 0 && idx >= passed + c.slides.length));
      seg.querySelector("i").style.setProperty("--p", at >= 0 ? (at + 1) / c.slides.length : "");
      passed += c.slides.length;
    });
  }

  // ---------------------------------------------------------- simulations and animations
  const fields = new Map();
  const explainers = new Map();
  const lives = new Map(); // live 3D demos (js/hvdemo.js), loaded only when a slide has one
  const SWATCH = { none: "var(--dot-off)", count: "var(--field-swatch)", sum: "linear-gradient(90deg,transparent,var(--field-swatch))", max: "linear-gradient(90deg,color-mix(in oklab,var(--field-swatch) 40%,transparent),var(--field-swatch))", diff: "linear-gradient(90deg,var(--field-swatch),transparent,var(--field-swatch))", who: "linear-gradient(135deg,var(--you),var(--both),var(--partner))" };
  function initFields() {
    document.querySelectorAll("canvas[data-field]").forEach((cv) => {
      const demo = cv.closest(".c-demo");
      fields.set(cv, new VoxelField(cv, { ambient: cv.dataset.field === "ambient", snapshot: !!demo && demo.classList.contains("snapshot"), scale: () => deck.getScale() }));
    });
    document.querySelectorAll(".c-demo").forEach((demo) => {
      const field = fields.get(demo.querySelector("canvas"));
      const buttons = [...demo.querySelectorAll(".seg-ctl button")];
      const setMode = (m) => {
        field.setMode(m === "who" ? "identity" : m);
        const at = buttons.findIndex((b) => b.dataset.mode === m);
        buttons.forEach((b, i) => {
          b.setAttribute("aria-pressed", String(i === at));
          // in a stepped demo, modes not reached yet stay out of view
          b.classList.toggle("later", demo.classList.contains("stepped") && !isPoster && i > at);
        });
      };
      buttons.forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));
      demo.querySelectorAll("[data-swatch]").forEach((i) => (i.style.background = SWATCH[i.dataset.swatch]));
      // builds on the slide step through the modes, so a clicker drives the demo
      const sync = () => {
        const shown = demo.querySelectorAll(".fragment.step.visible");
        setMode(shown.length ? shown[shown.length - 1].dataset.mode : buttons[0].dataset.mode);
      };
      ["fragmentshown", "fragmenthidden", "slidechanged"].forEach((t) => deck.on(t, sync));
      sync();
    });
    document.querySelectorAll("canvas[data-explain]").forEach((cv) => {
      explainers.set(cv, Explain.create(cv, { scale: () => deck.getScale() }));
    });
    const demos = document.querySelectorAll("[data-voxdemo]");
    if (demos.length) import(new URL("js/hvdemo.js?v=20261107", location.href)).then((mod) => demos.forEach(async (el) => {
      try {
        lives.set(el, await mod.create(el, { scale: () => deck.getScale() }));
        syncSteppers();
        if (deck.getCurrentSlide().contains(el)) lives.get(el).start();
      } catch (err) { console.warn("[live demo]", err); }
    }));
  }
  // [data-stepper] components count their own hidden build markers
  function syncSteppers() {
    document.querySelectorAll("[data-stepper]").forEach((el) => {
      const at = isPoster ? el.querySelectorAll(".fragment.step").length : el.querySelectorAll(".fragment.step.visible").length;
      el.dataset.at = at;
      const demo = lives.get(el);
      if (demo) { if (isPoster) demo.settle(at); else if (demo.step !== at) demo.setStep(at); return; }
      const cv = el.querySelector("canvas[data-explain]");
      const ex = cv && explainers.get(cv);
      if (!ex) return;
      if (isPoster) ex.settle(at); else ex.setStep(at);
    });
  }
  let lastSlide = null;
  function runAnimations(cur) {
    fields.forEach((f, cv) => (cur.contains(cv) ? f.start() : f.stop()));
    lives.forEach((d, el) => (cur.contains(el) && !isPoster ? d.start() : d.stop()));
    explainers.forEach((ex, cv) => {
      if (!cur.contains(cv)) return ex.stop();
      if (cur !== lastSlide && ex.step === 0) ex.reset(); // a fresh run each time the slide comes up
      ex.start();
    });
    lastSlide = cur;
  }

  // ---------------------------------------------------------- fit text to tiles
  // Each slide's cards (and quotes) share one type scale: the largest, up to 1.5×,
  // at which no tile overflows. Runs once a slide is laid out, and again after fonts load.
  function fitText(sec) {
    if (!sec || sec.dataset.fitted || !sec.offsetHeight) return;
    [[".c-card, .c-step", "--fs"], [".c-quote", "--fq"]].forEach(([sel, prop]) => {
      const els = [...sec.querySelectorAll(sel)];
      if (!els.length) return;
      const over = () => els.some((el) => el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1);
      let v = 1.5;
      for (; v > 0.72; v -= 0.05) {
        els.forEach((el) => el.style.setProperty(prop, v.toFixed(2)));
        alignRows(els);
        if (!over()) break;
      }
    });
    sec.dataset.fitted = "1";
  }
  // Cards side by side line up: each title, text and quote starts on the same line
  // as its neighbours', however many lines the one above it took.
  function alignRows(els) {
    const rows = new Map();
    els.forEach((el) => {
      el.querySelectorAll("[data-aligned]").forEach((c) => { c.style.minHeight = ""; delete c.dataset.aligned; });
      const r = el.getBoundingClientRect(), key = `${Math.round(r.top)}:${Math.round(r.height)}`;
      rows.set(key, [...(rows.get(key) || []), el]);
    });
    const parts = (el) => [...el.children].filter((c) => { const cs = getComputedStyle(c); return cs.position !== "absolute" && cs.display !== "none"; });
    const sig = (c) => `${c.tagName}.${c.className}`;
    const align = (group) => {
      const kids = group.map(parts);
      if (kids.some((k) => k.length !== kids[0].length || k.some((c, i) => sig(c) !== sig(kids[0][i])))) return;
      kids[0].forEach((_, i) => {
        const col = kids.map((k) => k[i]);
        if (parseFloat(getComputedStyle(col[0]).flexGrow) > 0) return; // pictures take what's left
        align(col);
        const h = Math.max(...col.map((c) => c.offsetHeight));
        col.forEach((c) => { c.style.minHeight = `${h}px`; c.dataset.aligned = ""; });
      });
    };
    rows.forEach((group) => group.length > 1 && align(group));
  }
  document.fonts && document.fonts.ready.then(() => {
    slides().forEach((s) => delete s.dataset.fitted);
    if (deck.isReady()) fitText(deck.getCurrentSlide());
  });

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

  // ---------------------------------------------------------- navigation helpers
  const builds = (sec) => new Set([...sec.querySelectorAll(".fragment")].map((f) => f.dataset.fragmentIndex)).size;
  function currentState() {
    const idx = deck.getIndices();
    const cur = deck.getCurrentSlide();
    return { id: cur.id, h: idx.h, v: idx.v || 0, f: idx.f == null ? -1 : idx.f };
  }
  let applyingRemote = false;
  function goTo(s) {
    const el = document.getElementById(s.id);
    if (!el) return;
    const idx = deck.getIndices(el);
    applyingRemote = true;
    deck.slide(idx.h, idx.v, s.f == null ? -1 : s.f);
    applyingRemote = false;
  }
  // B: jump into the backup slides, and back to where you were
  let beforeBackup = null;
  function toggleBackups() {
    const cur = deck.getCurrentSlide();
    if (cur.hasAttribute("data-backup")) { if (beforeBackup) goTo(beforeBackup); return; }
    const first = document.querySelector("section[data-backup]");
    if (!first) return;
    beforeBackup = currentState();
    goTo({ id: first.id, f: -1 });
  }

  // ---------------------------------------------------------- presenter + speaker windows
  // present.html talks to this deck over a BroadcastChannel (same browser).
  const channel = !isEmbed && !isPoster && !isReceiver && "BroadcastChannel" in window ? new BroadcastChannel(`hv-present-${set.room}`) : null;
  function postConsole() {
    if (!channel) return;
    const cur = deck.getCurrentSlide();
    channel.postMessage({ t: "state", ...currentState(), builds: builds(cur), backup: cur.hasAttribute("data-backup"), ask: askOn() });
  }
  if (channel) {
    channel.onmessage = (e) => {
      const m = e.data || {};
      if (m.t === "hello") { postConsole(); if (isPresenting) channel.postMessage({ t: "key", key: live.presenterKey }); }
      else if (m.t === "go") {
        if (m.dir === "next") advance();
        else if (m.dir === "prev") deck.prev();
        else if (m.id) goTo(m);
      } else if (m.t === "backups") toggleBackups();
      else if (m.t === "ask") setAsk(!!m.on);
    };
  }
  function openConsole(view) {
    const u = `present.html?view=${view}${isPresenting ? `&present=${encodeURIComponent(live.presenterKey)}` : ""}`;
    window.open(u, `hv-${view}`, "popup,width=1440,height=900");
  }

  // ---------------------------------------------------------- live: follow + ask
  let following = set.follow;
  let fab, sheet;

  function buildAudienceUI() {
    fab = document.createElement("div");
    fab.className = "hv-fab";
    const ask = set.questions === "link"
      ? `<a class="ask" href="${esc(set.questionsUrl)}" target="_blank" rel="noopener">Ask</a>`
      : useQuestions ? `<button type="button" class="ask" aria-expanded="false" title="Questions on this slide (Q)">Ask <span class="badge" hidden>0</span></button>` : "";
    fab.innerHTML = (set.follow && live.enabled ? `<button type="button" class="follow" aria-pressed="true"><span class="dot"></span><span class="lbl">Following</span></button>` : "") +
      ask + `<a class="script" href="../talk/">Script</a>` +
      `<button type="button" class="theme" title="Light or dark (T)" aria-label="Toggle light or dark">◐</button>`;
    document.body.appendChild(fab);
    fab.querySelector(".theme").addEventListener("click", toggleTheme);

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

  // Live board (a :::questions block); falls back to what talk.md wrote inside it.
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
  // The host page steps through builds with {hv:"go", dir} or jumps with {hv:"go", id, f},
  // and gets {hv:"state"} back.
  function postState() {
    if (!isEmbed || window.parent === window) return;
    const a = deck.availableFragments(), r = deck.availableRoutes();
    const cur = deck.getCurrentSlide();
    const idx = mainSlides().indexOf(cur);
    window.parent.postMessage({ hv: "state", ...currentState(), prev: a.prev || r.left, next: a.next || r.right, index: idx < 0 ? slides().indexOf(cur) : idx, total: mainSlides().length, backup: cur.hasAttribute("data-backup"), title: titleOf(cur.id) }, location.origin);
  }
  // a jump from scrolling lands on the build at once, without replaying its animations
  function jump(s) {
    const root = document.documentElement;
    root.classList.add("hv-jump");
    goTo(s);
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("hv-jump")));
  }
  if (isEmbed) {
    addEventListener("message", (e) => {
      if (e.origin !== location.origin || !e.data || e.data.hv !== "go") return;
      if (e.data.id) jump(e.data);
      else if (e.data.dir === "next") deck.next();
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
    fitText(cur);
    updateChrome(cur);
    syncSteppers();
    runAnimations(cur);
    runEmbeds(cur);
    syncDesignSpace();
  }
  deck.on("ready", (e) => {
    renderQR();
    initFields();
    document.querySelectorAll(".embed").forEach(buildEmbed);
    deck.addKeyBinding({ keyCode: 82, key: "R", description: "Toggle live demo / recording" }, toggleEmbeds);
    deck.addKeyBinding({ keyCode: 84, key: "T", description: "Light or dark" }, toggleTheme);
    deck.addKeyBinding({ keyCode: 66, key: "B", description: "Backup slides" }, toggleBackups);
    if (!isEmbed && !isPoster && !isReceiver) {
      deck.addKeyBinding({ keyCode: 83, key: "S", description: "Speaker view (script)" }, () => openConsole("speaker"));
      deck.addKeyBinding({ keyCode: 80, key: "P", description: "Presenter view" }, () => openConsole("presenter"));
    }
    if (!isPoster && !isReceiver && !isPresenting && !isEmbed) buildAudienceUI();
    live.on("questions", renderBoard);
    live.on("status", (s) => { if (s === "open") broadcast(); });
    live.on("error", (m) => console.warn("[live]", m));
    renderBoard();
    onSlide(e.currentSlide);
    postState();
    postConsole();
  });
  deck.on("slidechanged", (e) => { onSlide(e.currentSlide); broadcast(); postConsole(); });
  ["fragmentshown", "fragmenthidden"].forEach((t) => deck.on(t, () => { syncDesignSpace(); syncSteppers(); broadcast(); postConsole(); }));
  deck.on("resize", () => fields.forEach((f) => { f.resize(); f.draw(); }));
  addEventListener("hv-theme", () => fields.forEach((f) => f.draw()));
})();
