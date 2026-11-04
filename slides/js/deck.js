// Deck controller: renders talk.md, starts reveal, and wires QR codes, plots, videos,
// plugins, the presenter windows and the audience controls.
(async function () {
  const live = window.HVLive;
  const params = new URLSearchParams(location.search);
  const isPoster = params.has("poster");
  const isReceiver = params.has("receiver");
  const isEmbed = params.has("embed");
  const hasKey = !!live.presenterKey;
  const single = params.get("embed") || null; // ?embed=<id> shows just that slide
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const short = (u) => (u || "").replace(/^https?:\/\//, "").replace(/\/$/, "");

  document.body.classList.toggle("is-embed", isEmbed);
  // on a phone the deck scrolls, so every build is already showing and the page never waits
  const flat = isPoster || (!isEmbed && innerWidth < 700);
  document.body.classList.toggle("poster", flat);

  // ---------------------------------------------------------- render
  const talk = await MDeck.load("", { plugins: true });
  const set = talk.settings;
  const css = document.createElement("style");
  css.textContent = MDeck.layoutCSS(talk.layouts);
  document.head.appendChild(css);
  const slidesEl = document.querySelector(".reveal .slides");
  slidesEl.innerHTML = talk.slides.filter((s) => !single || s.id === single).map((s) => s.html).join("");
  // reveal gives each build its own stretch of scrolling; on a phone there are no builds, so no gaps
  if (flat && !isPoster) slidesEl.querySelectorAll(".fragment").forEach((el) => el.classList.remove("fragment"));
  document.title = set.title;
  const useQuestions = set.questions === "on" && !!set.live;
  live.start({ endpoint: set.live, room: set.room });

  const deck = Reveal;
  // Backups come after the last slide and are skipped when presenting (B opens them).
  const skipBackups = !isEmbed && !isPoster;
  const advance = () => {
    if (deck.availableFragments().next) return deck.nextFragment();
    const cur = deck.getCurrentSlide();
    const nxt = cur.nextElementSibling;
    if (skipBackups && !cur.hasAttribute("data-backup") && nxt && nxt.hasAttribute("data-backup")) return;
    deck.next();
  };
  deck.initialize({
    width: 1920, height: 1080, margin: 0, minScale: 0.1, maxScale: 3, center: false,
    hash: !isEmbed, embedded: isEmbed, ...(isEmbed ? { scrollActivationWidth: null } : {}),
    history: false, controls: false, progress: false, slideNumber: false,
    fragments: !flat,
    transition: isPoster || isEmbed ? "none" : "fade", transitionSpeed: "fast", backgroundTransition: "none",
    // phones scroll through the slides instead of stepping
    ...(isEmbed || isPoster ? {} : { scrollActivationWidth: 700, scrollLayout: "compact", scrollSnap: false, scrollProgress: false }),
    viewDistance: 3, preloadIframes: false,
    keyboard: { 32: advance, 34: advance, 39: advance, 78: advance, 13: advance },
  });

  const slides = () => [...document.querySelectorAll(".reveal .slides > section")];
  const titleOf = (id) => (document.getElementById(id) || {}).dataset?.title || id;
  const mainSlides = () => slides().filter((s) => !s.hasAttribute("data-backup"));

  // ---------------------------------------------------------- QR
  // With asking on, the code opens the script page (follow along, ask). Off (`questions: off`,
  // or A in the presenter view), it opens the project site.
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
    document.querySelectorAll("[data-qr]").forEach((el) => (el.innerHTML = svg));
    document.querySelectorAll("[data-talk-url]").forEach((el) => (el.textContent = short(target)));
    const label = !ask ? "Paper, video and slides" : useQuestions ? "Follow along and ask" : "Slides and script";
    document.querySelectorAll("[data-qr-label]").forEach((el) => (el.textContent = label));
  }
  addEventListener("storage", (e) => { if (e.key === askKey) renderQR(); });

  // ---------------------------------------------------------- plots, videos, plugins
  document.querySelectorAll("[data-plot]").forEach((el) => {
    fetch(el.dataset.plot).then((r) => r.text()).then((svg) => { el.innerHTML = svg; }).catch(() => {});
  });

  // Plugin components start and stop with their slide, and step with its builds.
  const mounted = [];
  function mountRuntimes() {
    MDeck.runtimes.forEach((rt) => document.querySelectorAll(rt.selector).forEach(async (el) => {
      try {
        const inst = await rt.mount(el, { scale: () => deck.getScale() });
        mounted.push({ el, inst });
        if (inst.sync) inst.sync(flat);
        else if (isPoster && inst.settle) inst.settle(0);
        if (deck.getCurrentSlide().contains(el) && inst.start && (!isPoster || inst.sync)) inst.start();
      } catch (err) { console.warn("[plugin]", err); }
    }));
  }
  const syncSteps = () => { mounted.forEach(({ inst }) => inst.sync && inst.sync(flat)); syncMagic(); };

  // Shiki Magic Move (vendor/magic-move.js), loaded only if a slide uses it
  const magics = [];
  function syncMagic() {
    magics.forEach(({ el, m }) => {
      const box = el.closest(".c-magic");
      m.go(flat ? Infinity : box.querySelectorAll(".fragment.step.visible").length);
    });
  }
  async function mountMagic() {
    const els = [...document.querySelectorAll("[data-magic]")];
    if (!els.length) return;
    try {
      const mod = await import(new URL("vendor/magic-move.js", document.baseURI));
      els.forEach((el) => magics.push({ el, m: mod.mount(el, JSON.parse(el.dataset.magic), { lang: el.dataset.lang }) }));
      syncMagic();
    } catch (err) { console.warn("[magic move]", err); }
  }

  let lastSlide = null;
  function runSlide(cur) {
    mounted.forEach(({ el, inst }) => {
      if (!cur.contains(el)) return inst.stop && inst.stop();
      if (cur !== lastSlide && inst.enter) inst.enter();
      if (inst.start && (!isPoster || inst.sync)) inst.start();
    });
    lastSlide = cur;
    syncSteps();
    const all = slides(), i = all.indexOf(cur);
    document.querySelectorAll("video[data-src]").forEach((v) => {
      const s = v.closest("section");
      if (Math.abs(all.indexOf(s) - i) <= 1 && !v.src) { v.src = v.dataset.src; v.preload = "auto"; }
      if (s === cur && !isPoster) v.play().catch(() => {}); else v.pause();
    });
  }

  // ---------------------------------------------------------- navigation
  const builds = (sec) => new Set([...sec.querySelectorAll(".fragment")].map((f) => f.dataset.fragmentIndex)).size;
  function currentState() {
    const idx = deck.getIndices();
    return { id: deck.getCurrentSlide().id, h: idx.h, v: idx.v || 0, f: idx.f == null ? -1 : idx.f };
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
  // present.html talks to this deck over a BroadcastChannel. As soon as one says hello,
  // or the deck has the presenter key, this window is the projected one: no controls on it.
  const channel = !isEmbed && !isPoster && !isReceiver && "BroadcastChannel" in window ? new BroadcastChannel(`hv-present-${set.room}`) : null;
  const presenting = () => document.body.classList.add("presenting");
  if (hasKey) presenting();
  function postConsole() {
    if (!channel) return;
    const cur = deck.getCurrentSlide();
    channel.postMessage({ t: "state", ...currentState(), builds: builds(cur), backup: cur.hasAttribute("data-backup"), ask: askOn() });
  }
  if (channel) {
    channel.onmessage = (e) => {
      const m = e.data || {};
      if (m.t === "hello") { presenting(); postConsole(); if (hasKey) channel.postMessage({ t: "key", key: live.presenterKey }); }
      else if (m.t === "go") {
        if (m.dir === "next") advance();
        else if (m.dir === "prev") deck.prev();
        else if (m.id) goTo(m);
      } else if (m.t === "backups") toggleBackups();
      else if (m.t === "ask") setAsk(!!m.on);
    };
  }
  function openConsole(view) {
    presenting();
    const u = `present.html?view=${view}${hasKey ? `&present=${encodeURIComponent(live.presenterKey)}` : ""}`;
    window.open(u, `hv-${view}`, "popup,width=1440,height=900");
  }

  // ---------------------------------------------------------- audience: follow + ask
  let following = set.follow;
  let fab, sheet;

  function buildAudienceUI() {
    fab = document.createElement("div");
    fab.className = "hv-fab";
    const ask = set.questions === "link"
      ? `<a class="ask" href="${esc(set.questionsUrl)}" target="_blank" rel="noopener">Ask</a>`
      : useQuestions ? `<button type="button" class="ask" aria-expanded="false" title="Questions on this slide (Q)">Ask <span class="badge" hidden>0</span></button>` : "";
    fab.innerHTML = (set.follow && live.enabled ? `<button type="button" class="follow" hidden>Rejoin live</button>` : "") + ask + `<a class="script" href="../talk/">Script</a><span data-theme-picker></span>`;
    document.body.appendChild(fab);
    HVTheme.mountAll();
    // out of the way until the pointer moves
    let idle = 0;
    const wake = () => { fab.classList.add("awake"); clearTimeout(idle); idle = setTimeout(() => fab.classList.remove("awake"), 2500); };
    addEventListener("pointermove", wake, { passive: true });

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
      sheet.hidden = true;
      sheet.innerHTML = `
        <header><b class="sheet-title"></b></header>
        <div class="list"></div>
        <form>
          <textarea name="text" maxlength="600" placeholder="Ask about this slide" required></textarea>
          <div class="row"><input name="name" maxlength="60" placeholder="Name (optional)"><button type="submit" class="btn accent">Send</button></div>
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
        f.querySelector(".note").textContent = ok ? "Sent." : "Questions are offline right now.";
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
      : `<div class="q-empty">No questions yet.</div>`;
  }

  // Live board (a :::questions block); falls back to what talk.md wrote inside it.
  function renderBoard() {
    document.querySelectorAll(".c-questions").forEach((box) => {
      box.classList.toggle("live", useQuestions && !isPoster);
      if (!useQuestions) return;
      const top = live.top(6);
      box.querySelector("[data-qa-board]").innerHTML = top.length
        ? top.map((q) => `<div class="qa-item" data-id="${esc(q.id)}"><b>${q.votes}</b><div><div>${esc(q.text)}</div><small>${esc(titleOf(q.slide))}${q.name ? " · " + esc(q.name) : ""}</small></div></div>`).join("")
        : `<div class="q-empty">No questions yet.</div>`;
    });
  }
  document.addEventListener("dblclick", (e) => {
    const it = hasKey && e.target.closest(".qa-item");
    if (it) live.hide(it.dataset.id);
  });
  function broadcast() { if (hasKey && set.follow) live.broadcast(currentState()); }

  // ---------------------------------------------------------- embed bridge
  // The host page steps with {hv:"go", dir} or jumps with {hv:"go", id, f}, and gets {hv:"state"} back.
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
    });
    document.addEventListener("click", (e) => {
      if (e.target.closest("button, a, iframe, video, canvas")) return;
      deck.next();
    });
    ["slidechanged", "fragmentshown", "fragmenthidden"].forEach((t) => deck.on(t, postState));
  }

  // ---------------------------------------------------------- wiring
  deck.on("ready", (e) => {
    renderQR();
    mountRuntimes();
    mountMagic();
    deck.addKeyBinding({ keyCode: 66, key: "B", description: "Backup slides" }, toggleBackups);
    deck.addKeyBinding({ keyCode: 84, key: "T", description: "Light, dark or system" }, () => HVTheme.cycle());
    if (!isEmbed && !isPoster && !isReceiver) {
      deck.addKeyBinding({ keyCode: 83, key: "S", description: "Speaker view" }, () => openConsole("speaker"));
      deck.addKeyBinding({ keyCode: 80, key: "P", description: "Presenter view" }, () => openConsole("presenter"));
    }
    if (!isPoster && !isReceiver && !hasKey && !isEmbed) buildAudienceUI();
    live.on("questions", renderBoard);
    live.on("status", (s) => { if (s === "open") broadcast(); });
    live.on("error", (m) => console.warn("[live]", m));
    renderBoard();
    runSlide(e.currentSlide);
    postState();
    postConsole();
  });
  deck.on("slidechanged", (e) => { runSlide(e.currentSlide); broadcast(); postConsole(); });
  ["fragmentshown", "fragmenthidden"].forEach((t) => deck.on(t, () => { syncSteps(); broadcast(); postConsole(); }));
  deck.on("resize", () => mounted.forEach(({ inst }) => inst.resize && inst.resize()));
})();
