// HeedVision live relay.
// One Durable Object per room keeps the presenter's current slide and the
// audience's questions, and fans updates out over hibernatable WebSockets.
//
//   GET /rooms/:room/ws      WebSocket (add ?key=PRESENTER_KEY to present)
//   GET /rooms/:room/state   current slide, visible questions and script edits as JSON
//   GET /rooms/:room/stats   visits to the paper page by hour, likes, and the toolkit's GitHub stars
//   POST /rooms/:room/hit    counts one visit. Stores a number per hour, nothing about the visitor
//   POST /rooms/:room/like   {target: "paper" | "slides", cid, on}
import { DurableObject } from "cloudflare:workers";

const MAX_TEXT = 600;
const MAX_NAME = 60;
const MAX_QUESTIONS = 2000;
const MAX_NOTES = 12000;
const MAX_ANSWER = 1200;
const LIKE_TARGETS = ["paper", "slides"];
const HOUR = 3_600_000;
const STARS_REPO = "arvindcheenu/caav";
const STARS_EVERY = 120_000;

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const origin = req.headers.get("Origin") || "";
    const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
    const originOk = !origin || allowed.includes("*") || allowed.includes(origin);

    if (req.method === "OPTIONS") return withCors(new Response(null, { status: 204 }), origin, originOk);

    const m = url.pathname.match(/^\/rooms\/([a-z0-9-]{1,40})\/(ws|state|stats|hit|like)$/i);
    if (!m) return new Response("HeedVision live relay\n", { status: 404 });
    if (!originOk) return new Response("Origin not allowed\n", { status: 403 });

    const room = env.ROOMS.get(env.ROOMS.idFromName(m[1].toLowerCase()));
    if (m[2] === "ws") {
      if (req.headers.get("Upgrade") !== "websocket") return new Response("Expected a WebSocket\n", { status: 426 });
      return room.fetch(req);
    }
    return withCors(await room.fetch(req), origin, originOk);
  },
};

