// The paper's results on the paper page, drawn from the same data as the result plots (tools/figures/data/).
// Targets and target gain show each pair; redundancy is one value per condition, as in the paper's figures.
(function () {
  var host = document.querySelector("[data-glance]");
  if (!host) return;
  var ROOT = "tools/figures/data/";
  function csv(text) {
    var lines = text.trim().split(/\r?\n/), head = lines[0].split(",");
    return lines.slice(1).map(function (l) {
      var c = l.split(","), o = {};
      head.forEach(function (h, i) { o[h] = c[i]; });
      return o;
    });
  }
  var METRICS = [
    { key: "targets", title: "Targets found (%)", min: 0, max: 100, ticks: [0, 50, 100], fmt: function (v) { return v.toFixed(1) + "%"; } },
    { key: "redundancy", title: "Redundancy (%)", min: 0, max: 16, ticks: [0, 8, 16], fmt: function (v) { return v.toFixed(1) + "%"; } },
    { key: "gain", title: "Target gain", min: 1, max: 1.6, ticks: [1, 1.3, 1.6], fmt: function (v) { return v.toFixed(2); } },
  ];
  var W = 210, H = 150, L = 26, R = 44, TOP = 8, BOT = 24, XS = [L + 28, L + 112];
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  function panel(metric, surface, values) {
    var y = function (v) { return H - BOT - (v - metric.min) * (H - TOP - BOT) / (metric.max - metric.min); };
    var out = metric.ticks.map(function (t) { return '<text class="gl-tick" x="' + (L - 6) + '" y="' + (y(t) + 4) + '" text-anchor="end">' + t + "</text>"; }).join("");
    ["No CAAV", "CAAV"].forEach(function (name, i) {
      var v = values[name], cx = XS[i], cls = i ? "gl-on" : "gl-off", mean;
      out += '<text class="gl-x" x="' + cx + '" y="' + (H - 6) + '" text-anchor="middle">' + name + "</text>";
      if (v.pairs) {
        mean = v.pairs.reduce(function (s, p) { return s + p.v; }, 0) / v.pairs.length;
        v.pairs.forEach(function (p, k) {
          // spread so that pairs with close values stay apart
          var dx = (k - (v.pairs.length - 1) / 2) * 7;
          out += '<circle class="gl-pair ' + cls + '" cx="' + (cx + dx) + '" cy="' + y(p.v) + '" r="4" data-tip="' + esc(surface + ", " + name + ", pair " + p.g + ": " + metric.fmt(p.v)) + '"/>';
        });
        out += '<rect class="gl-mean ' + cls + '" x="' + (cx - 19) + '" y="' + (y(mean) - 2) + '" width="38" height="4" rx="2" data-tip="' + esc(surface + ", " + name + ", mean: " + metric.fmt(mean)) + '"/>';
      } else {
        mean = v.value;
        out += '<line class="gl-stem ' + cls + '" x1="' + cx + '" x2="' + cx + '" y1="' + y(metric.min) + '" y2="' + y(mean) + '"/><circle class="gl-pair ' + cls + '" cx="' + cx + '" cy="' + y(mean) + '" r="5" data-tip="' + esc(surface + ", " + name + ": " + metric.fmt(mean)) + '"/>';
      }
      out += '<text class="gl-val" x="' + (cx + 23) + '" y="' + (y(mean) + 4) + '">' + metric.fmt(mean) + "</text>";
    });
    var label = metric.title + " on the " + surface.toLowerCase() + ": no CAAV " + metric.fmt(values["No CAAV"].mean) + ", CAAV " + metric.fmt(values.CAAV.mean) + ".";
    return '<figure class="gl-panel"><figcaption>' + metric.title + '</figcaption><svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(label) + '">' + out + "</svg></figure>";
  }
  Promise.all(["per_pair.csv", "conditions.csv"].map(function (f) {
    return fetch(ROOT + f).then(function (r) { if (!r.ok) throw new Error(f); return r.text(); }).then(csv);
  })).then(function (loaded) {
    var pairs = loaded[0], conds = loaded[1];
    function values(geometry, key) {
      var o = {};
      ["No CAAV", "CAAV"].forEach(function (name) {
        if (key === "redundancy") {
          var c = conds.filter(function (x) { return x.condition === geometry + (name === "CAAV" ? "_voxels" : "_no_voxels"); })[0];
          o[name] = { value: +c.normalized_redundancy * 100, mean: +c.normalized_redundancy * 100 };
          return;
        }
        var ps = pairs.filter(function (x) { return x.geometry === geometry && x.caav_label === name; }).map(function (x) {
          return { g: x.group, v: key === "targets" ? +x.target_pct * 100 : +x.coord_gain + 1 };
        }).sort(function (a, b) { return a.v - b.v; });
        o[name] = { pairs: ps, mean: ps.reduce(function (s, p) { return s + p.v; }, 0) / ps.length };
      });
      return o;
    }
    var rows = [["scatter", "Scatterplot"], ["terrain", "Terrain"]];
    var table = '<table class="gl-table"><thead><tr><th scope="col">Measure</th><th scope="col">Surface</th><th scope="col">No CAAV</th><th scope="col">CAAV</th></tr></thead><tbody>';
    host.innerHTML = rows.map(function (row) {
      return '<h4 class="gl-row">' + row[1] + '</h4><div class="gl-panels">' + METRICS.map(function (m) {
        var v = values(row[0], m.key);
        table += "<tr><td>" + m.title + "</td><td>" + row[1] + "</td><td>" + m.fmt(v["No CAAV"].mean) + "</td><td>" + m.fmt(v.CAAV.mean) + "</td></tr>";
        return panel(m, row[1], v);
      }).join("") + "</div>";
    }).join("");
    document.querySelector("[data-glance-table]").innerHTML = table + "</tbody></table>";
    document.querySelector("[data-glance-numbers]").hidden = false;
    var tip = document.createElement("div");
    tip.className = "vz-tip";
    tip.hidden = true;
    host.appendChild(tip);
    host.addEventListener("pointermove", function (e) {
      var t = e.target.getAttribute && e.target.getAttribute("data-tip");
      if (!t) { tip.hidden = true; return; }
      tip.hidden = false;
      tip.textContent = t;
      var box = host.getBoundingClientRect(), r = e.target.getBoundingClientRect();
      tip.style.left = Math.max(0, Math.min(box.width - tip.offsetWidth, r.left - box.left + r.width / 2 - tip.offsetWidth / 2)) + "px";
      tip.style.top = (r.top - box.top - tip.offsetHeight - 6) + "px";
    });
    host.addEventListener("pointerleave", function () { tip.hidden = true; });
  }).catch(function () { host.closest("[data-found]").hidden = true; });
})();
