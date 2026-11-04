// Live layer: follow the presenter's slide and ask/upvote questions per slide.
// Talks to the Cloudflare Worker in /worker over one WebSocket. Call
// HVLive.start({ endpoint, room }) once settings are known; without an
// endpoint (or offline) everything else keeps working.
(function () {
  const params = new URLSearchParams(location.search);
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };

  let clientId = store.get("hv.cid", null);
  if (!clientId) { clientId = Math.random().toString(36).slice(2) + Date.now().toString(36); store.set("hv.cid", clientId); }

  const bus = new EventTarget();
  let cfg = {};
  const live = {
    enabled: false,
    status: "off",          // off | connecting | open | closed
    presenterKey: params.get("present") || "",
    slide: null,            // last slide broadcast by the presenter
    questions: new Map(),   // id -> question
    notes: new Map(),       // slide id -> { md, base, ts }: script edits from the presenter view
    voted: new Set(store.get("hv.voted", [])),
    on(type, fn) { bus.addEventListener(type, (e) => fn(e.detail)); },
    emit(type, detail) { bus.dispatchEvent(new CustomEvent(type, { detail })); },

    forSlide(id) {
      return [...this.questions.values()].filter((q) => q.slide === id && !q.hidden)
        .sort((a, b) => b.votes - a.votes || a.ts - b.ts);
    },
    top(n) {
      return [...this.questions.values()].filter((q) => !q.hidden)
        .sort((a, b) => b.votes - a.votes || a.ts - b.ts).slice(0, n);
    },

    ask(slide, text, name) {
      text = (text || "").trim();
      if (!text) return false;
      return send({ t: "ask", slide, text: text.slice(0, 600), name: (name || "").trim().slice(0, 60) });
    },
    vote(id) {
      if (this.voted.has(id)) return false;
      this.voted.add(id); store.set("hv.voted", [...this.voted]);
      return send({ t: "vote", id, cid: clientId });
    },
    hide(id) { return send({ t: "hide", id }); },
    broadcast(slide) { if (this.presenterKey) send({ t: "slide", slide }); },
    // presenter only: replace a slide's script for everyone; `base` is the hash of
    // the talk.md text it replaces, so the edit is dropped once talk.md changes
    saveNotes(id, md, base) { return this.presenterKey ? send({ t: "notes", id, md: String(md || "").slice(0, 12000), base }) : false; },
    // the edit to show for a slide, if it still applies to this talk.md
    noteFor(slide) { const n = this.notes.get(slide.id); return n && n.base === slide.notesHash ? n : null; },

    start(options) {
      cfg = { ...options };
      // For local testing: ?live=http://127.0.0.1:8787 points at `npx wrangler dev`.
      // Only loopback addresses are accepted, so a link can't redirect the audience.
      const v = params.get("live");
      if (v && /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/.test(v)) cfg.endpoint = v;
      this.enabled = !!cfg.endpoint;
      // Speaker-view iframes ("receivers"), posters and embeds never connect.
      if (this.enabled && !params.has("receiver") && !params.has("poster") && !params.has("embed")) connect();
    },
  };

  let ws = null, retry = 0;
  const queue = [];
  function send(msg) {
    if (!live.enabled) return false;
    if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg));
    else queue.push(msg);
    return true;
  }

  function setStatus(s) { live.status = s; live.emit("status", s); }

  function connect() {
    const base = cfg.endpoint.replace(/\/$/, "").replace(/^http/, "ws");
    const url = `${base}/rooms/${encodeURIComponent(cfg.room || "default")}/ws` +
      (live.presenterKey ? `?key=${encodeURIComponent(live.presenterKey)}` : "");
    setStatus("connecting");
    try { ws = new WebSocket(url); } catch { return schedule(); }
    ws.onopen = () => {
      retry = 0;
      setStatus("open");
      queue.splice(0).forEach((m) => ws.send(JSON.stringify(m)));
    };
    ws.onmessage = (ev) => {
      let m; try { m = JSON.parse(ev.data); } catch { return; }
      if (m.t === "init") {
        live.questions = new Map(m.questions.map((q) => [q.id, q]));
        live.notes = new Map((m.notes || []).map((n) => [n.id, n]));
        live.emit("notes");
        live.presenter = !!m.presenter;
        live.emit("questions");
        if (m.slide) { live.slide = m.slide; live.emit("slide", m.slide); }
        if (live.presenterKey && !m.presenter) live.emit("error", "Presenter key was not accepted");
      } else if (m.t === "slide") {
        live.slide = m.slide; live.emit("slide", m.slide);
      } else if (m.t === "question") {
        live.questions.set(m.q.id, m.q); live.emit("questions", m.q);
      } else if (m.t === "votes") {
        const q = live.questions.get(m.id); if (q) { q.votes = m.votes; live.emit("questions"); }
      } else if (m.t === "hidden") {
        const q = live.questions.get(m.id); if (q) { q.hidden = true; live.emit("questions"); }
      } else if (m.t === "notes") {
        if (m.md) live.notes.set(m.id, { id: m.id, md: m.md, base: m.base, ts: m.ts }); else live.notes.delete(m.id);
        live.emit("notes", m.id);
      } else if (m.t === "error") {
        live.emit("error", m.msg);
      }
    };
    ws.onclose = () => { setStatus("closed"); schedule(); };
    ws.onerror = () => { try { ws.close(); } catch {} };
  }
  function schedule() {
    retry = Math.min(retry + 1, 6);
    setTimeout(connect, 600 * 2 ** retry);
  }

  window.HVLive = live;
})();
