// Deck controller: reveal setup, chapter rail, QR codes, the voxel demo,
// charts, video/iframe embeds, and the audience follow/ask controls.
(function () {
  const HV = window.HV || {};
  const live = window.HVLive;
  const params = new URLSearchParams(location.search);
  const isPoster = params.has("poster");
  const isReceiver = params.has("receiver");
  const isPresenting = !!(live && live.presenterKey);
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  // ?embed shows the deck inside another page; ?embed=<id> shows just that slide
  const isEmbed = params.has("embed");
  const single = params.get("embed") || null;
  if (single && document.getElementById(single)) {
    document.querySelectorAll(".reveal .slides > section").forEach((s) => { if (s.id !== single) s.remove(); });
  }

  document.body.classList.toggle("embed", isEmbed);
  document.body.classList.toggle("poster", isPoster);
  document.body.classList.toggle("receiver", isReceiver);
  document.body.classList.toggle("presenting", isPresenting);

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
    transitionSpeed: "default",
    backgroundTransition: "fade",
    autoAnimate: !isPoster && !reduceMotion,
    autoAnimateEasing: "cubic-bezier(0.2, 0, 0, 1)",
    autoAnimateDuration: 0.8,
    viewDistance: 3,
    preloadIframes: false,
    totalTime: 540, // 9 minutes; per-slide data-timing feeds the speaker view pacing
    plugins: [RevealNotes],
  });

  const slides = () => [...document.querySelectorAll(".reveal .slides > section")];
  const short = (u) => (u || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
  const titleOf = (id) => (document.getElementById(id) || {}).dataset?.title || id;

  // ---------------------------------------------------------- QR + links
  function renderQR() {
    if (!window.qrcode || !HV.talkUrl) return;
    const qr = qrcode(0, "M");
    qr.addData(HV.talkUrl);
    qr.make();
    const svg = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
    document.querySelectorAll('[data-qr="talk"]').forEach((el) => (el.innerHTML = svg));
    document.querySelectorAll("[data-talk-url]").forEach((el) => (el.textContent = short(HV.talkUrl)));
  }

  // ---------------------------------------------------------- chapter rail
  const chrome = document.querySelector(".hv-chrome");
  const rail = chrome.querySelector(".rail");
  const count = chrome.querySelector(".count");
  const chapters = [];
  slides().forEach((s) => {
    const c = s.dataset.chapter;
    let ch = chapters.find((x) => x.name === c);
    if (!ch) chapters.push((ch = { name: c, slides: [] }));
    ch.slides.push(s);
  });
  rail.innerHTML = chapters.map((c) => `<div class="seg"><i></i><span>${c.name}</span></div>`).join("");

  function updateChrome(cur) {
    const all = slides();
    const idx = all.indexOf(cur);
    chrome.classList.toggle("hidden", cur.classList.contains("bleed") || !!single);
    count.textContent = `${idx + 1}`;
    const segs = rail.querySelectorAll(".seg");
    let passed = 0;
    chapters.forEach((c, i) => {
      const at = c.slides.indexOf(cur);
      const seg = segs[i];
      seg.classList.toggle("now", at >= 0);
      seg.classList.toggle("done", at < 0 && idx >= passed + c.slides.length);
      seg.querySelector("i").style.setProperty("--p", at >= 0 ? (at + 1) / c.slides.length : "");
      passed += c.slides.length;
    });
  }

  // ---------------------------------------------------------- voxel fields
  const fields = new Map();
  function initFields() {
    document.querySelectorAll("canvas[data-field]").forEach((cv) => {
      const f = new VoxelField(cv, { ambient: cv.dataset.field === "ambient", scale: () => deck.getScale() });
      fields.set(cv, f);
    });
    const demo = document.querySelector('canvas[data-field="demo"]');
    const field = demo && fields.get(demo);
    if (!field) return;
    const buttons = [...document.querySelectorAll(".seg-ctl button")];
    const setMode = (m) => {
      field.setMode(m);
      buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === m)));
    };
    buttons.forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));
    // swatches on the buttons
    const sw = { identity: "linear-gradient(135deg,var(--you),var(--both),var(--partner))", sum: "#e9e6ff", max: "linear-gradient(90deg,var(--you) 50%,var(--partner) 50%)", diff: "linear-gradient(90deg,var(--you),#1b1d26,var(--partner))", count: "linear-gradient(90deg,rgba(255,255,255,.35) 50%,var(--both) 50%)" };
    document.querySelectorAll("[data-swatch]").forEach((i) => (i.style.background = sw[i.dataset.swatch]));
    // fragments on the slide step through modes, so a clicker drives the demo
    const sync = () => {
      const shown = demo.closest("section").querySelectorAll(".fragment.step.visible");
      setMode(shown.length ? shown[shown.length - 1].dataset.mode : "identity");
    };
    deck.on("fragmentshown", sync);
    deck.on("fragmenthidden", sync);
    deck.on("slidechanged", (e) => { if (e.currentSlide.contains(demo)) sync(); });
  }
  function runFields(cur) {
    fields.forEach((f, cv) => (cur.contains(cv) ? f.start() : f.stop()));
  }

  // ---------------------------------------------------------- design space
  function syncDesignSpace() {
    document.querySelectorAll("[data-ds]").forEach((ds) => {
      const pick = ds.closest("section").querySelector("[data-ds-pick]");
      ds.classList.toggle("pick", !!pick && pick.classList.contains("visible"));
    });
  }
  deck.on("fragmentshown", syncDesignSpace);
  deck.on("fragmenthidden", syncDesignSpace);

  // ---------------------------------------------------------- charts
  const REDUNDANCY = [
    { geo: "scatter", label: "Scatterplot", none: 0.113, caav: 0.033, note: "−70%" },
    { geo: "terrain", label: "Terrain", none: 0.040, caav: 0.149, note: "×3.7" },
  ];
  function drawRedundancy(el) {
    const W = 1100, H = 560, m = { t: 60, r: 10, b: 110, l: 70 };
    el.insertAdjacentHTML("beforeend", `<div class="label">Normalized redundancy · lower is less overlap</div>`);
    const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("preserveAspectRatio", "xMidYMid meet");
    const y = d3.scaleLinear().domain([0, 0.16]).range([H - m.b, m.t]);
    const panelW = (W - m.l - m.r) / 2;
    const grid = svg.append("g").attr("class", "grid");
    [0, 0.05, 0.1, 0.15].forEach((v) => {
      grid.append("line").attr("x1", m.l).attr("x2", W - m.r).attr("y1", y(v)).attr("y2", y(v));
      svg.append("text").attr("x", m.l - 14).attr("y", y(v) + 8).attr("text-anchor", "end").attr("font-size", 22).text(`${Math.round(v * 100)}%`);
    });
    const bw = 130;
    REDUNDANCY.forEach((d, i) => {
      const g = svg.append("g").attr("class", `panel panel-${d.geo}`).attr("transform", `translate(${m.l + i * panelW},0)`);
      g.append("text").attr("class", "panel-title").attr("x", panelW / 2).attr("y", H - 12).attr("text-anchor", "middle").text(d.label);
      [["none", "No CAAV", "rgba(233,230,255,.28)"], ["caav", "CAAV", "var(--both)"]].forEach(([k, lab, fill], j) => {
        const x = panelW / 2 + (j === 0 ? -bw - 18 : 18);
        g.append("rect").attr("class", "bar").attr("data-v", d[k]).attr("x", x).attr("width", bw)
          .attr("y", y(0)).attr("height", 0).attr("rx", 14).attr("fill", fill);
        g.append("text").attr("class", "val").attr("x", x + bw / 2).attr("y", y(d[k]) - 16).attr("text-anchor", "middle")
          .attr("opacity", 0).text(`${(d[k] * 100).toFixed(1)}%`);
        g.append("text").attr("x", x + bw / 2).attr("y", y(0) + 36).attr("text-anchor", "middle").attr("font-size", 24).text(lab);
      });
      // change label sits beside the taller bar, on the side of the shorter one
      const hi = Math.max(d.none, d.caav);
      g.append("text").attr("class", "delta").attr("x", d.caav < d.none ? panelW / 2 + 18 + bw / 2 : panelW / 2 - 18 - bw / 2)
        .attr("y", y(hi) + 10).attr("text-anchor", "middle")
        .attr("font-family", "var(--serif)").attr("font-size", 54).attr("font-weight", 560).attr("opacity", 0)
        .attr("fill", d.geo === "scatter" ? "var(--both)" : "var(--partner)").text(d.note);
    });
    el._y = y;
  }
  function animateChart(el, focus, from) {
    const y = el._y;
    const instant = reduceMotion || isPoster;
    const svg = d3.select(el).select("svg");
    const t = d3.transition().duration(instant ? 0 : 900).ease(d3.easeCubicOut);
    svg.selectAll(".bar").transition(t).delay((_, i) => (instant ? 0 : i * 70))
      .attr("y", function () { return y(+this.dataset.v); })
      .attr("height", function () { return y(0) - y(+this.dataset.v); });
    svg.selectAll(".val").transition(t).delay(instant ? 0 : 400).attr("opacity", 1);
    const apply = (f) => {
      REDUNDANCY.forEach((d) => {
        const p = svg.select(`.panel-${d.geo}`);
        p.classed("dimmed", f && f !== d.geo);
        p.select(".delta").transition().duration(instant ? 0 : 600).attr("opacity", f === d.geo ? 1 : 0);
      });
    };
    if (instant) return apply(focus);
    apply(from);
    setTimeout(() => apply(focus), 450);
  }
  function initCharts() {
    document.querySelectorAll('[data-chart="redundancy"]').forEach(drawRedundancy);
  }
  let lastFocus = null;
  function runCharts(cur) {
    cur.querySelectorAll('[data-chart="redundancy"]').forEach((el) => {
      animateChart(el, el.dataset.focus, lastFocus);
      lastFocus = el.dataset.focus;
    });
    if (!cur.querySelector("[data-chart]")) lastFocus = null;
  }

  // ---------------------------------------------------------- embeds
  // <div class="embed" data-video data-poster [data-live]>: plays the recording,
  // or an iframe when HV.demos[data-live] is set and reachable. "R" toggles.
  function buildEmbed(el) {
    const badge = document.createElement("div");
    badge.className = "embed-badge";
    el.appendChild(badge);
    // still renders (posters, PDF) get the poster frame as a plain image
    const v = document.createElement(isPoster ? "img" : "video");
    if (isPoster) { v.src = el.dataset.poster; v.pause = v.play = () => Promise.resolve(); }
    v.muted = true; v.loop = true; v.playsInline = true; v.preload = "none";
    v.setAttribute("aria-label", el.dataset.label || "Recording");
    if (el.dataset.poster) v.poster = el.dataset.poster;
    v.dataset.src = el.dataset.video;
    el.appendChild(v);
    el._video = v;
    el._badge = badge;
    setEmbedMode(el, "video");
  }
  function setEmbedMode(el, mode) {
    const url = el.dataset.live && HV.demos && HV.demos[el.dataset.live];
    if (mode === "live" && (!url || !navigator.onLine)) mode = "video";
    el.dataset.mode = mode;
    if (mode === "live") {
      if (!el._iframe) {
        const f = document.createElement("iframe");
        f.allow = "xr-spatial-tracking; fullscreen; autoplay";
        f.loading = "eager";
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
  function warm(v) { if (!v.src && v.dataset.src) { v.src = v.dataset.src; v.preload = "auto"; } }
  function runEmbeds(cur) {
    const all = slides();
    const i = all.indexOf(cur);
    document.querySelectorAll(".embed").forEach((el) => {
      if (!el._video) return; // slidechanged can fire before "ready"
      const s = el.closest("section");
      const j = all.indexOf(s);
      if (Math.abs(j - i) <= 1) warm(el._video);
      if (s === cur) {
        if (el.dataset.live && HV.demos && HV.demos[el.dataset.live] && !el.dataset.userMode) setEmbedMode(el, "live");
        if (el.dataset.mode === "video") el._video.play().catch(() => {});
      } else {
        el._video.pause();
      }
    });
  }
  function toggleEmbeds() {
    deck.getCurrentSlide().querySelectorAll(".embed[data-live]").forEach((el) => {
      el.dataset.userMode = "1";
      setEmbedMode(el, el.dataset.mode === "live" ? "video" : "live");
      if (el.dataset.mode === "video") el._video.play().catch(() => {});
    });
  }

  // ---------------------------------------------------------- Fluent pointer light
  document.addEventListener("pointermove", (e) => {
    const t = e.target.closest && e.target.closest(".tile");
    if (!t) return;
    const r = t.getBoundingClientRect();
    t.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
    t.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
  }, { passive: true });

  // ---------------------------------------------------------- live: follow + ask
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  let following = true;
  let applyingRemote = false;
  let fab, sheet;

  function currentState() {
    const cur = deck.getCurrentSlide();
    const idx = deck.getIndices();
    return { id: cur.id, h: idx.h, v: idx.v || 0, f: idx.f == null ? -1 : idx.f };
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
    fab.innerHTML = `
      <button type="button" class="follow" aria-pressed="true" title="Follow the presenter's slide"><span class="dot"></span><span class="lbl">Following</span></button>
      <button type="button" class="ask" aria-expanded="false" title="Questions on this slide (Q)">Ask <span class="badge" hidden>0</span></button>
      <a class="script" href="../talk/" title="Slides with the full script">Script</a>`;
    document.body.appendChild(fab);
    sheet = document.createElement("section");
    sheet.className = "hv-sheet";
    sheet.hidden = true;
    sheet.setAttribute("aria-label", "Questions on this slide");
    sheet.innerHTML = `
      <header><b class="sheet-title"></b><span>Questions on this slide</span></header>
      <div class="list"></div>
      <form>
        <textarea name="text" maxlength="600" placeholder="Ask something about this slide…" required></textarea>
        <div class="row"><input name="name" maxlength="60" placeholder="Name (optional)"><button type="submit">Send</button></div>
        <div class="note"></div>
      </form>`;
    document.body.appendChild(sheet);

    const followBtn = fab.querySelector(".follow");
    const askBtn = fab.querySelector(".ask");
    const setFollow = (on) => {
      following = on;
      followBtn.setAttribute("aria-pressed", String(on));
      followBtn.querySelector(".lbl").textContent = on ? "Following" : "Rejoin live";
      if (on && live.slide) goTo(live.slide);
    };
    followBtn.addEventListener("click", () => setFollow(!following));
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

    if (!live.enabled) {
      followBtn.hidden = true;
      sheet.querySelector(".note").textContent = "Live questions are not connected for this copy of the slides.";
    }
    const scriptLink = fab.querySelector(".script");
    const syncScript = () => (scriptLink.href = `../talk/#s-${deck.getCurrentSlide().id}`);
    deck.on("slidechanged", syncScript);
    syncScript();
    live.on("slide", (s) => { if (following) goTo(s); });
    // the first update can arrive before the deck is ready
    if (live.slide && following) goTo(live.slide);
    deck.on("slidechanged", () => {
      if (!applyingRemote && following && live.slide && live.status === "open" && deck.getCurrentSlide().id !== live.slide.id) setFollow(false);
      renderSheet();
    });
    live.on("questions", renderSheet);
    live.on("status", (s) => { followBtn.disabled = s !== "open"; });
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
      ? qs.map((q) => `<div class="q-item"><div><p>${esc(q.text)}</p><small>${esc(q.name || "Anonymous")}</small></div>
          <button type="button" data-vote="${esc(q.id)}" aria-pressed="${live.voted.has(q.id)}" aria-label="Upvote">▲ ${q.votes}</button></div>`).join("")
      : `<div class="q-empty">No questions yet. Be the first.</div>`;
  }

  function renderBoard() {
    const board = document.querySelector("[data-qa-board]");
    if (!board) return;
    if (!live.enabled) {
      board.innerHTML = `<div class="empty">Questions open at ${esc(short(HV.talkUrl))}</div>`;
      return;
    }
    const top = live.top(6);
    board.innerHTML = top.length
      ? top.map((q) => `<div class="qa-item" data-id="${esc(q.id)}"><div class="qa-votes">${q.votes}</div><div><div class="qa-text">${esc(q.text)}</div><div class="qa-slide">${esc(titleOf(q.slide))}${q.name ? " · " + esc(q.name) : ""}</div></div></div>`).join("")
      : `<div class="empty">No questions yet. Scan the code to ask one.</div>`;
  }
  // presenter: double-click a question on the board to hide it
  document.addEventListener("dblclick", (e) => {
    const it = isPresenting && e.target.closest(".qa-item");
    if (it) live.hide(it.dataset.id);
  });

  function broadcast() { if (isPresenting) live.broadcast(currentState()); }

  // ---------------------------------------------------------- embed bridge
  // The host page steps through builds with {hv:"go", dir} and gets {hv:"state"} back.
  function postState() {
    if (!isEmbed || window.parent === window) return;
    const a = deck.availableFragments(), r = deck.availableRoutes();
    window.parent.postMessage({
      hv: "state", id: deck.getCurrentSlide().id,
      prev: a.prev || r.left, next: a.next || r.right,
      index: deck.getIndices().h, total: deck.getTotalSlides(),
    }, location.origin);
  }
  if (isEmbed) {
    addEventListener("message", (e) => {
      if (e.origin !== location.origin || !e.data || e.data.hv !== "go") return;
      if (e.data.dir === "next") deck.next();
      else if (e.data.dir === "prev") deck.prev();
      else if (e.data.dir === "first") deck.slide(0, 0, -1);
      else if (e.data.dir === "build") deck.slide(deck.getIndices().h, 0, e.data.f);
    });
    // clicking the slide advances, like a clicker
    document.addEventListener("click", (e) => {
      if (e.target.closest("button, a, iframe, video, .seg-ctl")) return;
      deck.next();
    });
    ["slidechanged", "fragmentshown", "fragmenthidden"].forEach((t) => deck.on(t, postState));
  }

  // ---------------------------------------------------------- wiring
  deck.on("ready", (e) => {
    renderQR();
    initFields();
    initCharts();
    document.querySelectorAll(".embed").forEach(buildEmbed);
    deck.addKeyBinding({ keyCode: 82, key: "R", description: "Toggle live demo / recording" }, toggleEmbeds);
    if (!isPoster && !isReceiver && !isPresenting && !isEmbed) buildAudienceUI();
    if (live) {
      live.on("questions", renderBoard);
      live.on("status", (s) => { if (s === "open") broadcast(); });
      live.on("error", (m) => console.warn("[live]", m));
    }
    renderBoard();
    onSlide(e.currentSlide);
    postState();
  });
  function onSlide(cur) {
    updateChrome(cur);
    runFields(cur);
    runCharts(cur);
    runEmbeds(cur);
    syncDesignSpace();
  }
  deck.on("slidechanged", (e) => { onSlide(e.currentSlide); broadcast(); });
  deck.on("fragmentshown", broadcast);
  deck.on("fragmenthidden", broadcast);
  deck.on("resize", () => fields.forEach((f) => { f.resize(); f.draw(); }));
})();
