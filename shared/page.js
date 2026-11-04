// The project page: site.config.js plus project.md. Plain markdown, with four extras:
//   ::authors    the people in site.config.js
//   ::links      turns the list under it into a row of links
//   ::deck       the talk, embedded, with arrows
//   ::logos      the logos in site.config.js
(async function () {
  const S = window.SITE || {};
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const root = document.getElementById("page");
  const src = await fetch("project.md", { cache: "no-cache" }).then((r) => r.text());
  const doc = MDeck.split(src);
  const body = src.replace(/^\s*---[\s\S]*?\n---\n/, "");

  const pieces = {
    // page properties: authors, venue, keywords
    authors: () => `<dl class="props"><dt>Authors</dt><dd>${(S.authors || []).map((p) => (p.url ? `<a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.name)}</a>` : `<span>${esc(p.name)}</span>`)).join("")}</dd>${S.venue ? `<dt>Venue</dt><dd>${esc(S.venue)}</dd>` : ""}${S.keywords ? `<dt>Keywords</dt><dd style="gap:4px">${S.keywords.map((k, i) => `<span class="tag ${["you", "partner", "both", ""][i % 4]}">${esc(k)}</span>`).join("")}</dd>` : ""}</dl>`,
    deck: () => `<div class="deck-wide"><div class="deck-frame"><iframe id="talk-iframe" src="slides/?embed" title="Talk slides" loading="lazy" allow="fullscreen; autoplay"></iframe></div>
      <div class="deck-ctl"><button class="btn" type="button" data-go="prev" aria-label="Previous" disabled>‹</button><button class="btn" type="button" data-go="next" aria-label="Next">›</button><span class="pos" aria-live="polite"></span></div></div>`,
    logos: () => `<div class="foot-logos">${(S.logos || []).map((l) => `<img src="${esc(l.src)}" alt="${esc(l.alt || "")}">`).join("")}</div>`,
  };
  const html = body.split(/\n(?=::[a-z]+\s*\n)/).map((chunk) => {
    const m = chunk.match(/^::([a-z]+)\s*\n([\s\S]*)$/);
    if (!m) return marked.parse(chunk);
    if (m[1] === "links") {
      const [list, ...rest] = m[2].split(/\n\s*\n/);
      return `<div class="links">${marked.parseInline(list.replace(/^\s*-\s+/gm, ""))}</div>${marked.parse(rest.join("\n\n"))}`;
    }
    return (pieces[m[1]] ? pieces[m[1]]() : "") + marked.parse(m[2]);
  }).join("");

  root.innerHTML = `${S.icon ? `<div><img class="page-icon" src="${esc(S.icon)}" alt=""></div>` : ""}<h1 class="intro"><b>${esc(S.title)}</b> ${esc(S.subtitle)}</h1>${html}`;
  const name = document.querySelector(".top .name");
  if (name) name.innerHTML = `${S.icon ? `<img src="${esc(S.icon)}" alt="">` : ""}${esc(S.title)}`;
  document.title = S.title ? `${S.title}: ${S.subtitle}` : "";
  if (doc.meta.description) document.querySelector('meta[name="description"]')?.setAttribute("content", doc.meta.description);

  // a figure's alt text is its caption
  root.querySelectorAll("p > img:only-child").forEach((img) => {
    const fig = document.createElement("figure");
    img.parentElement.replaceWith(fig);
    fig.append(img);
    if (img.alt) { const c = document.createElement("figcaption"); c.textContent = img.alt; fig.append(c); }
  });
  // copy buttons on code blocks
  root.querySelectorAll("pre").forEach((pre) => {
    const b = document.createElement("button");
    b.className = "btn copy"; b.type = "button"; b.textContent = "Copy";
    b.onclick = () => navigator.clipboard.writeText(pre.querySelector("code").textContent).then(() => { b.textContent = "Copied"; setTimeout(() => (b.textContent = "Copy"), 1500); });
    pre.append(b);
  });
  // links out open in a new tab
  root.querySelectorAll('a[href^="http"]').forEach((a) => { a.target = "_blank"; a.rel = "noopener"; });

  const frame = document.getElementById("talk-iframe");
  if (frame) {
    const pos = root.querySelector(".deck-ctl .pos");
    root.querySelectorAll(".deck-ctl [data-go]").forEach((b) => b.addEventListener("click", () => frame.contentWindow.postMessage({ hv: "go", dir: b.dataset.go }, location.origin)));
    addEventListener("message", (e) => {
      if (e.origin !== location.origin || e.source !== frame.contentWindow || !e.data || e.data.hv !== "state") return;
      pos.textContent = `${e.data.index + 1} / ${e.data.total}`;
      root.querySelector('[data-go="prev"]').disabled = !e.data.prev;
      root.querySelector('[data-go="next"]').disabled = !e.data.next;
    });
  }
})();
