// Shared page behaviour: light/dark theme (remembered across pages).
(function () {
  var KEY = "heedvision-theme";
  function apply(dark) { document.documentElement.classList.toggle("dark", dark); }
  try {
    var t = localStorage.getItem(KEY);
    apply(t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches);
  } catch (e) { apply(matchMedia("(prefers-color-scheme: dark)").matches); }
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-theme-toggle]");
    if (!b) return;
    var dark = !document.documentElement.classList.contains("dark");
    apply(dark);
    try { localStorage.setItem(KEY, dark ? "dark" : "light"); } catch (err) {}
  });
})();
