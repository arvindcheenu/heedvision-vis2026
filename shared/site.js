// Applies site.config.js before the page paints: accent, fonts, title, icon.
(function () {
  var S = window.SITE || {};
  var root = document.documentElement.style;
  var font = function (f) { return f === "sans" ? "var(--font-sans)" : f === "serif" ? "var(--font-serif)" : f; };
  if (S.accent) root.setProperty("--accent", S.accent);
  var fonts = S.fonts || {};
  if (fonts.heading) root.setProperty("--font-heading", font(fonts.heading));
  if (fonts.body) root.setProperty("--font-body", font(fonts.body));
  var icon = document.createElement("link");
  icon.rel = "icon";
  icon.type = "image/svg+xml";
  icon.href = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="13" fill="' + (S.accent || "#000") + '"/></svg>');
  document.head.appendChild(icon);
})();
