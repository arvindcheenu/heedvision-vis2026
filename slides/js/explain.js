// Explainer animations for the talk, drawn on <canvas data-explain="bvh|hunt">.
// Each one has phases that the slide's builds step through (setStep), runs only
// while its slide is showing, and can settle into its last phase for stills.
//
//   bvh   0 a chart's geometry and the bounding volume hierarchy built around it
//         1 voxelization: the BVH rules out empty cells, cells touching geometry stay
//         2 capture: a ray from each head at 10 Hz hits the nearest voxel, which gains
//           that person's attention and slowly decays (the BVH is only used to voxelize)
//         Phases 0 and 1 replay on a loop while the slide is up; 2 runs continuously.
//   hv    two people look at one shared, voxelized scene, each with a copy in their
//         headset; 0 the trail is recorded but hidden, 1+ the button shows it
//   hunt  0 two people search a scatterplot with a 10-minute clock
//         1 the hidden targets (5% of voxels), shown here for the audience
//         2 a target lights up only up close and from the right side
//         3 cues on: each person's trail is visible, so the pair splits the space
(function () {
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const hex = (c) => {
    c = c.trim();
    if (c.startsWith("#")) { const n = parseInt(c.slice(1).length === 3 ? c.slice(1).replace(/./g, "$&$&") : c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
    const m = c.match(/\d+(\.\d+)?/g); return m ? m.slice(0, 3).map(Number) : [128, 128, 128];
  };
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

  // segment–rectangle and ray–box tests
  function segHitsRect(x1, y1, x2, y2, r) {
    let t0 = 0, t1 = 1;
    const dx = x2 - x1, dy = y2 - y1;
    const p = [-dx, dx, -dy, dy], q = [x1 - r.x0, r.x1 - x1, y1 - r.y0, r.y1 - y1];
    for (let i = 0; i < 4; i++) {
      if (p[i] === 0) { if (q[i] < 0) return false; continue; }
      const t = q[i] / p[i];
      if (p[i] < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; }
    }
    return true;
  }
  function rayBox(ox, oy, dx, dy, r) {
    let tmin = 0, tmax = Infinity;
    for (const [o, d, lo, hi] of [[ox, dx, r.x0, r.x1], [oy, dy, r.y0, r.y1]]) {
      if (Math.abs(d) < 1e-9) { if (o < lo || o > hi) return null; continue; }
      let a = (lo - o) / d, b = (hi - o) / d;
      if (a > b) [a, b] = [b, a];
      tmin = Math.max(tmin, a); tmax = Math.min(tmax, b);
      if (tmin > tmax) return null;
    }
    return tmin;
  }

  class Explainer {
    constructor(canvas, opts = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.scale = opts.scale || (() => 1);
      this.step = 0;
      this.phaseT = 0;
      this.running = false;
      this.readTheme();
      this.resize();
      this.reset();
      this.draw();
      new ResizeObserver(() => {
        // only a real size change needs a new layout (the first callback just confirms it)
        if (Math.abs((canvas.clientWidth || 900) - this.w) < 2 && Math.abs((canvas.clientHeight || 600) - this.h) < 2) return;
        const s = this.step; this.resize(); this.reset(); this.setStep(s, true); this.draw();
      }).observe(canvas);
      addEventListener("hv-theme", () => { this.readTheme(); this.draw(); });
    }
    readTheme() {
      const cs = getComputedStyle(this.canvas);
      const v = (n, d) => cs.getPropertyValue(n).trim() || d;
      this.c = {
        ink: hex(v("--x-ink", "#f3f2f7")), muted: hex(v("--x-muted", "#9a9aa8")), line: hex(v("--x-line", "#8a8a99")),
        geo: hex(v("--x-geo", "#3a3c48")), cell: hex(v("--x-cell", "#ffffff")), bg: hex(v("--x-bg", "#15161c")),
        person: hex(v("--x-person", "#8d8d8a")), you: hex(v("--you", "#3d8bff")), partner: hex(v("--partner", "#f08a3c")), both: hex(v("--both", "#ec4f9c")),
      };
      this.font = v("--f-text", "system-ui");
    }
    resize() {
      const w = this.canvas.clientWidth || 900, h = this.canvas.clientHeight || 600;
      const k = Math.min(2.5, (devicePixelRatio || 1) * this.scale());
      this.canvas.width = Math.round(w * k); this.canvas.height = Math.round(h * k);
      this.k = k; this.w = w; this.h = h;
      this.layout();
    }
    setStep(n, quiet) {
      if (n === this.step && !quiet) return;
      if (n < this.step) this.reset();
      this.step = n;
      this.phaseT = 0;
      if (!this.running) this.draw();
    }
    // a head seen from above, in a headset: the visor is the viewport, and the gaze
    // ray leaves the middle of the visor at a right angle
    head(x, y, ang, col, r, { cone = true } = {}) {
      const g = this.ctx;
      g.save(); g.translate(x, y); g.rotate(ang);
      if (cone) {
        const fr = g.createLinearGradient(r, 0, r * 7, 0);
        fr.addColorStop(0, rgba(col, 0.16)); fr.addColorStop(1, rgba(col, 0));
        g.fillStyle = fr; g.beginPath(); g.moveTo(r * 0.95, -r * 0.62); g.lineTo(r * 7, -r * 3.2); g.lineTo(r * 7, r * 3.2); g.lineTo(r * 0.95, r * 0.62); g.closePath(); g.fill();
      }
      g.fillStyle = rgba(this.c.person, 1); g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill(); // people are grey: colour means attention
      g.strokeStyle = rgba(this.c.bg, 0.55); g.lineWidth = Math.max(1.5, r * 0.16);
      g.beginPath(); g.arc(0, 0, r * 0.62, Math.PI * 0.62, Math.PI * 1.38); g.stroke(); // the strap round the back
      g.fillStyle = rgba(this.c.ink, 0.92);
      g.beginPath(); g.roundRect(r * 0.62, -r * 0.8, r * 0.52, r * 1.6, r * 0.22); g.fill();
      g.fillStyle = rgba(col, 1); g.beginPath(); g.arc(r * 1.14, 0, Math.max(2, r * 0.13), 0, Math.PI * 2); g.fill(); // the centre of the view
      g.restore();
      return [x + Math.cos(ang) * r * 1.14, y + Math.sin(ang) * r * 1.14];
    }
    text(s, x, y, { size = 20, weight = 600, color = this.c.muted, align = "left", alpha = 1 } = {}) {
      const g = this.ctx;
      g.font = `${weight} ${size * 1.15}px ${this.font}`;
      g.textAlign = align; g.textBaseline = "alphabetic";
      g.fillStyle = rgba(color, alpha);
      g.fillText(s, x, y);
    }
    frame = (t) => {
      if (!this.running) return;
      const dt = Math.min(0.05, (t - (this.last || t)) / 1000);
      this.last = t;
      this.phaseT += dt;
      this.update(dt);
      this.draw();
      requestAnimationFrame(this.frame);
    };
    start() { if (this.running || reduceMotion) { if (reduceMotion) this.settle(this.step); return; } this.running = true; this.last = 0; requestAnimationFrame(this.frame); }
    stop() { this.running = false; }
    // jump to a phase as if it had played for a while (stills, reduced motion)
    settle(n) {
      this.reset();
      for (let s = 0; s <= n; s++) { this.step = s; this.phaseT = 0; for (let i = 0; i < 300; i++) { this.phaseT += 1 / 30; this.update(1 / 30); } }
      this.draw();
    }
  }

  // ------------------------------------------------------------------ BVH
  class BVH extends Explainer {
    layout() {
      const { w, h } = this;
      const pad = Math.round(w * 0.045);
      this.tree = { x0: pad + w * 0.08, x1: w - pad - w * 0.08, y0: pad + 26, y1: pad + h * 0.2 };
      const sx0 = pad + w * 0.1, sx1 = w - pad - w * 0.1;
      const sy0 = h * 0.33, sy1 = h - pad - 34;
      this.scene = { x0: sx0, x1: sx1, y0: sy0, y1: sy1 };
      // terrain profile: 32 segments
      const r = rng(11), N = 32;
      const ph = [r() * 6, r() * 6, r() * 6];
      const raw = Array.from({ length: N + 1 }, (_, i) => {
        const u = i / N;
        const f = 0.55 + 0.25 * Math.sin(u * 6.3 + ph[0]) + 0.16 * Math.sin(u * 13 + ph[1]) + 0.08 * Math.sin(u * 27 + ph[2]);
        const env = Math.sin(Math.PI * clamp(u * 1.08 - 0.04, 0, 1));
        return clamp(f, 0.05, 1) * (0.2 + 0.8 * env);
      });
      const top = Math.max(...raw);
      // peaks reach near the top of the scene so the boxes have room to nest
      this.pts = raw.map((f, i) => [sx0 + (i / N) * (sx1 - sx0), sy1 - 6 - (sy1 - sy0 - 10) * (f / top)]);
      // bounding volume hierarchy, built top-down by splitting the segment list in half
      this.nodes = [];
      const build = (lo, hi, depth) => {
        const xs = [], ys = [];
        for (let i = lo; i <= hi; i++) { xs.push(this.pts[i][0]); ys.push(this.pts[i][1]); }
        const p = 3;
        const node = { lo, hi, depth, box: { x0: Math.min(...xs) - p, x1: Math.max(...xs) + p, y0: Math.min(...ys) - p, y1: Math.max(...ys) + p }, kids: [], id: this.nodes.length };
        this.nodes.push(node);
        if (hi - lo > 2) { const mid = (lo + hi) >> 1; node.kids = [build(lo, mid, depth + 1), build(mid, hi, depth + 1)]; }
        return node;
      };
      this.root = build(0, N, 0);
      this.maxDepth = Math.max(...this.nodes.map((n) => n.depth));
      // tree diagram positions: leaves spread evenly, parents centred over children
      let leaf = 0;
      const leaves = this.nodes.filter((n) => !n.kids.length).length;
      const place = (n) => {
        if (!n.kids.length) n.tx = this.tree.x0 + (leaf++ + 0.5) / leaves * (this.tree.x1 - this.tree.x0);
        else { n.kids.forEach(place); n.tx = (n.kids[0].tx + n.kids[1].tx) / 2; }
        n.ty = this.tree.y0 + (n.depth / this.maxDepth) * (this.tree.y1 - this.tree.y0);
      };
      place(this.root);
      // voxel grid over the scene
      const cs = (sx1 - sx0) / 26;
      this.cs = cs;
      this.cells = [];
      const rb = this.root.box;
      const cols = Math.ceil((rb.x1 - rb.x0) / cs), rows = Math.ceil((sy1 - rb.y0) / cs);
      const leafs = this.nodes.filter((n) => !n.kids.length);
      for (let cx = 0; cx < cols; cx++) for (let cy = 0; cy < rows; cy++) {
        const r = { x0: rb.x0 + cx * cs, y0: rb.y0 + cy * cs, x1: rb.x0 + (cx + 1) * cs, y1: rb.y0 + (cy + 1) * cs };
        if (r.y0 > sy1) continue;
        const ov = (b) => !(b.x1 < r.x0 || b.x0 > r.x1 || b.y1 < r.y0 || b.y0 > r.y1);
        const inBox = leafs.some((n) => ov(n.box));
        let kept = false;
        if (inBox) for (let i = 0; i < this.pts.length - 1 && !kept; i++) kept = segHitsRect(...this.pts[i], ...this.pts[i + 1], r);
        this.cells.push({ r, cx, cols, inBox, kept, a: 0, b: 0 });
      }
      this.kept = this.cells.filter((c) => c.kept);
      this.eyes = [
        { x: pad + w * 0.035, y: sy0 + (sy1 - sy0) * 0.12, color: "you", key: "a", aim: 0.3, v: 0, tick: 0, ray: null, ang: 0.6 },
        { x: w - pad - w * 0.035, y: sy0 + (sy1 - sy0) * 0.02, color: "partner", key: "b", aim: 0.7, v: 0, tick: 0.05, ray: null, ang: Math.PI - 0.6 },
      ];
    }
    reset() {
      this.random = rng(5);
      this.cells && this.cells.forEach((c) => { c.a = 0; c.b = 0; });
      this.eyes && this.eyes.forEach((e, i) => { e.aim = i ? 0.68 : 0.32; e.v = 0; e.tick = i * 0.05; e.ray = null; e.ang = i ? Math.PI - 0.6 : 0.6; });
    }
    update(dt) {
      if (this.step < 2) return;
      const decay = Math.exp(-dt / 5);
      this.kept.forEach((c) => { c.a *= decay; c.b *= decay; });
      for (const e of this.eyes) {
        // the gaze drifts over the terrain, mostly on its own side
        e.v += ((this.random() - 0.5) * 1.6 - e.v * 0.9) * dt;
        e.aim = clamp(e.aim + e.v * dt * 0.6, e.color === "you" ? 0.04 : 0.3, e.color === "you" ? 0.7 : 0.96);
        // the head turns towards what it looks at; the ray always leaves straight out of the visor
        const i = Math.round(e.aim * (this.pts.length - 1));
        const [tx, ty] = this.pts[i];
        let da = Math.atan2(ty + this.cs * 0.6 - e.y, tx - e.x) - e.ang;
        da = Math.atan2(Math.sin(da), Math.cos(da));
        e.ang += da * (1 - Math.exp(-dt * 5));
        e.tick -= dt;
        if (e.tick > 0) continue;
        e.tick += 0.1; // 10 Hz
        const ux = Math.cos(e.ang), uy = Math.sin(e.ang);
        // the nearest voxel along the ray
        let best = null;
        for (const c of this.kept) {
          const t = rayBox(e.x, e.y, ux, uy, c.r);
          if (t != null && (!best || t < best.t)) best = { t, c };
        }
        if (best) {
          best.c[e.key] = Math.min(1, best.c[e.key] + 0.24);
          e.ray = { x: e.x + ux * best.t, y: e.y + uy * best.t, age: 0 };
        } else e.ray = null;
      }
    }
    draw() {
      const g = this.ctx, C = this.c, { w, h } = this;
      g.setTransform(this.k, 0, 0, this.k, 0, 0);
      g.clearRect(0, 0, w, h);
      // phase 0 builds the hierarchy level by level, holds, fades and builds again
      const build = 0.4 + (this.maxDepth + 1) * 0.55, period = build + 2.6;
      const T = this.step === 0 ? this.phaseT % period : 99;
      const out = this.step === 0 ? 1 - ease((T - period + 0.5) / 0.5) : 1;
      const levelIn = (d) => (this.step > 0 ? 1 : ease((T - 0.4 - d * 0.55) / 0.5) * out);
      // the hierarchy's job is done once the voxels exist
      const dimBoxes = this.step >= 2 ? 0.2 : this.step >= 1 ? 0.45 : 1;

      // tree
      this.text("Bounding volume hierarchy", this.tree.x0, this.tree.y0 - 14, { size: 21, weight: 650 });
      for (const n of this.nodes) for (const k of n.kids) {
        const a = levelIn(k.depth);
        if (a <= 0) continue;
        g.strokeStyle = rgba(C.line, 0.5 * a); g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(n.tx, n.ty); g.lineTo(k.tx, k.ty); g.stroke();
      }
      for (const n of this.nodes) {
        const a = levelIn(n.depth);
        if (a <= 0) continue;
        g.fillStyle = rgba(C.line, (n.kids.length ? 0.55 : 0.85) * a * (this.step >= 2 ? 0.5 : 1));
        g.beginPath(); g.arc(n.tx, n.ty, n.kids.length ? 6 : 5, 0, Math.PI * 2); g.fill();
      }

      // geometry
      g.beginPath();
      g.moveTo(this.pts[0][0], this.scene.y1);
      this.pts.forEach(([x, y]) => g.lineTo(x, y));
      g.lineTo(this.pts[this.pts.length - 1][0], this.scene.y1);
      g.closePath();
      g.fillStyle = rgba(C.geo, 0.55); g.fill();
      g.beginPath(); this.pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.strokeStyle = rgba(C.ink, 0.85); g.lineWidth = 2.5; g.stroke();
      g.fillStyle = rgba(C.ink, 0.9);
      this.pts.forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 2.2, 0, Math.PI * 2); g.fill(); });

      // boxes
      for (const n of this.nodes) {
        const a = levelIn(n.depth) * dimBoxes;
        if (a <= 0) continue;
        const b = n.box;
        g.strokeStyle = rgba(C.line, (0.35 + 0.12 * (this.maxDepth - n.depth)) * a);
        g.lineWidth = n.depth === 0 ? 2 : 1.4;
        g.setLineDash(n.kids.length ? [] : [5, 4]);
        g.strokeRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
      }
      g.setLineDash([]);

      // voxels
      if (this.step >= 1) {
        const cols = this.cells.length ? this.cells[0].cols : 1;
        // phase 1 sweeps the grid, holds the result, then sweeps again
        const p = this.step === 1 ? clamp((this.phaseT % 4.8) / 2.4, 0, 1) : 1;
        const front = p * cols;
        let kept = 0, skipped = 0, tested = 0;
        for (const c of this.cells) {
          if (c.cx > front) continue;
          const age = (front - c.cx) / cols * 2.4;
          if (!c.inBox) { skipped++; if (age < 0.35) { g.fillStyle = rgba(C.muted, 0.12 * (1 - age / 0.35)); g.fillRect(c.r.x0 + 1, c.r.y0 + 1, this.cs - 2, this.cs - 2); } continue; }
          if (!c.kept) { tested++; if (age < 0.5) { g.strokeStyle = rgba(C.muted, 0.5 * (1 - age / 0.5)); g.strokeRect(c.r.x0 + 1, c.r.y0 + 1, this.cs - 2, this.cs - 2); } continue; }
          kept++;
          const A = c.a, B = c.b, m = Math.max(A, B);
          if (m > 0.02) {
            const both = Math.min(A, B) / (m + 1e-6);
            const col = both > 0.45 ? C.both : A >= B ? C.you : C.partner;
            g.fillStyle = rgba(col, 0.25 + 0.7 * m);
            g.fillRect(c.r.x0 + 1, c.r.y0 + 1, this.cs - 2, this.cs - 2);
          }
          g.strokeStyle = rgba(C.ink, 0.55); g.lineWidth = 1.2;
          g.strokeRect(c.r.x0 + 1, c.r.y0 + 1, this.cs - 2, this.cs - 2);
        }
        const total = this.cells.length;
        if (this.step === 1) {
          this.text(`${kept} voxels touch the chart · ${skipped} of ${total} cells ruled out by the boxes alone`, this.scene.x0, h - 14, { size: 21, color: C.muted });
        }
      }

      // heads and rays
      if (this.step >= 2) {
        const r = Math.max(13, w * 0.016);
        for (const e of this.eyes) {
          const col = C[e.color];
          const [vx, vy] = [e.x + Math.cos(e.ang) * r * 1.14, e.y + Math.sin(e.ang) * r * 1.14];
          if (e.ray) {
            g.strokeStyle = rgba(col, 0.85); g.lineWidth = 2.5;
            g.beginPath(); g.moveTo(vx, vy); g.lineTo(e.ray.x, e.ray.y); g.stroke();
            g.fillStyle = rgba(col, 1); g.beginPath(); g.arc(e.ray.x, e.ray.y, 4, 0, Math.PI * 2); g.fill();
          }
          this.head(e.x, e.y, e.ang, col, r);
          this.text(e.color, e.x, e.y + r + 30, { size: 20, color: col, align: "center", weight: 650 });
        }
        this.text("a ray from each head, 10 times a second", this.scene.x0, h - 14, { size: 21, color: C.muted });
      }
    }
  }

  // ------------------------------------------------------------------ treasure hunt
  class Hunt extends Explainer {
    layout() {
      const { w, h } = this;
      const pad = Math.round(w * 0.04);
      this.box = { x0: pad, y0: pad + 44, x1: w - pad, y1: h - pad };
      this.cols = 20; this.rows = 12;
      this.cw = (this.box.x1 - this.box.x0) / this.cols;
      this.ch = (this.box.y1 - this.box.y0) / this.rows;
      const r = rng(21);
      this.dots = Array.from({ length: 100 }, () => [r(), r()]);
      // 5% of 240 voxels = 12 targets, one per region so none is richer than another
      this.targets = [];
      for (let gy = 0; gy < 3; gy++) for (let gx = 0; gx < 4; gx++) {
        const cx = gx * 5 + Math.floor(r() * 5), cy = gy * 4 + Math.floor(r() * 4);
        this.targets.push({ cx, cy, face: r() * Math.PI * 2, found: null, at: 0 });
      }
    }
    reset() {
      this.random = rng(9);
      this.clock = 600;
      this.cov = [new Float32Array(this.cols * this.rows), new Float32Array(this.cols * this.rows)];
      this.targets && this.targets.forEach((t) => { t.found = null; t.at = 0; });
      this.agents = [
        { x: 3, y: 3, vx: 0, vy: 0, tx: 3, ty: 3, color: "you", dwell: 0 },
        { x: 15, y: 8, vx: 0, vy: 0, tx: 15, ty: 8, color: "partner", dwell: 0 },
      ];
      this.agents.forEach((a) => this.retarget(a, 0));
    }
    retarget(ag, i) {
      const cues = this.step >= 3;
      let best = null;
      for (let k = 0; k < (cues ? 10 : 1); k++) {
        const tx = this.random() * (this.cols - 1), ty = this.random() * (this.rows - 1);
        const j = Math.round(ty) * this.cols + Math.round(tx);
        // with cues, head for places nobody has covered yet
        const score = cues ? this.cov[0][j] + this.cov[1][j] + Math.hypot(tx - ag.x, ty - ag.y) * 0.02 : 0;
        if (!best || score < best.s) best = { tx, ty, s: score };
      }
      ag.tx = best.tx; ag.ty = best.ty; ag.dwell = 0.3 + this.random() * 0.6;
    }
    update(dt) {
      this.clock = Math.max(0, this.clock - dt * 15);
      const decay = Math.exp(-dt / 30);
      this.agents.forEach((ag, i) => {
        const dx = ag.tx - ag.x, dy = ag.ty - ag.y;
        if (Math.hypot(dx, dy) < 0.35) { ag.dwell -= dt; if (ag.dwell <= 0) this.retarget(ag, i); }
        const wv = 2.6;
        ag.vx += (dx * wv * wv - 2 * wv * ag.vx) * dt;
        ag.vy += (dy * wv * wv - 2 * wv * ag.vy) * dt;
        ag.x = clamp(ag.x + ag.vx * dt, 0, this.cols - 1); ag.y = clamp(ag.y + ag.vy * dt, 0, this.rows - 1);
        const cov = this.cov[i];
        for (let j = 0; j < cov.length; j++) cov[j] *= decay;
        const cx = Math.round(ag.x), cy = Math.round(ag.y);
        for (let y = cy - 1; y <= cy + 1; y++) for (let x = cx - 1; x <= cx + 1; x++) {
          if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) continue;
          const j = y * this.cols + x, d = Math.hypot(x - ag.x, y - ag.y);
          cov[j] = Math.min(1, cov[j] + Math.exp(-d * d / 0.6) * dt * 1.6);
        }
        if (this.step < 2) return;
        // a target glows only from up close, and only from the side it faces
        for (const t of this.targets) {
          if (t.found) continue;
          const vx = ag.x - t.cx, vy = ag.y - t.cy, d = Math.hypot(vx, vy);
          if (d > 1.1) continue;
          let diff = Math.abs(Math.atan2(vy, vx) - t.face) % (Math.PI * 2);
          if (diff > Math.PI) diff = Math.PI * 2 - diff;
          if (d < 0.35 || diff < 1.2) { t.found = ag.color; t.at = 0; }
        }
      });
      this.targets.forEach((t) => (t.at += dt));
    }
    cellXY(cx, cy) { return [this.box.x0 + (cx + 0.5) * this.cw, this.box.y0 + (cy + 0.5) * this.ch]; }
    draw() {
      const g = this.ctx, C = this.c, { w, h, box } = this;
      g.setTransform(this.k, 0, 0, this.k, 0, 0);
      g.clearRect(0, 0, w, h);
      const s = Math.min(this.cw, this.ch);

      // cues: each person's trail, pink where both looked
      if (this.step >= 3) {
        const fade = ease(this.phaseT / 0.8);
        for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.cols; x++) {
          const j = y * this.cols + x, A = this.cov[0][j], B = this.cov[1][j], m = Math.max(A, B);
          if (m < 0.05) continue;
          const col = Math.min(A, B) > 0.25 ? C.both : A >= B ? C.you : C.partner;
          g.fillStyle = rgba(col, (0.15 + 0.6 * m) * fade);
          g.fillRect(box.x0 + x * this.cw + 1.5, box.y0 + y * this.ch + 1.5, this.cw - 3, this.ch - 3);
        }
      }
      // the data: 100 random points, no landmarks
      g.fillStyle = rgba(C.muted, 0.85);
      for (const [u, v] of this.dots) { g.beginPath(); g.arc(box.x0 + u * (box.x1 - box.x0), box.y0 + v * (box.y1 - box.y0), s * 0.11, 0, Math.PI * 2); g.fill(); }
      g.strokeStyle = rgba(C.line, 0.35); g.lineWidth = 1.5;
      g.strokeRect(box.x0, box.y0, box.x1 - box.x0, box.y1 - box.y0);

      // targets
      let found = 0;
      for (const t of this.targets) {
        const [x, y] = this.cellXY(t.cx, t.cy);
        if (t.found) {
          found++;
          const pop = ease(t.at / 0.4);
          const glow = g.createRadialGradient(x, y, 0, x, y, s * 0.9);
          glow.addColorStop(0, rgba([255, 255, 255], 0.75 * pop)); glow.addColorStop(1, rgba([255, 255, 255], 0));
          g.fillStyle = glow; g.beginPath(); g.arc(x, y, s * 0.9, 0, Math.PI * 2); g.fill();
          g.fillStyle = "#fff"; g.fillRect(x - s * 0.22, y - s * 0.22, s * 0.44, s * 0.44);
          g.strokeStyle = rgba(C[t.found], 1); g.lineWidth = 3; g.strokeRect(x - s * 0.22, y - s * 0.22, s * 0.44, s * 0.44);
        } else if (this.step >= 1) {
          const a = this.step === 1 ? ease(this.phaseT / 0.6) : 1;
          g.setLineDash([4, 4]); g.strokeStyle = rgba(C.ink, 0.55 * a); g.lineWidth = 1.6;
          g.strokeRect(x - s * 0.22, y - s * 0.22, s * 0.44, s * 0.44); g.setLineDash([]);
          if (this.step >= 2) { // the side it can be seen from
            g.strokeStyle = rgba(C.ink, 0.55); g.lineWidth = 2;
            g.beginPath(); g.arc(x, y, s * 0.42, t.face - 0.9, t.face + 0.9); g.stroke();
          }
        }
      }
      // gazes
      for (const ag of this.agents) {
        const [x, y] = this.cellXY(ag.x, ag.y), col = C[ag.color];
        if (this.step >= 2) { g.setLineDash([3, 5]); g.strokeStyle = rgba(col, 0.75); g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, s * 1.1, 0, Math.PI * 2); g.stroke(); g.setLineDash([]); }
        const glow = g.createRadialGradient(x, y, 0, x, y, s * 0.9);
        glow.addColorStop(0, rgba(col, 0.4)); glow.addColorStop(1, rgba(col, 0));
        g.fillStyle = glow; g.beginPath(); g.arc(x, y, s * 0.9, 0, Math.PI * 2); g.fill();
        g.strokeStyle = rgba(col, 1); g.lineWidth = 3; g.beginPath(); g.arc(x, y, s * 0.3, 0, Math.PI * 2); g.stroke();
      }
      // header line: clock, and what this phase shows
      const mm = Math.floor(this.clock / 60), ss = Math.floor(this.clock % 60);
      this.text(`${mm}:${String(ss).padStart(2, "0")}`, box.x0, box.y0 - 14, { size: 28, weight: 700, color: C.ink });
      const note = ["Two people search · targets hidden", "12 hidden targets (5% of voxels), shown here for you", `A target lights up only from close by, on its visible side · found ${found} of 12`, `Cues on: each sees where the other has looked · found ${found} of 12`][this.step] || "";
      this.text(note, box.x0 + 92, box.y0 - 14, { size: 22, color: C.muted });
    }
  }


  // ------------------------------------------------------------------ HeedVision
  // Two people, each seeing the same voxelized sphere in their own headset. Every
  // 100 ms a ray from each visor marks a voxel; the scene is shared, so both copies
  // show both trails: blue you, orange partner, pink both. More attention, more solid.
  class HV extends Explainer {
    layout() {
      const { w, h } = this;
      this.R = Math.min(w * 0.17, h * 0.3);
      this.spheres = [{ x: w * 0.3, y: h * 0.42 }, { x: w * 0.7, y: h * 0.42 }];
      this.n = 15; // voxels across the sphere
      this.cell = (this.R * 2) / this.n;
      this.cells = [];
      for (let j = 0; j < this.n; j++) for (let i = 0; i < this.n; i++) {
        const u = (i + 0.5) / this.n * 2 - 1, v = (j + 0.5) / this.n * 2 - 1;
        if (u * u + v * v <= 0.98) this.cells.push({ i, j, u, v, a: 0, b: 0 });
      }
      const hr = Math.max(16, w * 0.024);
      this.hr = hr;
      // the partner stands left of the left copy, you right of the right one
      this.people = [
        { key: "b", name: "User B", sphere: 0, x: w * 0.055, y: h * 0.34, fx: -0.25, fy: 0.05, tx: 0, ty: 0, vx: 0, vy: 0, ang: 0, tick: 0.05 },
        { key: "a", name: "User A", sphere: 1, x: w * 0.945, y: h * 0.34, fx: 0.25, fy: -0.05, tx: 0, ty: 0, vx: 0, vy: 0, ang: Math.PI, tick: 0 },
      ];
    }
    reset() {
      this.random = rng(3);
      this.cells && this.cells.forEach((c) => { c.a = 0; c.b = 0; });
      this.people && this.people.forEach((p, k) => { p.fx = k ? 0.3 : -0.3; p.fy = 0; p.vx = p.vy = 0; p.ang = k ? Math.PI : 0; p.tick = k * 0.05; p.hold = 0; });
      this.press = 0;
    }
    update(dt) {
      const decay = Math.exp(-dt / 14);
      this.cells.forEach((c) => { c.a *= decay; c.b *= decay; });
      this.press = this.step >= 1 ? Math.min(1, this.press + dt * 3) : Math.max(0, this.press - dt * 3);
      for (const p of this.people) {
        // each wanders over the sphere, mostly on their own side, and they meet in the middle now and then
        p.hold -= dt;
        if (p.hold <= 0) {
          const own = p.key === "a" ? 1 : -1, meet = this.random() < 0.22;
          p.tx = meet ? (this.random() - 0.5) * 0.3 : own * (0.15 + this.random() * 0.6);
          p.ty = (this.random() - 0.5) * 1.5;
          p.hold = 0.5 + this.random() * 0.9;
        }
        p.vx += ((p.tx - p.fx) * 9 - p.vx * 5) * dt;
        p.vy += ((p.ty - p.fy) * 9 - p.vy * 5) * dt;
        p.fx = clamp(p.fx + p.vx * dt, -0.9, 0.9); p.fy = clamp(p.fy + p.vy * dt, -0.9, 0.9);
        const S = this.spheres[p.sphere];
        const gx = S.x + p.fx * this.R, gy = S.y + p.fy * this.R;
        let da = Math.atan2(gy - p.y, gx - p.x) - p.ang;
        da = Math.atan2(Math.sin(da), Math.cos(da));
        p.ang += da * (1 - Math.exp(-dt * 7));
        p.tick -= dt;
        if (p.tick > 0) continue;
        p.tick += 0.1; // 10 Hz
        // where the visor points: the point on the ray nearest the focus, on the sphere's front face
        const ux = Math.cos(p.ang), uy = Math.sin(p.ang);
        const t = (gx - p.x) * ux + (gy - p.y) * uy;
        const ix = clamp((p.x + ux * t - S.x) / this.R, -0.95, 0.95), iy = clamp((p.y + uy * t - S.y) / this.R, -0.95, 0.95);
        if (ix * ix + iy * iy > 0.95) { p.hit = null; continue; }
        p.hit = [ix, iy];
        let best = null, bd = Infinity;
        for (const c of this.cells) { const d = (c.u - ix) ** 2 + (c.v - iy) ** 2; if (d < bd) { bd = d; best = c; } }
        if (best) best[p.key] = Math.min(1, best[p.key] + 0.28);
      }
    }
    sphere(S, show, local) {
      const g = this.ctx, C = this.c, R = this.R;
      const sh = g.createRadialGradient(S.x - R * 0.35, S.y - R * 0.4, R * 0.1, S.x, S.y, R * 1.05);
      sh.addColorStop(0, rgba(C.geo, 0.55)); sh.addColorStop(1, rgba(C.geo, 1));
      g.fillStyle = sh; g.beginPath(); g.arc(S.x, S.y, R, 0, Math.PI * 2); g.fill();
      g.save(); g.beginPath(); g.arc(S.x, S.y, R, 0, Math.PI * 2); g.clip();
      const cs = this.cell, x0 = S.x - R, y0 = S.y - R;
      for (const c of this.cells) {
        const A = local === "a" ? c.a : c.b, B = local === "a" ? c.b : c.a, m = Math.max(A, B); // A is this headset's wearer
        const x = x0 + c.i * cs, y = y0 + c.j * cs;
        if (show > 0 && m > 0.03) {
          const both = Math.min(A, B) > 0.3 * m && Math.min(A, B) > 0.05;
          const col = both ? C.both : A >= B ? C.you : C.partner;
          g.fillStyle = rgba(col, (0.18 + 0.78 * clamp(m * 1.3, 0, 1)) * show);
          g.fillRect(x + 1, y + 1, cs - 2, cs - 2);
        }
        g.strokeStyle = rgba(C.bg, 0.22); g.lineWidth = 1;
        g.strokeRect(x + 0.5, y + 0.5, cs - 1, cs - 1);
      }
      // shading so the disc reads as a ball
      const rim = g.createRadialGradient(S.x - R * 0.3, S.y - R * 0.35, R * 0.2, S.x, S.y, R);
      rim.addColorStop(0, "rgba(255,255,255,0.18)"); rim.addColorStop(0.7, "rgba(0,0,0,0)"); rim.addColorStop(1, "rgba(0,0,0,0.22)");
      g.fillStyle = rim; g.fillRect(S.x - R, S.y - R, R * 2, R * 2);
      g.restore();
    }
    person(p) {
      const g = this.ctx, col = this.c.person, r = this.hr;
      // a body under the head, facing the sphere
      const dir = Math.cos(p.ang) >= 0 ? 1 : -1;
      g.fillStyle = rgba(col, 0.9);
      g.beginPath(); g.roundRect(p.x - r * 0.95, p.y + r * 1.35, r * 1.9, this.h * 0.2, [r * 0.9, r * 0.9, r * 0.4, r * 0.4]); g.fill();
      g.fillStyle = rgba(col, 0.75);
      g.beginPath(); g.roundRect(p.x + dir * r * 0.2 - r * 0.25, p.y + r * 1.9, dir * r * 1.7 + r * 0.5 * (dir < 0 ? 1 : 0), r * 0.5, r * 0.25); g.fill(); // an arm, holding the controller
      return this.head(p.x, p.y, p.ang, col, r, { cone: false });
    }
    draw() {
      const g = this.ctx, C = this.c, { w, h } = this;
      g.setTransform(this.k, 0, 0, this.k, 0, 0);
      g.clearRect(0, 0, w, h);
      const show = ease(this.press);
      // each headset colours its own wearer blue and the other person orange
      this.spheres.forEach((S, i) => this.sphere(S, show, this.people.find((p) => p.sphere === i).key));
      // rays from each visor to their own copy
      for (const p of this.people) {
        const S = this.spheres[p.sphere], col = C.you; // to its wearer, their own attention is blue
        const [vx, vy] = this.person(p);
        if (!p.hit) continue;
        const hx = S.x + p.hit[0] * this.R, hy = S.y + p.hit[1] * this.R;
        g.strokeStyle = rgba(col, 0.8); g.lineWidth = 2.5; g.setLineDash([2, 7]); g.lineCap = "round";
        g.beginPath(); g.moveTo(vx, vy); g.lineTo(hx, hy); g.stroke(); g.setLineDash([]);
        // the reticle shows on both copies: it's one scene
        this.spheres.forEach((T) => {
          const x = T.x + p.hit[0] * this.R, y = T.y + p.hit[1] * this.R;
          g.strokeStyle = rgba(T === S ? C.you : C.partner, 1); g.lineWidth = 3;
          g.beginPath(); g.arc(x, y, this.cell * 0.8, 0, Math.PI * 2); g.stroke();
        });
        this.text(p.name, p.x, p.y + this.hr * 1.35 + this.h * 0.2 + 34, { size: 20, color: C.muted, align: "center", weight: 650 });
      }
      // sync between the two copies
      const mx = w / 2, my = this.spheres[0].y;
      g.strokeStyle = rgba(C.muted, 0.9); g.lineWidth = 2.5;
      const sr = Math.max(14, w * 0.017), rot = this.running ? (performance.now() / 1600) % (Math.PI * 2) : 0;
      for (const k of [0, Math.PI]) {
        g.beginPath(); g.arc(mx, my, sr, rot + k + 0.35, rot + k + 2.6); g.stroke();
        const ex = mx + Math.cos(rot + k + 2.6) * sr, ey = my + Math.sin(rot + k + 2.6) * sr, ta = rot + k + 2.6 + Math.PI / 2;
        g.beginPath(); g.moveTo(ex + Math.cos(ta - 2.5) * 9, ey + Math.sin(ta - 2.5) * 9); g.lineTo(ex, ey); g.lineTo(ex + Math.cos(ta + 2.5) * 9, ey + Math.sin(ta + 2.5) * 9); g.stroke();
      }
      const ly = h - 70;
      this.text("Each headset shows a copy of one shared scene", mx, ly, { size: 21, color: C.muted, align: "center", weight: 600 });
      // the button: the trail is recorded all along, and shown only on request
      const bx = 24, by = h - 26;
      g.fillStyle = rgba(show > 0.5 ? C.ink : C.muted, show > 0.5 ? 1 : 0.6);
      g.beginPath(); g.arc(bx + 9, by - 7, 9, 0, Math.PI * 2); g.fill();
      if (show > 0.5) { g.fillStyle = rgba(C.bg, 1); g.beginPath(); g.arc(bx + 9, by - 7, 3.5, 0, Math.PI * 2); g.fill(); }
      this.text(show > 0.5 ? "Trail shown" : "Trail recorded, hidden until you press the button", bx + 28, by, { size: 20, color: C.muted, weight: 600 });
    }
  }

  window.Explain = {
    create(canvas, opts) { const K = { bvh: BVH, hunt: Hunt, hv: HV }[canvas.dataset.explain] || Hunt; return new K(canvas, opts); },
  };
})();

