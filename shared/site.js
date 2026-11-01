// Shared page behaviour: light/dark theme, remembered across pages and kept in
// sync between open tabs and embedded slides. Fires "hv-theme" when it changes.
(function () {
  var KEY = "heedvision-theme";
  function apply(dark) {
    var was = document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", dark);
    if (was !== dark) window.dispatchEvent(new Event("hv-theme"));
  }
  function stored() {
    var forced = /[?&]theme=(dark|light)/.exec(location.search); // ?theme= for stills and testing
    if (forced) return forced[1] === "dark";
    try { var t = localStorage.getItem(KEY); if (t) return t === "dark"; } catch (e) {}
    return matchMedia("(prefers-color-scheme: dark)").matches;
  }
  apply(stored());
  function toggle() {
    var dark = !document.documentElement.classList.contains("dark");
    apply(dark);
    try { localStorage.setItem(KEY, dark ? "dark" : "light"); } catch (err) {}
  }
  window.HVTheme = { toggle: toggle, isDark: function () { return document.documentElement.classList.contains("dark"); } };
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-theme-toggle]");
    if (b) toggle();
  });
  // another tab, or the page around an embedded slide, changed the theme
  window.addEventListener("storage", function (e) { if (e.key === KEY) apply(stored()); });
})();
