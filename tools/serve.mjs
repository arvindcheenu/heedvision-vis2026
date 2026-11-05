#!/usr/bin/env node
// Local server.
//
//   node tools/serve.mjs          read-only, like GitHub Pages. Nothing can be written.
//   node tools/serve.mjs --dev    dev mode: edit slides and notes, with live reload.
//
// Dev mode is off unless you ask for it, and even then only this machine, holding the
// token printed in your terminal, can write. It binds to 127.0.0.1 and checks Host and
// Origin on every dev request, so a web page can't reach it from your browser (no CSRF,
// no DNS rebinding). Only talk.md and theme.css can be written. The published site is
// static, so none of this exists there: the editor page just says it needs dev mode.
import { createServer } from "node:http";
import { readFile, writeFile, stat, rename } from "node:fs/promises";
import { watch } from "node:fs";
import { extname, join, normalize, resolve, sep } from "node:path";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const argv = process.argv.slice(2);
const DEV = argv.includes("--dev");
const port = Number((argv.find((a) => a.startsWith("--port=")) || "").slice(7) || process.env.PORT || 8000);
const WRITABLE = new Set(["slides/talk.md", "shared/theme.css"]);
const MAX = 2_000_000;
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".md": "text/markdown; charset=utf-8", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".woff2": "font/woff2", ".mp4": "video/mp4", ".pdf": "application/pdf", ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8",
};

// ---------------------------------------------------------------- dev mode
const token = randomBytes(32).toString("hex"); // proves you can read this terminal
const session = randomBytes(32).toString("hex"); // what the browser holds after that
const same = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y); };
const hosts = new Set([`localhost:${port}`, `127.0.0.1:${port}`]);
const loopback = (req) => ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress || "");
const goodHost = (req) => loopback(req) && hosts.has(req.headers.host);
const goodOrigin = (req) => hosts.has(String(req.headers.origin || "").replace(/^http:\/\//, ""));
const hasSession = (req) => {
  const m = /(?:^|;\s*)hv_dev=([0-9a-f]+)/.exec(req.headers.cookie || "");
  return !!m && same(m[1], session);
};

const clients = new Set();
function watchFiles() {
  let t = 0;
  const ping = () => { clearTimeout(t); t = setTimeout(() => clients.forEach((c) => c.write("data: reload\n\n")), 120); };
  for (const p of ["slides", "shared"]) {
    try { watch(join(root, p), { recursive: !extname(p) }, (_, f) => { if (!f || !/(^|\/)vendor\//.test(String(f))) ping(); }); } catch {}
  }
}
const RELOAD = `new EventSource("/__dev/events").onmessage = () => location.reload();`;

async function devRoute(req, res, url) {
  if (!goodHost(req)) { res.writeHead(403).end("Dev mode only answers on this machine.\n"); return; }
  const path = url.pathname;
  if (path === "/__dev/" && req.method === "GET") {
    if (!same(url.searchParams.get("token") || "", token)) { res.writeHead(403, { "Content-Type": "text/plain" }).end("Wrong token. Use the link in your terminal.\n"); return; }
    res.writeHead(302, { "Set-Cookie": `hv_dev=${session}; HttpOnly; SameSite=Strict; Path=/__dev`, Location: "/tools/edit/", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" }).end();
    return;
  }
  if (path === "/__dev/session") { res.writeHead(hasSession(req) ? 204 : 401, { "Cache-Control": "no-store" }).end(); return; }
  if (path === "/__dev/reload.js") { res.writeHead(200, { "Content-Type": TYPES[".js"], "Cache-Control": "no-store" }).end(RELOAD); return; }
  if (path === "/__dev/events") {
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-store", Connection: "keep-alive" });
    res.write(": hello\n\n");
    clients.add(res);
    req.on("close", () => clients.delete(res));
    return;
  }
  if (path === "/__dev/file" && req.method === "PUT") {
    const rel = url.searchParams.get("path") || "";
    if (!hasSession(req) || !goodOrigin(req) || req.headers["x-hv-dev"] !== "1") { res.writeHead(403).end("Not allowed\n"); return; }
    if (!WRITABLE.has(rel)) { res.writeHead(403).end("That file can't be written\n"); return; }
    let body = "";
    for await (const chunk of req) { body += chunk; if (body.length > MAX) { res.writeHead(413).end("Too large\n"); return; } }
    if (!body.trim()) { res.writeHead(400).end("Empty\n"); return; }
    const tmp = `${join(root, rel)}.tmp`;
    await writeFile(tmp, body, "utf8");
    await rename(tmp, join(root, rel));
    console.log(`saved ${rel} (${body.length} bytes)`);
    // a new theme reaches returning visitors at once
    if (rel === "shared/theme.css") {
      const v = new Date().toISOString().replace(/\D/g, "").slice(0, 12);
      for (const page of ["index.html", "talk/index.html", "slides/index.html", "slides/present.html"]) {
        const p = join(root, page);
        await writeFile(p, String(await readFile(p)).replace(/theme\.css\?v=\w+/, `theme.css?v=${v}`), "utf8");
      }
    }
    res.writeHead(204).end();
    return;
  }
  res.writeHead(404).end();
}

// ---------------------------------------------------------------- files
createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  const path = decodeURIComponent(url.pathname);
  try {
    if (path.startsWith("/__dev/")) {
      if (!DEV) { res.writeHead(404).end("Not found\n"); return; }
      await devRoute(req, res, url);
      return;
    }
    if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405).end(); return; }
    let file = normalize(join(root, path));
    if (file !== root && !file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    if ((await stat(file).catch(() => null))?.isDirectory()) file = join(file, "index.html");
    let data = await readFile(file);
    const type = TYPES[extname(file).toLowerCase()] || "application/octet-stream";
    // dev mode adds live reload to the pages; the files themselves know nothing about it
    if (DEV && extname(file) === ".html" && !path.startsWith("/tools/edit")) data = String(data).replace("</body>", `<script src="/__dev/reload.js"></script></body>`);
    res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-cache" });
    res.end(req.method === "HEAD" ? undefined : data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" }).end("Not found\n");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Site:   http://localhost:${port}`);
  if (DEV) {
    watchFiles();
    console.log(`Editor: http://localhost:${port}/__dev/?token=${token}`);
    console.log("Dev mode: saving is on for this link only, until you stop this server.");
  }
});