export class Room extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY, slide TEXT, text TEXT, name TEXT,
      votes INTEGER NOT NULL DEFAULT 0, ts INTEGER, hidden INTEGER NOT NULL DEFAULT 0)`);
    try { this.sql.exec("ALTER TABLE questions ADD COLUMN answer TEXT NOT NULL DEFAULT ''"); } catch {} // already there
    try { this.sql.exec("ALTER TABLE questions ADD COLUMN pending INTEGER NOT NULL DEFAULT 0"); } catch {} // already there
    this.sql.exec(`CREATE TABLE IF NOT EXISTS votes (qid TEXT, voter TEXT, PRIMARY KEY (qid, voter))`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS notes (id TEXT PRIMARY KEY, md TEXT, base TEXT, ts INTEGER)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS visits (hour INTEGER PRIMARY KEY, n INTEGER NOT NULL)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS likes (target TEXT, cid TEXT, PRIMARY KEY (target, cid))`);
    this.buckets = new Map(); // in-memory rate limits; reset when the object sleeps
  }

  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname.endsWith("/state")) {
      return Response.json({ slide: this.slide(), questions: this.questions(false), notes: this.notes() });
    }
    if (url.pathname.endsWith("/stats")) {
      // the first ever request waits for the count; after that, answer at once and refresh behind the scenes
      if (this.stats().stars === null) await this.refreshStars();
      else this.ctx.waitUntil(this.refreshStars());
      return Response.json(this.stats());
    }
    if (url.pathname.endsWith("/hit") || url.pathname.endsWith("/like")) {
      if (req.method !== "POST") return new Response("Use POST\n", { status: 405 });
      const who = req.headers.get("CF-Connecting-IP") || "local";
      if (url.pathname.endsWith("/hit")) {
        if (this.allow(`hit:${who}`, 30, 60_000)) this.sql.exec("INSERT INTO visits (hour, n) VALUES (?, 1) ON CONFLICT (hour) DO UPDATE SET n = n + 1", Math.floor(Date.now() / HOUR));
        return Response.json({ ok: true });
      }
      if (!this.allow(`like:${who}`, 20, 60_000)) return Response.json({ error: "Too many likes for now." }, { status: 429 });
      let m;
      try { m = JSON.parse(await req.text()); } catch { return new Response("Bad JSON\n", { status: 400 }); }
      const cid = cleanId(m.cid);
      if (!LIKE_TARGETS.includes(m.target) || !cid) return new Response("Bad like\n", { status: 400 });
      if (m.on) this.sql.exec("INSERT OR IGNORE INTO likes (target, cid) VALUES (?, ?)", m.target, cid);
      else this.sql.exec("DELETE FROM likes WHERE target = ? AND cid = ?", m.target, cid);
      return Response.json({ likes: this.stats().likes });
    }
    const key = url.searchParams.get("key") || "";
    const presenter = await isPresenterKey(key, this.env.PRESENTER_KEY);
    const ip = req.headers.get("CF-Connecting-IP") || "local";
    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ presenter, ip });
    server.send(JSON.stringify({ t: "init", presenter, replies: true, moderation: true, moderate: this.moderate(), slide: this.slide(), questions: this.questions(presenter), notes: this.notes() }));
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, raw) {
    if (typeof raw !== "string" || raw.length > MAX_NOTES + 1024) return;
    let m;
    try { m = JSON.parse(raw); } catch { return; }
    const { presenter, ip } = ws.deserializeAttachment() || {};

    if (m.t === "slide") {
      if (!presenter) return;
      const s = cleanSlide(m.slide);
      if (!s) return;
      this.sql.exec("INSERT OR REPLACE INTO meta (k, v) VALUES ('slide', ?)", JSON.stringify(s));
      this.broadcast({ t: "slide", slide: s }, ws);
    } else if (m.t === "ask") {
      if (!this.allow(`ask:${ip}`, 5, 60_000)) return send(ws, { t: "error", msg: "Max 5 questions a minute, please." });
      const text = cleanText(m.text, MAX_TEXT);
      if (!text) return;
      const count = this.sql.exec("SELECT COUNT(*) AS n FROM questions").one().n;
      if (count >= MAX_QUESTIONS) return send(ws, { t: "error", msg: "This room is full." });
      const q = {
        id: crypto.randomUUID(),
        slide: cleanId(m.slide) || "general",
        text,
        name: cleanText(m.name, MAX_NAME),
        votes: 0,
        ts: Date.now(),
        hidden: false,
        answer: "",
        // with "approve first" on, only the presenter sees it until they approve it
        pending: this.moderate() && !presenter,
      };
      this.sql.exec("INSERT INTO questions (id, slide, text, name, votes, ts, pending) VALUES (?, ?, ?, ?, 0, ?, ?)", q.id, q.slide, q.text, q.name, q.ts, q.pending ? 1 : 0);
      if (q.pending) this.toPresenters({ t: "question", q });
      else this.broadcast({ t: "question", q });
    } else if (m.t === "vote") {
      if (!this.allow(`vote:${ip}`, 60, 60_000)) return;
      const id = cleanId(m.id, 64);
      const voter = String(m.cid || "").slice(0, 64);
      if (!id || !voter) return;
      const ins = this.sql.exec("INSERT OR IGNORE INTO votes (qid, voter) SELECT id, ? FROM questions WHERE id = ? AND hidden = 0 AND pending = 0", voter, id);
      if (!ins.rowsWritten) return;
      const votes = this.sql.exec("UPDATE questions SET votes = votes + 1 WHERE id = ? RETURNING votes", id).one().votes;
      this.broadcast({ t: "votes", id, votes });
    } else if (m.t === "notes") {
      // presenter only: an edited script for one slide (empty text removes the edit)
      if (!presenter) return;
      const id = cleanId(m.id);
      const base = cleanId(m.base, 16);
      if (!id || !base) return;
      const md = String(m.md ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").slice(0, MAX_NOTES);
      const ts = Date.now();
      if (md.trim()) this.sql.exec("INSERT OR REPLACE INTO notes (id, md, base, ts) VALUES (?, ?, ?, ?)", id, md, base, ts);
      else this.sql.exec("DELETE FROM notes WHERE id = ?", id);
      this.broadcast({ t: "notes", id, md: md.trim() ? md : "", base, ts });
    } else if (m.t === "answer") {
      // presenter only: a reply under a question, or empty text to take it back
      if (!presenter) return;
      const id = cleanId(m.id, 64);
      if (!id) return;
      const answer = cleanText(m.text, MAX_ANSWER);
      this.sql.exec("UPDATE questions SET answer = ? WHERE id = ?", answer, id);
      this.broadcast({ t: "answered", id, answer });
    } else if (m.t === "approve") {
      // presenter only: a held question goes public
      if (!presenter) return;
      const id = cleanId(m.id, 64);
      if (!id) return;
      const row = this.sql.exec("UPDATE questions SET pending = 0 WHERE id = ? AND pending = 1 RETURNING id, slide, text, name, votes, ts, answer", id).toArray()[0];
      if (row) this.broadcast({ t: "question", q: { ...row, hidden: false, pending: false } });
    } else if (m.t === "moderate") {
      // presenter only: hold new questions for approval, or not. Questions already held stay held.
      if (!presenter) return;
      const on = !!m.on;
      this.sql.exec("INSERT OR REPLACE INTO meta (k, v) VALUES ('moderate', ?)", on ? "1" : "0");
      this.broadcast({ t: "moderate", on });
    } else if (m.t === "hide") {
      // presenter only: delete a question and its votes for good
      if (!presenter) return;
      const id = cleanId(m.id, 64);
      if (!id) return;
      this.sql.exec("DELETE FROM votes WHERE qid = ?", id);
      this.sql.exec("DELETE FROM questions WHERE id = ?", id);
      this.broadcast({ t: "hidden", id });
    }
  }

  async webSocketClose() {}
  async webSocketError() {}

  stats() {
    const since = Math.floor(Date.now() / HOUR) - 24 * 7;
    const likes = Object.fromEntries(LIKE_TARGETS.map((t) => [t, this.sql.exec("SELECT COUNT(*) AS n FROM likes WHERE target = ?", t).one().n]));
    const stars = this.sql.exec("SELECT v FROM meta WHERE k = 'stars'").toArray()[0];
    return {
      stars: stars ? JSON.parse(stars.v).n : null,
      visits: this.sql.exec("SELECT COALESCE(SUM(n), 0) AS n FROM visits").one().n,
      hours: this.sql.exec("SELECT hour, n FROM visits WHERE hour >= ? ORDER BY hour", since).toArray(),
      likes,
    };
  }

  // The relay asks, not each visitor, and shares the answer. GitHub often refuses anonymous requests from
  // Cloudflare's shared addresses, so a public cached copy is the fallback. A failed check keeps the last count.
  async refreshStars() {
    const row = this.sql.exec("SELECT v FROM meta WHERE k = 'stars'").toArray()[0];
    const had = row ? JSON.parse(row.v) : null;
    const now = Date.now();
    if ((had && now - had.ts < STARS_EVERY) || now - (this.starsTried || 0) < STARS_EVERY) return;
    this.starsTried = now;
    const n = (await starsFromGitHub(this.env.GITHUB_TOKEN)) ?? (await starsFromShields());
    console.log("stars", n);
    if (n !== null) this.sql.exec("INSERT OR REPLACE INTO meta (k, v) VALUES ('stars', ?)", JSON.stringify({ n, ts: now }));
  }

  slide() {
    const row = this.sql.exec("SELECT v FROM meta WHERE k = 'slide'").toArray()[0];
    return row ? JSON.parse(row.v) : null;
  }

  // held questions go to the presenter only
  questions(withHeld) {
    return this.sql
      .exec(`SELECT id, slide, text, name, votes, ts, answer, pending FROM questions WHERE hidden = 0${withHeld ? "" : " AND pending = 0"} ORDER BY ts LIMIT 1000`)
      .toArray()
      .map((q) => ({ ...q, hidden: false, pending: !!q.pending }));
  }

  moderate() {
    const row = this.sql.exec("SELECT v FROM meta WHERE k = 'moderate'").toArray()[0];
    return !!row && row.v === "1";
  }

  toPresenters(msg) {
    const data = JSON.stringify(msg);
    for (const ws of this.ctx.getWebSockets()) {
      if (!ws.deserializeAttachment()?.presenter) continue;
      try { ws.send(data); } catch {}
    }
  }

  notes() {
    return this.sql.exec("SELECT id, md, base, ts FROM notes ORDER BY id LIMIT 500").toArray();
  }

  broadcast(msg, except) {
    const data = JSON.stringify(msg);
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === except) continue;
      try { ws.send(data); } catch {}
    }
  }

  allow(bucket, limit, windowMs) {
    const now = Date.now();
    const hits = (this.buckets.get(bucket) || []).filter((t) => now - t < windowMs);
    if (hits.length >= limit) return false;
    hits.push(now);
    this.buckets.set(bucket, hits);
    return true;
  }
}

