// Likes, the visit count and a small graph of how fast visits are coming in, from the live relay. If the relay can't answer, none of
// this shows and the pages work as usual. Their space is reserved from the start, so nothing moves. A visit is one number added to an hour: nothing about the visitor
// is stored. Local work and automated browsers aren't counted, and neither is anyone asking not to be tracked.
(function () {
  var params = new URLSearchParams(location.search);
  var BASE = (params.get("live") || "https://heedvision-live.arvindcheenu.workers.dev") + "/rooms/vis2026";
  var local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function put(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function clientId() {
    var c = get("hv.likes.cid");
    if (!c) { c = Array.from(crypto.getRandomValues(new Uint8Array(12)), function (b) { return b.toString(16).padStart(2, "0"); }).join(""); put("hv.likes.cid", c); }
    return c;
  }
  var post = function (path, body) { return fetch(BASE + path, { method: "POST", body: JSON.stringify(body || {}) }); }; // text/plain: no preflight

  // ------------------------------------------------------------ likes
  var counts = {};
  function drawLikes() {
    document.querySelectorAll("[data-like]").forEach(function (b) {
      var t = b.getAttribute("data-like"), n = counts[t] || 0, on = !!get("hv.liked." + t);
      b.removeAttribute("aria-busy");
      b.setAttribute("aria-pressed", String(on));
      b.setAttribute("aria-label", (t === "paper" ? "Like this paper" : "Like the slides") + ", " + n + (n === 1 ? " like" : " likes"));
      b.querySelector(".n").textContent = n.toLocaleString();
    });
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-like]");
    if (!b || b.hasAttribute("aria-busy")) return;
    var t = b.getAttribute("data-like"), on = !get("hv.liked." + t), was = counts[t] || 0;
    put("hv.liked." + t, on ? "1" : null);
    counts[t] = Math.max(0, was + (on ? 1 : -1));
    drawLikes();
    if (on && window.HVTactile) { window.HVTactile.play("like"); window.HVTactile.burst(b, "heart"); }
    post("/like", { target: t, cid: clientId(), on: on }).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    }).then(function (d) { counts = d.likes; drawLikes(); }).catch(function () {
      // it didn't reach the relay: put it back as it was
      put("hv.liked." + t, on ? null : "1");
      counts[t] = was;
      drawLikes();
    });
  });

  // ------------------------------------------------------------ velocity: how fast visits are coming in
  // The last day, by the hour, until there's more than a day to show; then the last week, six hours at a time.
  function span(hours) {
    var now = Math.floor(Date.now() / 3600000);
    return hours.length && hours[0].hour <= now - 24 ? { size: 6, count: 28, label: "last 7 days" } : { size: 1, count: 24, label: "last 24 hours" };
  }
  function bins(hours, s) {
    var now = Math.floor(Date.now() / 3600000), end = now - now % s.size, first = end - (s.count - 1) * s.size, out = [];
    for (var i = 0; i < s.count; i++) out.push({ hour: first + i * s.size, n: 0 });
    hours.forEach(function (h) {
      var at = Math.floor((h.hour - first) / s.size);
      if (out[at]) out[at].n += h.n;
    });
    return out;
  }
  function velocity(box, hours, total) {
    var s = span(hours), data = bins(hours, s), COUNT = s.count, W = 112, H = 28, T = 4, B = 3, peak = Math.max.apply(null, data.map(function (d) { return d.n; }).concat(1));
    var x = function (i) { return 3 + i * (W - 6) / (COUNT - 1); }, y = function (n) { return H - B - n * (H - T - B) / peak; };
    var line = data.map(function (d, i) { return (i ? "L" : "M") + x(i).toFixed(1) + " " + y(d.n).toFixed(1); }).join(" ");
    var inSpan = data.reduce(function (t, d) { return t + d.n; }, 0), end = data[COUNT - 1];
    var when = function (d) { return new Date(d.hour * 3600000).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric" }); };
    box.querySelector("[data-visits]").textContent = total.toLocaleString() + (total === 1 ? " visit" : " visits");
    box.querySelector("[data-span]").textContent = s.label;
    var svg = box.querySelector(".vel svg");
    svg.setAttribute("aria-label", inSpan + (inSpan === 1 ? " visit" : " visits") + " in the " + s.label + ". The busiest " + (s.size === 1 ? "hour" : "six hours") + " had " + peak + ".");
    svg.innerHTML = '<path class="vel-area" d="' + line + " L" + x(COUNT - 1) + " " + (H - B) + " L" + x(0) + " " + (H - B) + ' Z"/><path class="vel-line" d="' + line + '"/><line class="vel-cross" x1="0" x2="0" y1="' + T + '" y2="' + (H - B) + '" hidden/><circle class="vel-dot" r="3" cx="' + x(COUNT - 1) + '" cy="' + y(end.n) + '"/>';
    var dot = svg.querySelector(".vel-dot"), cross = svg.querySelector(".vel-cross"), tip = box.querySelector(".vz-tip");
    function reset() { dot.setAttribute("cx", x(COUNT - 1)); dot.setAttribute("cy", y(end.n)); cross.setAttribute("hidden", ""); tip.hidden = true; }
    svg.onpointermove = function (e) {
      var r = svg.getBoundingClientRect(), i = Math.max(0, Math.min(COUNT - 1, Math.round(((e.clientX - r.left) * W / r.width - 3) * (COUNT - 1) / (W - 6)))), d = data[i];
      dot.setAttribute("cx", x(i)); dot.setAttribute("cy", y(d.n));
      cross.removeAttribute("hidden"); cross.setAttribute("x1", x(i)); cross.setAttribute("x2", x(i));
      tip.hidden = false;
      tip.textContent = when(d) + ": " + d.n.toLocaleString() + (d.n === 1 ? " visit" : " visits");
      tip.style.left = (x(i) * r.width / W - tip.offsetWidth / 2) + "px";
    };
    svg.onpointerleave = reset;
    box.removeAttribute("aria-busy");
  }

  // ------------------------------------------------------------ GitHub stars, kept current while the page is open
  function drawStars(n) {
    if (typeof n !== "number") return;
    document.querySelectorAll("[data-stars]").forEach(function (el) {
      el.textContent = n.toLocaleString();
      var b = el.closest("a");
      if (b) b.setAttribute("aria-label", "Star caav on GitHub, " + n + (n === 1 ? " star" : " stars"));
    });
  }
  setInterval(function () {
    if (document.hidden || !document.querySelector("[data-stars]")) return;
    fetch(BASE + "/stats").then(function (r) { return r.ok ? r.json() : null; }).then(function (d) { if (d) drawStars(d.stars); }).catch(function () {});
  }, 60000);

  // ------------------------------------------------------------ start
  function start() {
    var box = document.querySelector("[data-reach]");
    var quiet = navigator.webdriver || navigator.globalPrivacyControl || navigator.doNotTrack === "1" || (local && !params.has("live"));
    var counted = false;
    try { counted = !!sessionStorage.getItem("hv.visited"); } catch (e) {}
    var ready = box && !quiet && !counted ? post("/hit").then(function () { try { sessionStorage.setItem("hv.visited", "1"); } catch (e) {} }).catch(function () {}) : Promise.resolve();
    ready.then(function () { return fetch(BASE + "/stats"); }).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    }).then(function (d) {
      counts = d.likes;
      drawLikes();
      drawStars(d.stars);
      if (box && d.visits > 0) velocity(box, d.hours, d.visits);
      else if (box) box.classList.add("off");
    }).catch(function () {
      // no relay: everything keeps its place, empty, so the page doesn't move
      if (box) box.classList.add("off");
      document.querySelectorAll("[data-like]").forEach(function (b) { b.classList.add("off"); });
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
