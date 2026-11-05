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

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  let clientId = store.get("hv.cid", null);
  if (!clientId) { clientId = Math.random().toString(36).slice(2) + Date.now().toString(36); store.set("hv.cid", clientId); }

  const filled = new WeakMap();
  const bus = new EventTarget();
  let cfg = {};
  const live = {
    enabled: false,
    status: "off",          // off | connecting | open | closed
    presenterKey: params.get("present") || "",
    presenter: false,       // the relay accepted this browser as the host
    replies: false,
    moderation: false,      // this relay can hold questions for approval
    moderate: false,        // ...and is doing so
    slide: null,            // last slide broadcast by the presenter
    questions: new Map(),   // id -> question
    notes: new Map(),       // slide id -> { md, base, ts }: script edits from the presenter view
    voted: new Set(store.get("hv.voted", [])),
    on(type, fn) { bus.addEventListener(type, (e) => fn(e.detail)); },
    emit(type, detail) { bus.dispatchEvent(new CustomEvent(type, { detail })); },

    forSlide(id) {
      return [...this.questions.values()].filter((q) => q.slide === id && !q.hidden && !q.pending)
        .sort((a, b) => b.votes - a.votes || a.ts - b.ts);
    },
    // everything this client may see: waiting for approval first, then not yet answered, then most votes
    all() {
      return [...this.questions.values()].filter((q) => !q.hidden)
        .sort((a, b) => !!b.pending - !!a.pending || !!a.answer - !!b.answer || b.votes - a.votes || a.ts - b.ts);
    },
    // what's worth putting on the projected slide
    top(n) { return this.all().filter((q) => !q.answer && !q.pending).slice(0, n); },
    // what to tell someone who just asked
    sentNote() {
      if (this.status !== "open") return "Saved; it will send when the connection is back.";
      return this.moderate ? "Sent. Thanks! It will appear here once the speaker approves it." : "Sent. Thanks! The speaker can see it now.";
    },
    // a list of questions: replaced only when it changed, so screen readers announce only what's new,
    // and the keyboard stays on the button it was on
    fill(list, qs, empty) {
      const html = qs.length ? qs.map((q) => this.questionHTML(q)).join("") : `<li class="q-empty">${esc(empty)}</li>`;
      if (filled.get(list) === html) return;
      const on = list.contains(document.activeElement) ? document.activeElement.dataset.vote : null;
      list.innerHTML = html;
      filled.set(list, html);
      if (on) list.querySelector(`[data-vote="${CSS.escape(on)}"]`)?.focus();
    },
    // one question, the same on the script page and the slides
    questionHTML(q) {
      const who = q.name || "Anonymous";
      return `<li class="q"><div><p>${esc(q.text)}</p><small>${esc(who)}</small>${q.answer ? `<p class="q-answer"><b>Speaker:</b> ${esc(q.answer)}</p>` : ""}</div>` +
        `<button type="button" class="btn" data-vote="${esc(q.id)}" aria-pressed="${this.voted.has(q.id)}" aria-label="Upvote this question, ${q.votes} ${q.votes === 1 ? "vote" : "votes"} so far"><span aria-hidden="true">▲ ${q.votes}</span></button></li>`;
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
    // presenter only: delete for everyone, approve a held question, hold new questions or not
    hide(id) { return send({ t: "hide", id }); },
    approve(id) { return send({ t: "approve", id }); },
    setModerate(on) { return send({ t: "moderate", on: !!on }); },
    // presenter only: a written reply, shown under the question for everyone (empty text removes it)
    answer(id, text) { return send({ t: "answer", id, text: String(text || "").trim().slice(0, 1200) }); },
    broadcast(slide) { if (this.presenterKey) send({ t: "slide", slide }); },
    // presenter only: replace a slide's script for everyone; `base` is the hash of
    // the talk.md text it replaces, so the edit is dropped once talk.md changes
    saveNotes(id, md, base) { return this.presenterKey ? send({ t: "notes", id, md: String(md || "").slice(0, 12000), base }) : false; },
    // the edit to show for a slide, if it still applies to this talk.md
    noteFor(slide) { const n = this.notes.get(slide.id); return n && n.base === slide.notesHash ? n : null; },

    // the host: sign in, change the passphrase, sign out. Each answers once the relay has.
    signIn(key) {
      this.presenterKey = key;
      if (ws && ws.readyState === 1) sendAuth();
      return new Promise((done) => waiters.auth.push(done));
    },
    changeKey(key) {
      send({ t: "set-key", key });
      return new Promise((done) => waiters.key.push((ok) => { if (ok) this.presenterKey = key; done(ok); }));
    },
    signOut() {
      this.presenterKey = "";
      this.presenter = false;
      send({ t: "signout" });
    },

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

  let ws = null, retry = 0, signingIn = false;
  const queue = [];
  const waiters = { auth: [], key: [] };
  function send(msg) {
    if (!live.enabled) return false;
    // nothing overtakes a sign-in: the relay would refuse it
    if (ws && ws.readyState === 1 && !signingIn) ws.send(JSON.stringify(msg));
    else queue.push(msg);
    return true;
  }
  function flush() { if (ws && ws.readyState === 1 && !signingIn) queue.splice(0).forEach((m) => ws.send(JSON.stringify(m))); }
  function sendAuth() {
    signingIn = true;
    ws.send(JSON.stringify({ t: "auth", key: live.presenterKey }));
  }

  function setStatus(s) { live.status = s; live.emit("status", s); }

  function connect() {
    const base = cfg.endpoint.replace(/\/$/, "").replace(/^http/, "ws");
    const url = `${base}/rooms/${encodeURIComponent(cfg.room || "default")}/ws`;
    setStatus("connecting");
    try { ws = new WebSocket(url); } catch { return schedule(); }
    ws.onopen = () => {
      retry = 0;
      setStatus("open");
      if (live.presenterKey) sendAuth();
      flush();
    };
    ws.onmessage = (ev) => {
      let m; try { m = JSON.parse(ev.data); } catch { return; }
      if (m.t === "init") {
        live.questions = new Map(m.questions.map((q) => [q.id, q]));
        live.notes = new Map((m.notes || []).map((n) => [n.id, n]));
        live.presenter = !!m.presenter;
        live.replies = !!m.replies; // this relay can store replies
        live.moderation = !!m.moderation;
        live.moderate = !!m.moderate;
        live.emit("notes");
        live.emit("questions");
        if (m.slide) { live.slide = m.slide; live.emit("slide", m.slide); }
      } else if (m.t === "auth") {
        signingIn = false;
        // too many wrong guesses from this network: a remembered passphrase isn't wrong, so it waits and tries again
        if (!m.ok && m.reason === "wait" && live.presenterKey && !waiters.auth.length) {
          setTimeout(() => { if (ws && ws.readyState === 1 && live.presenterKey) sendAuth(); }, 20000);
          flush();
          return;
        }
        if (!m.ok) { live.presenterKey = ""; live.presenter = false; live.emit("questions"); }
        live.emit("auth", { ok: !!m.ok, reason: m.reason });
        waiters.auth.splice(0).forEach((done) => done({ ok: !!m.ok, reason: m.reason }));
        flush();
      } else if (m.t === "key-set") {
        waiters.key.splice(0).forEach((done) => done(!!m.ok));
      } else if (m.t === "slide") {
        live.slide = m.slide; live.emit("slide", m.slide);
      } else if (m.t === "question") {
        live.questions.set(m.q.id, m.q); live.emit("questions", m.q);
      } else if (m.t === "votes") {
        const q = live.questions.get(m.id); if (q) { q.votes = m.votes; live.emit("questions"); }
      } else if (m.t === "hidden") {
        if (live.questions.delete(m.id)) live.emit("questions");
      } else if (m.t === "moderate") {
        live.moderate = !!m.on; live.emit("questions");
      } else if (m.t === "answered") {
        const q = live.questions.get(m.id); if (q) { q.answer = m.answer; live.emit("questions"); }
      } else if (m.t === "notes") {
        if (m.md) live.notes.set(m.id, { id: m.id, md: m.md, base: m.base, ts: m.ts }); else live.notes.delete(m.id);
        live.emit("notes", m.id);
      } else if (m.t === "error") {
        live.emit("error", m.msg);
      }
    };
    ws.onclose = () => { signingIn = false; setStatus("closed"); schedule(); };
    ws.onerror = () => { try { ws.close(); } catch {} };
  }
  function schedule() {
    retry = Math.min(retry + 1, 6);
    setTimeout(connect, 600 * 2 ** retry);
  }

  window.HVLive = live;
})();
