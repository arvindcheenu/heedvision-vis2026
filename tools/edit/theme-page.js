// Dev-mode theme page: font, corners and palette, previewed live on the real pages, saved to shared/theme.css.
// Loaded only after the dev server recognizes this browser.
(async function () {
  const COLOURS = [["--title", "Titles"], ["--accent", "Accent"], ["--head", "Headings"], ["--bg", "Background"], ["--surface-2", "Buttons, fields"], ["--fg", "Text"]];
  const STUDY = [["--you", "You"], ["--partner", "Your partner"], ["--both", "Both"]];
  const SYSTEM = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const FONTS = [
    ["Nunito, ships with the site", `"Nunito", ui-rounded, "SF Pro Rounded", ${SYSTEM}`],
    ["SF Pro Rounded, in Safari only", `ui-rounded, "SF Pro Rounded", "Nunito", ${SYSTEM}`],
    ["System sans", SYSTEM],
  ];
  const VIS = {
    light: { "--title": "#df6824", "--accent": "#bb4a72", "--head": "#693a19", "--bg": "#ffffff", "--surface-2": "#faf3ec", "--fg": "#3b352f" },
    dark: { "--title": "#f8a45a", "--accent": "#ed74b5", "--head": "#f8a45a", "--bg": "#1c1815", "--surface-2": "#2a241f", "--fg": "#f6efe9" },
    study: { "--you": "#3d8bff", "--partner": "#f08a3c", "--both": "#ec4f9c" },
    r: 14, font: FONTS[0][1],
  };

  // ------------------------------------------------------------ read and write the file
  let file = await fetch("/shared/theme.css", { cache: "no-store" }).then((r) => r.text());
  const parts = (text) => { const i = text.search(/^\.dark \{/m); return [text.slice(0, i), text.slice(i)]; };
  const get = (text, name) => (new RegExp(`${name}:\\s*([^;]+);`).exec(text) || [])[1]?.trim() || "";
  const put = (text, name, value) => text.replace(new RegExp(`(${name}:\\s*)[^;]+;`), `$1${value};`);
  function read(text) {
    const [l, d] = parts(text);
    return {
      light: Object.fromEntries(COLOURS.map(([k]) => [k, get(l, k)])),
      dark: Object.fromEntries(COLOURS.map(([k]) => [k, get(d, k)])),
      study: Object.fromEntries(STUDY.map(([k]) => [k, get(l, k)])),
      r: parseFloat(get(l, "--r")) || 0,
      font: get(l, "--f-text"),
    };
  }
  let t = read(file);

  const lum = (hex) => { const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const onAccent = (m) => (contrast(t[m]["--accent"], "#ffffff") >= contrast(t[m]["--accent"], "#1c1815") ? "#ffffff" : "#1c1815");

  function compose() {
    let [l, d] = parts(file);
    l = put(put(l, "--f-text", t.font), "--r", `${t.r}px`);
    Object.entries({ ...t.light, ...t.study, "--on-accent": onAccent("light") }).forEach(([k, v]) => (l = put(l, k, v)));
    Object.entries({ ...t.dark, "--on-accent": onAccent("dark") }).forEach(([k, v]) => (d = put(d, k, v)));
    return l + d;
  }
  const tokens = (o) => Object.entries(o).map(([k, v]) => `${k}: ${v};`).join(" ");
  const previewCSS = () => `:root { --f-text: ${t.font}; --r: ${t.r}px; ${tokens(t.light)} ${tokens(t.study)} --on-accent: ${onAccent("light")}; }\n.dark { ${tokens(t.dark)} --on-accent: ${onAccent("dark")}; }`;

  // ------------------------------------------------------------ the page
  const rows = (list, one) => list.map(([k, label]) => `<tr><th scope="row">${label}</th>` + (one
    ? `<td><input type="color" data-group="study" data-k="${k}" aria-label="${label}"></td><td></td>`
    : `<td><input type="color" data-group="light" data-k="${k}" aria-label="${label}, light"></td><td><input type="color" data-group="dark" data-k="${k}" aria-label="${label}, dark"></td>`) + `</tr>`).join("");
  document.body.innerHTML = `
    <div class="th">
      <main class="th-side">
        <div><h1>Theme</h1><p>Everything here shows at once in the preview. Save writes <code>shared/theme.css</code>; commit and push it to publish.</p></div>
        <section aria-labelledby="h-font"><h2 id="h-font">Font</h2>
          <label class="sr" for="font">Font</label>
          <select class="field" id="font">${FONTS.map(([n, v]) => `<option value='${v}'>${n}</option>`).join("")}</select>
        </section>
        <section aria-labelledby="h-r"><h2 id="h-r">Corners</h2>
          <div class="th-row"><label class="sr" for="r">Corner radius in pixels</label><input type="range" id="r" min="0" max="32" step="1"><output for="r" id="r-out"></output></div>
        </section>
        <section aria-labelledby="h-c"><h2 id="h-c">Colours</h2>
          <table class="th-table"><thead><tr><th scope="col"><span class="sr">Colour</span></th><th scope="col">Light</th><th scope="col">Dark</th></tr></thead><tbody>${rows(COLOURS)}</tbody></table>
        </section>
        <section aria-labelledby="h-s"><h2 id="h-s">In the figures</h2>
          <table class="th-table"><tbody>${rows(STUDY, true)}</tbody></table>
        </section>
        <section aria-labelledby="h-read"><h2 id="h-read">Is it readable?</h2><div class="th-read" id="read" role="status"></div></section>
        <div class="th-acts">
          <button type="button" class="btn" id="save">Save</button>
          <button type="button" class="btn" id="undo">Undo changes</button>
          <button type="button" class="btn" id="vis">IEEE VIS colours</button>
          <a class="btn" href="/tools/edit/">Back to slides</a>
          <span id="state" role="status"></span>
        </div>
      </main>
      <section class="th-view" aria-label="Preview">
        <div class="th-tabs" role="group" aria-label="Page to preview">
          <button type="button" class="btn" data-src="/slides/?embed" aria-pressed="true">Slides</button>
          <button type="button" class="btn" data-src="/talk/" aria-pressed="false">Script</button>
          <button type="button" class="btn" data-src="/" aria-pressed="false">Paper</button>
          <span data-theme-picker></span>
        </div>
        <div class="th-frame"><iframe title="Preview" src="/slides/?embed"></iframe></div>
      </section>
    </div>`;
  HVTheme.mountAll();
  const $ = (s) => document.querySelector(s);
  const frame = $("iframe");
  let dirty = false;

  function fill() {
    document.querySelectorAll("input[type=color]").forEach((i) => (i.value = t[i.dataset.group][i.dataset.k]));
    $("#r").value = t.r;
    $("#r-out").textContent = `${t.r} px`;
    const f = $("#font");
    if (![...f.options].some((o) => o.value === t.font)) f.add(new Option("As written in theme.css", t.font));
    f.value = t.font;
  }
  function readout() {
    const line = (label, a, b, need) => { const c = contrast(a, b); return `<span class="${c < need ? "low" : ""}">${label}: ${c.toFixed(1)}:1${c < need ? `, aim for ${need}:1` : ""}</span>`; };
    $("#read").innerHTML = ["light", "dark"].map((m) => line(`${m === "light" ? "Light" : "Dark"}, text`, t[m]["--fg"], t[m]["--bg"], 4.5) + line(`${m === "light" ? "Light" : "Dark"}, accent`, t[m]["--accent"], t[m]["--bg"], 4.5) + line(`${m === "light" ? "Light" : "Dark"}, big titles`, t[m]["--title"], t[m]["--bg"], 3)).join("");
  }
  // this page and the preview both take the new values straight away
  const inject = (doc) => {
    if (!doc) return;
    let s = doc.getElementById("hv-theme-preview");
    if (!s) { s = doc.createElement("style"); s.id = "hv-theme-preview"; doc.head.appendChild(s); }
    s.textContent = previewCSS();
  };
  function apply() {
    inject(document);
    try { inject(frame.contentDocument); frame.contentWindow.dispatchEvent(new Event("hv-theme")); } catch {}
    readout();
  }
  frame.addEventListener("load", apply);
  const changed = () => { dirty = true; $("#state").textContent = "Not saved yet"; apply(); };
  document.addEventListener("input", (e) => {
    const el = e.target;
    if (el.type === "color") t[el.dataset.group][el.dataset.k] = el.value;
    else if (el.id === "r") { t.r = +el.value; $("#r-out").textContent = `${t.r} px`; }
    else if (el.id === "font") t.font = el.value;
    else return;
    changed();
  });
  $(".th-tabs").addEventListener("click", (e) => {
    const b = e.target.closest("[data-src]");
    if (!b) return;
    document.querySelectorAll("[data-src]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    frame.src = b.dataset.src;
  });
  $("#vis").addEventListener("click", () => { t = { ...t, light: { ...VIS.light }, dark: { ...VIS.dark }, study: { ...VIS.study } }; fill(); changed(); });
  $("#undo").addEventListener("click", () => { t = read(file); fill(); apply(); dirty = false; $("#state").textContent = ""; });
  $("#save").addEventListener("click", async () => {
    const text = compose();
    const r = await fetch("/__dev/file?path=shared/theme.css", { method: "PUT", body: text, headers: { "X-HV-Dev": "1", "Content-Type": "text/plain" } }).catch(() => null);
    if (!r || !r.ok) { $("#state").textContent = "Couldn't save: is the dev server still running?"; return; }
    file = text;
    dirty = false;
    $("#state").textContent = "Saved";
  });
  addEventListener("beforeunload", (e) => { if (dirty) e.preventDefault(); });
  fill();
  readout();
})();
