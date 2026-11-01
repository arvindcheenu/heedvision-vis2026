// VoxelField: a 2D stand-in for HeedVision's voxel grid.
// Two simulated gazes wander over a grid; each cell keeps one accumulator per
// person that grows while looked at and decays over time. The display mode
// picks the aggregation (count / sum / max / difference / who), or none.
(function () {
  const COLORS = {
    you: [61, 155, 255],
    partner: [255, 138, 42],
    both: [255, 95, 180],
    grey: [222, 222, 230],
    greyLow: [118, 120, 134],
  };
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  class VoxelField {
    constructor(canvas, opts = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.ambient = !!opts.ambient;
      this.cell = opts.cell || (this.ambient ? 56 : 44);
      this.gap = opts.gap || (this.ambient ? 8 : 6);
      this.tau = this.ambient ? 9 : 16; // decay time constant (s)
      this.mode = "identity";
      this.scale = opts.scale || (() => 1);
      this.running = false;
      this.last = 0;
      this.resize();
      this.agents = [
        this.makeAgent(COLORS.you, "you", 0.3),
        this.makeAgent(COLORS.partner, "partner", 0.7),
      ];
      this.agents.forEach((ag) => this.retarget(ag));
      this.prefill();
      this.draw();
      new ResizeObserver(() => { this.resize(); this.draw(); }).observe(canvas);
    }

    makeAgent(color, name, bias) {
      return {
        color, name, bias,
        x: bias * this.cols, y: this.rows * (0.3 + Math.random() * 0.4),
        vx: 0, vy: 0, tx: 0, ty: 0, dwell: 0,
      };
    }

    resize() {
      const w = this.canvas.clientWidth || 800;
      const h = this.canvas.clientHeight || 500;
      const k = Math.min(2.5, (window.devicePixelRatio || 1) * this.scale());
      this.canvas.width = Math.round(w * k);
      this.canvas.height = Math.round(h * k);
      this.k = k;
      this.w = w;
      this.h = h;
      const pitch = this.cell + this.gap;
      const cols = Math.max(4, Math.floor((w - this.gap) / pitch));
      const rows = Math.max(3, Math.floor((h - this.gap) / pitch));
      if (cols !== this.cols || rows !== this.rows) {
        this.cols = cols;
        this.rows = rows;
        const n = cols * rows;
        this.a = new Float32Array(n);
        this.b = new Float32Array(n);
        this.disp = new Float32Array(n * 4);
        if (this.agents) this.prefill();
      }
      this.ox = (w - (cols * pitch - this.gap)) / 2;
      this.oy = (h - (rows * pitch - this.gap)) / 2;
    }

    // run the simulation for a while so the first frame already has history
    prefill() {
      this.agents.forEach((ag) => { ag.x = ag.bias * this.cols; ag.y = this.rows / 2; this.retarget(ag); });
      for (let i = 0; i < (this.ambient ? 240 : 360); i++) this.step(1 / 30);
      this.snapDisplay();
    }

    setMode(mode) { this.mode = mode; if (!this.running) { this.snapDisplay(); this.draw(); } }

    retarget(ag) {
      // Mostly stay on your own side of the space, sometimes cross over.
      const own = Math.random() < (this.ambient ? 0.55 : 0.78);
      const centre = own ? ag.bias : Math.random();
      ag.tx = Math.min(this.cols - 1, Math.max(0, (centre + (Math.random() - 0.5) * 0.5) * this.cols));
      ag.ty = Math.random() * (this.rows - 1);
      ag.dwell = 0.8 + Math.random() * 1.8;
    }

    step(dt) {
      const { cols, rows, a, b } = this;
      const decay = Math.exp(-dt / this.tau);
      for (let i = 0; i < a.length; i++) { a[i] *= decay; b[i] *= decay; }
      const speed = this.ambient ? 2.2 : 3.2;
      this.agents.forEach((ag, idx) => {
        const dx = ag.tx - ag.x, dy = ag.ty - ag.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 0.3) {
          ag.dwell -= dt;
          if (ag.dwell <= 0) this.retarget(ag);
        }
        // critically damped follow
        const w = speed;
        ag.vx += (dx * w * w - 2 * w * ag.vx) * dt;
        ag.vy += (dy * w * w - 2 * w * ag.vy) * dt;
        ag.x += ag.vx * dt;
        ag.y += ag.vy * dt;
        const acc = idx === 0 ? a : b;
        const cx = Math.round(ag.x), cy = Math.round(ag.y);
        for (let yy = cy - 2; yy <= cy + 2; yy++) {
          if (yy < 0 || yy >= rows) continue;
          for (let xx = cx - 2; xx <= cx + 2; xx++) {
            if (xx < 0 || xx >= cols) continue;
            const d2 = (xx - ag.x) ** 2 + (yy - ag.y) ** 2;
            const g = Math.exp(-d2 / 1.1);
            const j = yy * cols + xx;
            acc[j] = Math.min(1, acc[j] + g * dt * 1.4);
          }
        }
      });
    }

    target(i) {
      const A = this.a[i], B = this.b[i];
      const mix = (c1, c2, t) => [0, 1, 2].map((k) => c1[k] + (c2[k] - c1[k]) * t);
      // Only "who" uses colour. The aggregations before it are grey, so each one
      // adds a single idea: count (solid steps), then opacity for sum/max/difference.
      switch (this.mode) {
        case "none":
          return [...COLORS.grey, 0];
        case "count": {
          const n = (A > 0.12) + (B > 0.12);
          return n === 2 ? [...COLORS.grey, 0.9] : n === 1 ? [...COLORS.greyLow, 0.9] : [...COLORS.grey, 0];
        }
        case "sum":
          return [...COLORS.grey, Math.min(1, (A + B) * 0.75)];
        case "max":
          return [...COLORS.grey, Math.max(A, B)];
        case "diff":
          return [...COLORS.grey, Math.min(1, Math.abs(A - B) * 1.6)];
        default: {
          const both = Math.min(A, B);
          const oa = A - both, ob = B - both;
          const tot = oa + ob + both * 2 + 1e-6;
          let c = mix(COLORS.you, COLORS.partner, ob / (oa + ob + 1e-6));
          c = mix(c, COLORS.both, Math.min(1, (both * 2) / tot * 1.4));
          return [...c, Math.min(1, Math.max(A, B))];
        }
      }
    }

    snapDisplay() {
      const n = this.a.length;
      for (let i = 0; i < n; i++) this.disp.set(this.target(i), i * 4);
    }

    blendDisplay(dt) {
      const n = this.a.length, k = 1 - Math.exp(-dt * 7), d = this.disp;
      for (let i = 0; i < n; i++) {
        const t = this.target(i), o = i * 4;
        d[o] += (t[0] - d[o]) * k;
        d[o + 1] += (t[1] - d[o + 1]) * k;
        d[o + 2] += (t[2] - d[o + 2]) * k;
        d[o + 3] += (t[3] - d[o + 3]) * k;
      }
    }

    draw() {
      const { ctx, k, cols, rows, cell, gap, ox, oy, disp } = this;
      ctx.setTransform(k, 0, 0, k, 0, 0);
      ctx.clearRect(0, 0, this.w, this.h);
      const pitch = cell + gap, r = this.ambient ? 10 : 9;
      const base = this.ambient ? 0.025 : 0.05;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x, o = i * 4;
          const px = ox + x * pitch, py = oy + y * pitch;
          ctx.fillStyle = `rgba(255,255,255,${base})`;
          ctx.beginPath(); ctx.roundRect(px, py, cell, cell, r); ctx.fill();
          const al = disp[o + 3] * (this.ambient ? 0.75 : 0.95);
          if (al > 0.01) {
            ctx.fillStyle = `rgba(${disp[o] | 0},${disp[o + 1] | 0},${disp[o + 2] | 0},${al})`;
            ctx.beginPath(); ctx.roundRect(px, py, cell, cell, r); ctx.fill();
          }
        }
      }
      // gaze reticles
      this.agents.forEach((ag) => {
        const px = ox + ag.x * pitch + cell / 2, py = oy + ag.y * pitch + cell / 2;
        const [R, G, B] = ag.color;
        const glow = ctx.createRadialGradient(px, py, 0, px, py, cell * 1.6);
        glow.addColorStop(0, `rgba(${R},${G},${B},0.35)`);
        glow.addColorStop(1, `rgba(${R},${G},${B},0)`);
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(px, py, cell * 1.6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.95)";
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(px, py, cell * 0.36, 0, Math.PI * 2); ctx.stroke();
        if (!this.ambient) {
          ctx.font = "600 20px 'Google Sans Flex', system-ui";
          ctx.fillStyle = `rgb(${R},${G},${B})`;
          ctx.fillText(ag.name, px + cell * 0.5, py - cell * 0.45);
        }
      });
    }

    frame = (t) => {
      if (!this.running) return;
      const dt = Math.min(0.05, (t - (this.last || t)) / 1000);
      this.last = t;
      this.step(dt);
      this.blendDisplay(dt);
      this.draw();
      requestAnimationFrame(this.frame);
    };

    start() {
      if (this.running || reduceMotion) return;
      this.running = true;
      this.last = 0;
      requestAnimationFrame(this.frame);
    }

    stop() { this.running = false; }
  }

  window.VoxelField = VoxelField;
})();
