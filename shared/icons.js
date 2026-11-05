// Font Awesome Pro icons, from shared/icons.svg (tools/build-icons.py makes it). If that can't load,
// everything keeps its own simpler icon.
//   <svg data-fa="file-pdf">fallback paths</svg>   filled from fa-file-pdf; hidden if it has no fallback
//   <use href="#ic-eye">                           the slide icons, named in shared/icons.tsv
(function () {
  var url = document.currentScript.src.replace("icons.js", "icons.svg");
  // until they load, an icon holds its place; if they can't, it gives the place back
  function none() { document.documentElement.classList.add("no-fa"); }
  fetch(url).then(function (r) { return r.ok ? r.text() : null; }).then(function (text) {
    if (!text) return none();
    var doc = new DOMParser().parseFromString(text, "image/svg+xml");
    var symbols = {};
    doc.querySelectorAll("symbol").forEach(function (s) { symbols[s.id] = s; });
    function start() {
      var host = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      host.setAttribute("aria-hidden", "true");
      host.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
      // a slide's <use> picks this up as soon as its symbol is replaced
      Object.keys(symbols).forEach(function (id) {
        if (id.indexOf("ic-") !== 0) return;
        var old = document.getElementById(id);
        if (old) old.remove();
        host.appendChild(document.importNode(symbols[id], true));
      });
      document.body.appendChild(host);
      function fill() {
        document.querySelectorAll("svg[data-fa]:not([data-fa-done])").forEach(function (svg) {
          var s = symbols["fa-" + svg.getAttribute("data-fa")];
          svg.setAttribute("data-fa-done", "");
          if (!s) return;
          svg.setAttribute("viewBox", s.getAttribute("viewBox"));
          svg.removeAttribute("stroke");
          svg.setAttribute("fill", "currentColor");
          svg.innerHTML = s.innerHTML;
        });
      }
      fill();
      var queued = false;
      new MutationObserver(function () {
        if (queued) return;
        queued = true;
        requestAnimationFrame(function () { queued = false; fill(); });
      }).observe(document.body, { childList: true, subtree: true });
    }
    if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
  }).catch(none);
})();
