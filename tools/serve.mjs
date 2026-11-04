#!/usr/bin/env node
// Local server for rehearsing: serves the site like GitHub Pages does, and lets
// the presenter view save script edits straight into slides/talk.md.
//
//   node tools/serve.mjs            → http://localhost:8000
//   PORT=8080 node tools/serve.mjs
//
// Only requests from this machine (and from a page on this server) may write,
// and only to slides/talk.md.
import { createServer } from "node:http";
import { readFile, writeFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const port = Number(process.env.PORT || 8000);
const TALK = join(root, "slides", "talk.md");
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".md": "text/markdown; charset=utf-8", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".woff2": "font/woff2", ".mp4": "video/mp4", ".pdf": "application/pdf", ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8",
};

const local = (req) => {
  const a = req.socket.remoteAddress || "";
  const origin = req.headers.origin;
  const loopback = a === "127.0.0.1" || a === "::1" || a === "::ffff:127.0.0.1";
  return loopback && (!origin || origin === `http://localhost:${port}` || origin === `http://127.0.0.1:${port}`);
};

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  const path = decodeURIComponent(url.pathname);
  try {
    if (path === "/__hv/save") {
      res.writeHead(local(req) ? 200 : 403, { "Cache-Control": "no-store" }).end();
      return;
    }
    if (req.method === "PUT") {
      if (path !== "/slides/talk.md" || !local(req)) { res.writeHead(403).end("Not allowed\n"); return; }
      let body = "";
      for await (const chunk of req) { body += chunk; if (body.length > 2_000_000) { res.writeHead(413).end(); return; } }
      await writeFile(TALK, body, "utf8");
      console.log(`saved slides/talk.md (${body.length} bytes)`);
      res.writeHead(204).end();
      return;
    }
    if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405).end(); return; }
    let file = normalize(join(root, path));
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    if ((await stat(file).catch(() => null))?.isDirectory()) file = join(file, "index.html");
    const data = await readFile(file);
    res.writeHead(200, { "Content-Type": TYPES[extname(file).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(req.method === "HEAD" ? undefined : data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" }).end("Not found\n");
  }
}).listen(port, "127.0.0.1", () => console.log(`HeedVision on http://localhost:${port}  (script edits save to slides/talk.md)`));