async function starsFromGitHub(token) {
  try {
    const headers = { "User-Agent": "heedvision-live", Accept: "application/vnd.github+json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const r = await fetch(`https://api.github.com/repos/${STARS_REPO}`, { headers });
    if (!r.ok) { console.log("github", r.status); return null; }
    const n = (await r.json()).stargazers_count;
    return Number.isInteger(n) ? n : null;
  } catch (e) { console.log("github", String(e)); return null; }
}

async function starsFromShields() {
  try {
    const r = await fetch(`https://img.shields.io/github/stars/${STARS_REPO}.json`, { headers: { "User-Agent": "heedvision-live" } });
    if (!r.ok) { console.log("shields", r.status); return null; }
    const m = /^(\d+(?:\.\d+)?)(k?)$/.exec(String((await r.json()).message).trim());
    return m ? Math.round(parseFloat(m[1]) * (m[2] ? 1000 : 1)) : null;
  } catch (e) { console.log("shields", String(e)); return null; }
}

function send(ws, msg) { try { ws.send(JSON.stringify(msg)); } catch {} }

function cleanText(v, max) {
  return String(v ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max);
}

function cleanId(v, max = 64) {
  const s = String(v ?? "");
  return s.length <= max && /^[A-Za-z0-9_-]+$/.test(s) ? s : "";
}

function cleanSlide(s) {
  if (!s || typeof s !== "object") return null;
  const id = cleanId(s.id);
  if (!id) return null;
  const int = (n) => (Number.isInteger(n) && n >= -1 && n < 1000 ? n : 0);
  return { id, h: int(s.h), v: int(s.v), f: int(s.f), ts: Date.now() };
}

async function isPresenterKey(given, expected) {
  if (!given || !expected) return false;
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([given, expected].map((s) => crypto.subtle.digest("SHA-256", enc.encode(s))));
  return crypto.subtle.timingSafeEqual(a, b);
}

function withCors(res, origin, ok) {
  if (!origin || !ok) return res;
  const r = new Response(res.body, res);
  r.headers.set("Access-Control-Allow-Origin", origin);
  r.headers.set("Vary", "Origin");
  r.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  return r;
}
