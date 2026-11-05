// Deck controller: renders talk.md, starts reveal, and wires the footer band,
// QR codes, the animations, embeds, the presenter window and the
// audience follow/ask controls.
(async function () {
  const live = window.HVLive;
  const params = new URLSearchParams(location.search);
  // stills and PDF export show every build
  const isPrint = params.get("view") === "print" || params.has("print-pdf");
  const isPoster = params.has("poster") || isPrint;
  const isReceiver = params.has("receiver");
  const hasKey = !!live.presenterKey;
  // once this browser has presented, it never shows audience controls (?audience undoes it)
  const PRESENTER = "hv.presenter";
  const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} };
  if (params.has("audience")) lsSet(PRESENTER, null);
  if (hasKey) lsSet(PRESENTER, "1");
  const isPresenting = hasKey || lsGet(PRESENTER) === "1";
  function markPresenter() { lsSet(PRESENTER, "1"); document.body.classList.add("presenting"); if (fab) fab.remove(); if (sheet) sheet.remove(); fab = sheet = null; }
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  // ?embed shows the deck inside another page; ?embed=<id> shows just that slide
  const isEmbed = params.has("embed");
  const single = params.get("embed") || null;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const short = (u) => (u || "").replace(/^https?:\/\//, "").replace(/\/$/, "");

  document.body.classList.toggle("is-embed", isEmbed);
  document.body.classList.toggle("poster", isPoster);
  document.body.classList.toggle("receiver", isReceiver);
  
  // ---------------------------------------------------------- render talk.md
  const src = await fetch("talk.md", { cache: "no-cache" }).then((r) => r.text());
  await MDeck.prepare(src);
  const talk = MDeck.render(src);
  // the bullet for the whole talk: a name, or the path to an image
  if (talk.meta.bullet) {
    if (/[./]/.test(talk.meta.bullet)) document.documentElement.style.setProperty("--bullet", `url("${talk.meta.bullet}")`);
    else document.documentElement.dataset.bullet = talk.meta.bullet;
  }
  // bullets, in the palette's colours
  const bulletStyle = document.head.appendChild(document.createElement("style"));
  function paintBullets() {
    const cs = getComputedStyle(document.documentElement);
    const t = cs.getPropertyValue("--title").trim(), a = cs.getPropertyValue("--accent").trim();
    const url = (inner) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'>${inner}</svg>`)}")`;
    const ring = (cx, cy, r, c) => `<circle cx='${cx}' cy='${cy}' r='${r}' fill='${c}'/>`;
    const vis = [[16, 4.2], [27.8, 16], [16, 27.8], [4.2, 16]].map(([x, y]) => ring(x, y, 3.7, t)).join("") +
      [[7.6, 7.6], [24.4, 7.6], [24.4, 24.4], [7.6, 24.4]].map(([x, y]) => ring(x, y, 3.2, a)).join("") + `<circle cx='16' cy='16' r='4' fill='${t}' fill-opacity='.6'/>`;
    const shapes = { triangle: `<path d='M8 5l18 11-18 11z' fill='${t}'/>`, dot: ring(16, 16, 8, t), square: `<rect x='8' y='8' width='16' height='16' rx='3' fill='${t}'/>`, dash: `<rect x='5' y='14' width='22' height='4' rx='2' fill='${t}'/>` };
    bulletStyle.textContent = `:root, .bullet-vis { --bullet: ${url(vis)}; }\n` +
      Object.entries(shapes).map(([n, svg]) => `[data-bullet="${n}"], .bullet-${n} { --bullet: ${url(svg)}; }`).join("\n") +
      `\n[data-bullet="none"], .bullet-none { --bullet: none; }`;
  }
  paintBullets();
  addEventListener("hv-theme", paintBullets);

  const set = talk.settings;
  const slidesEl = document.querySelector(".reveal .slides");
  slidesEl.innerHTML = talk.slides.filter((x) => !single || x.id === single).map((x) => x.html).join("");
  // on a phone the deck scrolls: every build is showing, so reveal adds no extra scrolling for them
  const flat = !isEmbed && !isPoster && innerWidth < 700;
  if (flat) {
    document.body.classList.add("flat");
    slidesEl.querySelectorAll(".fragment").forEach((el) => el.classList.remove("fragment"));
  }
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
    transitionSpeed: "fast",
    backgroundTransition: "none",
    overview: false,
    pdfSeparateFragments: false,
    // phones scroll through the slides instead of stepping
    ...(isEmbed || isPoster ? {} : { scrollActivationWidth: 700, scrollLayout: "compact", scrollSnap: false, scrollProgress: false }),
    autoAnimate: !isPoster && !isEmbed && !reduceMotion,
    autoAnimateEasing: "cubic-bezier(0.2, 0, 0, 1)",
    autoAnimateDuration: 0.8,
    viewDistance: 40,
    preloadIframes: false,
    keyboard: { 32: advance, 34: advance, 39: advance, 78: advance, 13: advance },
  });

  const slides = () => [...document.querySelectorAll(".reveal .slides > section")];
  const titleOf = (id) => (document.getElementById(id) || {}).dataset?.title || id;
  const mainSlides = () => slides().filter((s) => !s.hasAttribute("data-backup"));

  // ---------------------------------------------------------- theme
  // Light, dark or system, shared with the rest of the site (shared/site.js). T cycles.
  function toggleTheme() { window.HVTheme && HVTheme.cycle(); }

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
    document.querySelectorAll('[data-qr="talk"]').forEach((el) => {
      el.innerHTML = svg;
      el.setAttribute("role", "img");
      el.setAttribute("aria-label", `QR code for ${short(target)}`);
    });
    document.querySelectorAll("[data-talk-url]").forEach((el) => (el.textContent = short(target)));
    const label = !ask ? "Paper, video & slides" : useQuestions && set.follow ? "Follow along & ask questions" : set.follow && set.live ? "Follow along" : "Slides & script";
    document.querySelectorAll("[data-qr-label]").forEach((el) => (el.textContent = label));
  }
  addEventListener("storage", (e) => { if (e.key === askKey) renderQR(); });

  // section names, dots and the footer title go to their slide, as in Beamer
  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("[data-to]");
    const el = b && document.getElementById(b.dataset.to);
    if (!el) return;
    e.preventDefault();
    const at = deck.getIndices(el);
    deck.slide(at.h, at.v, -1);
  });

  // ---------------------------------------------------------- bullets
  // :::items: the current bullet is highlighted, later ones wait (or stay visible with uncover=off)
  function syncItems() {
    document.querySelectorAll("[data-items]").forEach((box) => {
      const lis = [...box.querySelectorAll(":scope > ul > li, :scope > ol > li")];
      const still = isPoster || flat;
      const at = box.querySelectorAll(".fragment.step.visible").length;
      lis.forEach((li, i) => { li.classList.toggle("now", !still && i === at); li.classList.toggle("later", !still && i > at); });
    });
  }

  // ---------------------------------------------------------- diagrams
  async function renderDiagrams() {
    const blocks = [...document.querySelectorAll("code.language-mermaid")];
    if (!blocks.length) return;
    await new Promise((res) => { const t = document.createElement("script"); t.src = "vendor/mermaid.min.js?v=20261217"; t.onload = t.onerror = res; document.head.appendChild(t); });
    if (!window.mermaid) return;
    mermaid.initialize({ startOnLoad: false, theme: "base", fontFamily: "inherit", themeVariables: HVTheme.isDark()
      ? { primaryColor: "#33291f", primaryTextColor: "#f6efe9", primaryBorderColor: "#df6824", lineColor: "#f8a45a", fontSize: "32px" }
      : { primaryColor: "#f3dfcf", primaryTextColor: "#3b352f", primaryBorderColor: "#df6824", lineColor: "#693a19", fontSize: "32px" } });
    for (let i = 0; i < blocks.length; i++) {
      const pre = blocks[i].parentElement;
      try {
        const { svg } = await mermaid.render(`diagram-${i}`, blocks[i].textContent);
        const box = document.createElement("div");
        box.className = "c-diagram";
        box.innerHTML = svg;
        pre.replaceWith(box);
      } catch (err) { console.warn("[diagram]", err); }
    }
  }

  // ---------------------------------------------------------- simulations and animations
  document.querySelectorAll("[data-plot]").forEach((el) => {
    fetch(el.dataset.plot).then((r) => r.text()).then((svg) => { el.innerHTML = svg; }).catch(() => {});
  });
  const fields = new Map();
  const explainers = new Map();
  const lives = new Map(); // live 3D demos (js/hvdemo.js), loaded only when a slide has one
  const SWATCH = { none: "var(--dot-off)", count: "var(--field-swatch)", sum: "var(--field-swatch)", max: "var(--field-swatch)", diff: "var(--field-swatch)", who: "var(--both)" };
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
        const shown = demo.querySelectorAll(flat ? ".step" : ".fragment.step.visible");
        setMode(shown.length ? shown[shown.length - 1].dataset.mode : buttons[0].dataset.mode);
      };
      ["fragmentshown", "fragmenthidden", "slidechanged"].forEach((t) => deck.on(t, sync));
      sync();
    });
    document.querySelectorAll("canvas[data-explain]").forEach((cv) => {
      explainers.set(cv, Explain.create(cv, { scale: () => deck.getScale() }));
    });
    const demos = document.querySelectorAll("[data-voxdemo]");
    if (demos.length) import(new URL("js/hvdemo.js?v=20261217", location.href)).then((mod) => demos.forEach(async (el) => {
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
      const at = isPoster || flat ? el.querySelectorAll(".step").length : el.querySelectorAll(".fragment.step.visible").length;
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

  // ---------------------------------------------------------- design space
  function syncDesignSpace() {
    document.querySelectorAll(".c-ds").forEach((ds) => {
      const pick = ds.querySelector("[data-ds-pick]");
      if (pick) ds.classList.toggle("picked", isPoster || flat || pick.classList.contains("visible"));
      const next = ds.querySelector("[data-ds-next]");
      if (next) ds.classList.toggle("swapped", isPoster || flat || next.classList.contains("visible"));
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
        if (el.dataset.mode === "video") el._video.play().catch(() => el._video.addEventListener("canplay", () => { if (deck.getCurrentSlide() === s) el._video.play().catch(() => {}); }, { once: true }));
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

  // ---------------------------------------------------------- presenter windows
  // present.html talks to this deck over a BroadcastChannel (same browser).
  const channel = !isEmbed && !isPoster && !isReceiver && "BroadcastChannel" in window ? new BroadcastChannel(`hv-present-${set.room}`) : null;
  function postConsole() {
    if (!channel) return;
    const cur = deck.getCurrentSlide();
    channel.postMessage({ t: "state", ...currentState(), builds: builds(cur), backup: cur.hasAttribute("data-backup"), ask: askOn(), qa: qaOn() });
  }
  if (channel) {
    channel.onmessage = (e) => {
      const m = e.data || {};
      if (m.t === "hello") { markPresenter(); postConsole(); if (hasKey) channel.postMessage({ t: "key", key: live.presenterKey }); }
      else if (m.t === "go") {
        if (m.dir === "next") advance();
        else if (m.dir === "prev") deck.prev();
        else if (m.id) goTo(m);
      } else if (m.t === "backups") toggleBackups();
      else if (m.t === "ask") setAsk(!!m.on);
      else if (m.t === "qa") setQa(!!m.on);
    };
  }
  function openConsole() {
    markPresenter();
    const u = `present.html${hasKey ? `?present=${encodeURIComponent(live.presenterKey)}` : ""}`;
    window.open(u, "hv-presenter", "popup,width=1440,height=900");
  }

  // ---------------------------------------------------------- live: follow + ask
  let following = set.follow;
  let fab, sheet;

  function buildAudienceUI() {
    fab = document.createElement("div");
    fab.className = "hv-fab";
    fab.setAttribute("role", "group");
    fab.setAttribute("aria-label", "Talk controls");
    const ask = set.questions === "link"
      ? `<a class="btn ask" href="${esc(set.questionsUrl)}" target="_blank" rel="noopener">Ask</a>`
      : useQuestions ? `<button type="button" class="btn ask" aria-expanded="false" aria-controls="hv-sheet" title="Questions on this slide (Q)">Ask <span class="badge" hidden>0</span></button>` : "";
    fab.innerHTML = (set.follow && live.enabled ? `<button type="button" class="btn follow" hidden>Rejoin live</button>` : "") +
      ask + `<a class="btn script" href="../talk/">Script</a><span data-theme-picker></span>`;
    document.body.appendChild(fab);
    HVTheme.mountAll();
    const followBtn = fab.querySelector(".follow");
    const setFollow = (on) => {
      following = on;
      if (!followBtn) return;
      followBtn.hidden = on;
      if (on && live.slide) goTo(live.slide);
    };
    if (followBtn) followBtn.addEventListener("click", () => setFollow(true));
    const scriptLink = fab.querySelector(".script");
    const syncScript = () => (scriptLink.href = `../talk/#s-${deck.getCurrentSlide().id}`);
    deck.on("slidechanged", syncScript);
    syncScript();

    if (useQuestions) {
      sheet = document.createElement("section");
      sheet.className = "hv-sheet";
      sheet.id = "hv-sheet";
      sheet.hidden = true;
      sheet.setAttribute("role", "dialog");
      sheet.setAttribute("aria-labelledby", "hv-sheet-title");
      sheet.innerHTML = `
        <header><div><h2 id="hv-sheet-title" class="sheet-title"></h2><span>Questions on this slide</span></div><button type="button" class="btn close" aria-label="Close questions">×</button></header>
        <ul class="q-list" role="list" aria-live="polite"></ul>
        <form class="ask-form">
          <label class="sr" for="hv-q">Your question about this slide</label>
          <textarea class="field" id="hv-q" name="text" maxlength="600" placeholder="Ask something about this slide…" required></textarea>
          <div class="row"><label class="sr" for="hv-n">Your name, optional</label><input class="field" id="hv-n" name="name" maxlength="60" placeholder="Name (optional)" autocomplete="name"><button type="submit" class="btn">Ask</button></div>
          <p class="q-note" role="status"></p>
        </form>`;
      document.body.appendChild(sheet);
      const askBtn = fab.querySelector(".ask");
      const toggleSheet = (open = sheet.hidden) => {
        sheet.hidden = !open;
        askBtn.setAttribute("aria-expanded", String(open));
        if (open) { renderSheet(); sheet.querySelector("textarea").focus({ preventScroll: true }); }
        else askBtn.focus({ preventScroll: true });
      };
      sheet.querySelector(".close").addEventListener("click", () => toggleSheet(false));
      askBtn.addEventListener("click", () => toggleSheet());
      deck.addKeyBinding({ keyCode: 81, key: "Q", description: "Questions on this slide" }, () => toggleSheet());
      sheet.addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Escape") toggleSheet(false); });
      sheet.querySelector("form").addEventListener("submit", (e) => {
        e.preventDefault();
        const f = e.target;
        const ok = live.ask(deck.getCurrentSlide().id, f.text.value, f.name.value);
        f.querySelector(".q-note").textContent = ok ? live.sentNote() : "Questions are offline right now.";
        if (ok) f.text.value = "";
      });
      sheet.querySelector(".q-list").addEventListener("click", (e) => {
        const b = e.target.closest("button[data-vote]");
        if (b) { live.vote(b.dataset.vote); renderSheet(); }
      });
      live.on("questions", renderSheet);
      deck.on("slidechanged", renderSheet);
    }

    if (set.follow) {
      // an old slide left on the relay shouldn't pull someone off the link they opened
      const fresh = (s) => s && (!s.ts || Date.now() - s.ts < 3 * 3600 * 1000);
      live.on("slide", (s) => { if (following && fresh(s)) goTo(s); });
      if (following && fresh(live.slide)) goTo(live.slide); // the first update can arrive before the deck is ready
      deck.on("slidechanged", () => {
        if (!applyingRemote && following && live.slide && live.status === "open" && deck.getCurrentSlide().id !== live.slide.id) setFollow(false);
      });
    }
  }

  function renderSheet() {
    if (!sheet) return;
    const cur = deck.getCurrentSlide();
    const qs = live.forSlide(cur.id);
    if (!fab) return;
    const badge = fab.querySelector(".badge");
    badge.hidden = !qs.length;
    badge.textContent = qs.length;
    if (sheet.hidden) return;
    sheet.querySelector(".sheet-title").textContent = titleOf(cur.id);
    live.fill(sheet.querySelector(".q-list"), qs, "No questions yet. Be the first.");
  }

  const qaKey = `hv.qa.${set.room}`;
  const qaOn = () => lsGet(qaKey) === "on";
  function setQa(on) { lsSet(qaKey, on ? "on" : "off"); renderQa(); postConsole(); }
  let qaPanel = null;
  function renderQa() {
    if (isEmbed || isPoster || isReceiver || !useQuestions) return;
    const cur = deck.getCurrentSlide();
    const show = qaOn() || (cur && cur.hasAttribute("data-qa"));
    const top = show ? live.top(4) : [];
    if (!qaPanel) { qaPanel = document.createElement("aside"); qaPanel.className = "hv-qa"; qaPanel.setAttribute("aria-label", "Top questions"); document.body.appendChild(qaPanel); }
    qaPanel.hidden = !top.length;
    qaPanel.innerHTML = top.map((q) => `<p><b>${q.votes}</b> ${esc(q.text)}</p>`).join("");
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
    const it = hasKey && e.target.closest(".qa-item");
    if (it) live.hide(it.dataset.id);
  });

  function broadcast() { if (hasKey && set.follow) live.broadcast(currentState()); }

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
      if (e.origin !== location.origin || !e.data) return;
      if (e.data.hv === "hello") return postState();
      if (e.data.hv !== "go") return;
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
    // only the slide on screen can take keyboard focus, or be read out
    if (!flat && !isPrint) slides().forEach((s) => (s.inert = s !== cur));
    syncItems();
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
      deck.addKeyBinding({ keyCode: 80, key: "P", description: "Presenter view" }, openConsole);
    }
    if (isPresenting) document.body.classList.add("presenting");
    if (!isPoster && !isReceiver && !isPresenting && !isEmbed) buildAudienceUI();
    live.on("questions", renderBoard);
    live.on("questions", renderQa);
    renderDiagrams();
    if (isPrint) setTimeout(() => {
      fields.forEach((f) => { f.resize(); f.draw(); });
      explainers.forEach((ex, cv) => { const box = cv.closest("[data-stepper]"); ex.resize(); ex.settle(box ? box.querySelectorAll(".step").length : 0); });
      lives.forEach((d) => d.settle && d.settle());
    }, 1200);
    // in a PDF, links jump to an element's id
    if (isPrint) document.querySelectorAll("a[data-to]").forEach((a) => a.setAttribute("href", `#${a.dataset.to}`));
    if (params.has("autoprint")) setTimeout(async () => {
      await Promise.all([document.fonts.ready, ...[...document.images].map((i) => i.decode().catch(() => {}))]);
      print();
    }, 3000);
    live.on("status", (s) => { if (s === "open") broadcast(); });
    live.on("error", (m) => console.warn("[live]", m));
    renderBoard();
    // the canvases drew their labels before the font had arrived
    document.fonts.ready.then(() => { fields.forEach((f) => f.draw()); explainers.forEach((ex) => ex.draw()); });
    onSlide(e.currentSlide);
    postState();
    postConsole();
  });
  deck.on("slidechanged", (e) => { onSlide(e.currentSlide); renderQa(); broadcast(); postConsole(); });
  ["fragmentshown", "fragmenthidden"].forEach((t) => deck.on(t, () => { syncDesignSpace(); syncItems(); syncSteppers(); broadcast(); postConsole(); }));
  deck.on("resize", () => {
    fields.forEach((f) => { f.resize(); f.draw(); });
    // the projector's size is only known now: redraw the explainers sharply for it
    explainers.forEach((ex) => {
      if (Math.abs(Math.min(2.5, (devicePixelRatio || 1) * deck.getScale()) - ex.k) < 0.01) return;
      const s = ex.step;
      ex.resize();
      if (isPoster) ex.settle(s);
      else { ex.reset(); ex.setStep(s, true); ex.draw(); }
    });
  });
  addEventListener("hv-theme", () => fields.forEach((f) => f.draw()));
})();
