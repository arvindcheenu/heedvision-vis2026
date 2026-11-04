// Applies site.config.js before the page paints, and runs the light, dark and system
// theme: remembered per browser, shared by every page and embedded slide.
(function () {
  var S = window.SITE || {};
  var root = document.documentElement;
  if (S.accent) root.style.setProperty("--accent", S.accent);
  if (S.font) root.style.setProperty("--font", S.font);

  var KEY = "site-theme";
  var dark = matchMedia("(prefers-color-scheme: dark)");
  var forced = /[?&]theme=(dark|light)/.exec(location.search); // for stills and testing
  function mode() { try { return localStorage.getItem(KEY) || "system"; } catch (e) { return "system"; } }
  function apply() {
    var m = forced ? forced[1] : mode();
    var on = m === "dark" || (m === "system" && dark.matches);
    var was = root.classList.contains("dark");
    root.classList.toggle("dark", on);
    document.querySelectorAll("[data-theme-picker] button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.mode === mode())); });
    if (was !== on) window.dispatchEvent(new Event("hv-theme"));
  }
  function set(m) { try { localStorage.setItem(KEY, m); } catch (e) {} apply(); }
  var MODES = ["light", "dark", "system"];
  var ICON = {
    light: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    dark: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>',
    system: '<rect x="3" y="4" width="18" height="13" rx="2.5"/><path d="M9 21h6M12 17v4"/>',
  };
  function mount(el) {
    el.setAttribute("role", "group");
    el.setAttribute("aria-label", "Theme");
    el.classList.add("theme-picker");
    el.innerHTML = MODES.map(function (m) {
      return '<button type="button" data-mode="' + m + '" title="' + m[0].toUpperCase() + m.slice(1) + '" aria-label="' + m + '" aria-pressed="' + (m === mode()) + '"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + ICON[m] + "</svg></button>";
    }).join("");
  }
  window.HVTheme = {
    set: set, mode: mode, mount: mount,
    cycle: function () { set(MODES[(MODES.indexOf(mode()) + 1) % 3]); },
    mountAll: function () { document.querySelectorAll("[data-theme-picker]").forEach(mount); },
  };
  apply();
  dark.addEventListener("change", apply);
  addEventListener("storage", function (e) { if (e.key === KEY) apply(); });
  document.addEventListener("click", function (e) { var b = e.target.closest && e.target.closest("[data-theme-picker] button"); if (b) set(b.dataset.mode); });
  document.addEventListener("DOMContentLoaded", window.HVTheme.mountAll);

  var icon = document.createElement("link");
  icon.rel = "icon";
  icon.type = "image/svg+xml";
  icon.href = S.iconAbsolute || "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#111"/><rect x="5" y="5" width="10" height="10" rx="3" fill="#3d8bff"/><rect x="17" y="5" width="10" height="10" rx="3" fill="' + (S.accent || "#ec4f9c") + '"/><rect x="17" y="17" width="10" height="10" rx="3" fill="#f08a3c"/><rect x="5" y="17" width="10" height="10" rx="3" fill="#ffffff" fill-opacity=".16"/></svg>');
  document.head.appendChild(icon);
})();
