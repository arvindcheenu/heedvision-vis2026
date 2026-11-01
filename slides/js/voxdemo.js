// Live demo on a slide: the study's scatterplot, voxelized, with two people's
// attention. Drag to look around, scroll (or pinch) to move closer. Your gaze is
// the centre of your view, sampled 10 times a second like HeedVision's head ray;
// the partner is simulated. Targets light up only from close by, on their open side.
//
//   create(el, { scale }) → { start, stop, setStep, reset }
//   steps: 1 shows where the targets hide (for the audience), 2 turns the cues on
import * as THREE from "../vendor/three/three.module.min.js";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
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
// ray–box slab test against a voxel centred at c with half-size h; returns distance or -1
function rayVoxel(o, d, c, h) {
  let t0 = 0, t1 = Infinity;
  for (let i = 0; i < 3; i++) {
    const lo = c[i] - h - o[i], hi = c[i] + h - o[i];
    if (Math.abs(d[i]) < 1e-9) { if (lo > 0 || hi < 0) return -1; continue; }
    let a = lo / d[i], b = hi / d[i];
    if (a > b) [a, b] = [b, a];
    t0 = Math.max(t0, a); t1 = Math.min(t1, b);
    if (t0 > t1) return -1;
  }
  return t0;
}

export async function create(el, opts = {}) {
  const scale = opts.scale || (() => 1);
  const canvas = el.querySelector("canvas");
  const data = await fetch(el.dataset.src || "assets/data/scatter.json").then((r) => r.json());
  const P = data.points, V = data.voxels, N = V.length, H = (data.voxel || 0.1) / 2;
  const reach = 2.6; // how close you must be for a target to light up (10 cm in the study; scaled up so the view can reach it)

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48, 1, 0.05, 60);
  scene.add(camera);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x555566, 1.5);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(1.5, 2.5, 1);
  camera.add(key);

  // colours come from the page, so the demo follows light and dark mode
  const col = {};
  function readTheme() {
    const cs = getComputedStyle(el);
    const v = (n, d) => cs.getPropertyValue(n).trim() || d;
    col.you = new THREE.Color(v("--you", "#3d8bff"));
    col.partner = new THREE.Color(v("--partner", "#f08a3c"));
    col.both = new THREE.Color(v("--both", "#ec4f9c"));
    col.bg = new THREE.Color(v("--surface", "#ffffff"));
    col.point = new THREE.Color(v("--x-line", "#8a8d9c"));
    col.ink = new THREE.Color(v("--x-ink", "#15161b"));
    col.frame = new THREE.Color(v("--x-geo", "#c9ccd8"));
  }
  readTheme();

  // the data: 100 points, and the voxels that touch them
  const pointMat = new THREE.MeshStandardMaterial({ color: col.point, roughness: 0.55, metalness: 0.05 });
  const points = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 18, 12), pointMat, P.length);
  const m4 = new THREE.Matrix4();
  P.forEach((p, i) => points.setMatrixAt(i, m4.makeTranslation(p[0], p[1], p[2])));
  scene.add(points);

  const voxMat = new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0 });
  const voxels = new THREE.InstancedMesh(new THREE.BoxGeometry(H * 1.84, H * 1.84, H * 1.84), voxMat, N);
  voxels.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(voxels);
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  const tmpC = new THREE.Color();

  // a faint box around the space, so it reads as a volume
  const frameMat = new THREE.LineBasicMaterial({ color: col.frame, transparent: true, opacity: 0.8 });
  const bounds = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(3.3, 3.3, 3.3)), frameMat);
  scene.add(bounds);

  // targets: 5% of the voxels, each visible only from one side
  const R = rng(17);
  const tIdx = new Set();
  while (tIdx.size < Math.round(N * 0.05)) tIdx.add(Math.floor(R() * N));
  const targets = [...tIdx].map((i) => {
    const u = R() * 2 - 1, a = R() * Math.PI * 2, s = Math.sqrt(1 - u * u);
    return { i, p: V[i], face: [s * Math.cos(a), u, s * Math.sin(a)], found: null, at: 0 };
  });
  const tGeo = new THREE.BoxGeometry(H * 2.2, H * 2.2, H * 2.2);
  const tEdges = new THREE.EdgesGeometry(tGeo);
  const ghostMat = new THREE.LineDashedMaterial({ color: col.ink, dashSize: 0.025, gapSize: 0.02, transparent: true, opacity: 0.55 });
  const foundMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  targets.forEach((t) => {
    const g = new THREE.Group();
    g.position.set(t.p[0], t.p[1], t.p[2]);
    t.ghost = new THREE.LineSegments(tEdges, ghostMat);
    t.ghost.computeLineDistances();
    t.box = new THREE.Mesh(tGeo, foundMat);
    t.edge = new THREE.LineSegments(tEdges, new THREE.LineBasicMaterial({ color: col.ink }));
    t.box.visible = t.edge.visible = t.ghost.visible = false;
    g.add(t.ghost, t.box, t.edge);
    scene.add(g);
  });

  // the simulated partner: a head with a visor, and its gaze ray
  const partner = new THREE.Group();
  const headMat = new THREE.MeshStandardMaterial({ color: col.partner, roughness: 0.5 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 16), headMat);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.11, 0.08), new THREE.MeshStandardMaterial({ color: 0x1b1c22, roughness: 0.3 }));
  visor.position.set(0, 0.02, 0.16); // lookAt turns +z towards the gaze
  partner.add(head, visor);
  scene.add(partner);
  const rayMat = new THREE.LineBasicMaterial({ color: col.partner });
  const rayGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const partnerRay = new THREE.Line(rayGeo, rayMat);
  scene.add(partnerRay);

  // ---------------------------------------------------------------- state
  let A, B, yaw, pitch, dist, pAng, pGaze, pAim, pDwell, tick, idle, look, clock, step = 0;
  const ui = {
    cues: el.querySelector('[data-act="cues"]'),
    targets: el.querySelector('[data-act="targets"]'),
    found: el.querySelector("[data-found]"),
  };
  let cues = false, showTargets = false;
  function reset() {
    A = new Float32Array(N); B = new Float32Array(N);
    yaw = 0.7; pitch = 0.25; dist = 4.6; look = new THREE.Vector3(); clock = 0;
    pAng = yaw + Math.PI * 0.9; pGaze = new THREE.Vector3(); pAim = null; pDwell = 0;
    tick = 0; idle = 0;
    targets.forEach((t) => { t.found = null; t.at = 0; });
    rnd = rng(5);
  }
  let rnd = rng(5);
  reset();
  function setCues(on) { cues = on; ui.cues && ui.cues.setAttribute("aria-pressed", String(on)); }
  function setTargets(on) { showTargets = on; ui.targets && ui.targets.setAttribute("aria-pressed", String(on)); }

  // ---------------------------------------------------------------- input
  let drag = null;
  canvas.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); idle = 0; e.stopPropagation(); });
  canvas.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const k = 1 / (scale() || 1);
    yaw -= (e.clientX - drag.x) * k * 0.006;
    pitch = clamp(pitch + (e.clientY - drag.y) * k * 0.005, -1.2, 1.2);
    drag = { x: e.clientX, y: e.clientY };
    idle = 0;
  });
  const end = () => (drag = null);
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);
  canvas.addEventListener("wheel", (e) => { e.preventDefault(); e.stopPropagation(); dist = clamp(dist * Math.exp(e.deltaY * 0.0012), 0.9, 8); idle = 0; }, { passive: false });
  ["click", "mousedown", "touchstart"].forEach((t) => canvas.addEventListener(t, (e) => e.stopPropagation()));
  el.querySelectorAll("[data-act]").forEach((b) => b.addEventListener("click", (e) => {
    e.stopPropagation();
    const act = b.dataset.act;
    if (act === "cues") setCues(!cues);
    else if (act === "targets") setTargets(!showTargets);
    else if (act === "reset") { reset(); setCues(step >= 2); setTargets(step >= 1); }
  }));

  // ---------------------------------------------------------------- simulation
  const o = [0, 0, 0], d = [0, 0, 0];
  function hit(origin, dir) {
    o[0] = origin.x; o[1] = origin.y; o[2] = origin.z; d[0] = dir.x; d[1] = dir.y; d[2] = dir.z;
    let best = -1, bt = Infinity;
    for (let i = 0; i < N; i++) {
      const t = rayVoxel(o, d, V[i], H * 1.15);
      if (t >= 0 && t < bt) { bt = t; best = i; }
    }
    return best < 0 ? null : { i: best, t: bt };
  }
  function reveal(origin, dir, who) {
    for (const t of targets) {
      if (t.found) continue;
      const dx = t.p[0] - origin.x, dy = t.p[1] - origin.y, dz = t.p[2] - origin.z;
      const dd = Math.hypot(dx, dy, dz);
      if (dd > reach) continue;
      // facing the target's open side, and the target near the middle of the view
      const open = -(dx * t.face[0] + dy * t.face[1] + dz * t.face[2]) / dd;
      const along = (dx * dir.x + dy * dir.y + dz * dir.z) / dd;
      if (open > 0.15 && along > 0.93) { t.found = who; t.at = 0; }
    }
  }
  const camDir = new THREE.Vector3(), pPos = new THREE.Vector3(), pDir = new THREE.Vector3(), tmpV = new THREE.Vector3();
  function update(dt) {
    idle += dt; clock += dt;
    // left alone, the head drifts round the data, glancing about and leaning in, so the slide stays alive
    const auto = !drag && idle > 3 ? Math.min(1, (idle - 3) / 2) : 0;
    if (auto) { yaw += dt * 0.1 * auto; dist += ((4.1 + Math.sin(clock * 0.21) * 0.8) - dist) * dt * 0.4 * auto; }
    tmpV.set(Math.sin(clock * 0.53) * 0.9, Math.sin(clock * 0.41) * 0.6, Math.cos(clock * 0.47) * 0.9).multiplyScalar(auto);
    look.lerp(tmpV, 1 - Math.exp(-dt * 2));
    const cp = Math.cos(pitch);
    camera.position.set(Math.sin(yaw) * cp * dist, Math.sin(pitch) * dist, Math.cos(yaw) * cp * dist);
    camera.lookAt(look);
    camera.getWorldDirection(camDir);

    // the partner circles the other side and looks around it
    pAng += dt * 0.05;
    pPos.set(Math.sin(pAng) * 2.9, 0.5 + Math.sin(pAng * 0.7) * 0.5, Math.cos(pAng) * 2.9);
    pDwell -= dt;
    if (pDwell <= 0 || pAim == null) {
      let best = null;
      for (let k = 0; k < (cues ? 14 : 1); k++) {
        const i = Math.floor(rnd() * N);
        const v = V[i];
        const side = (v[0] * pPos.x + v[2] * pPos.z) / 2.9;
        if (side < -0.2 && k < 13) continue;
        // with cues on, the partner heads for voxels nobody has looked at yet
        const s = cues ? A[i] + B[i] + rnd() * 0.15 : rnd();
        if (!best || s < best.s) best = { i, s };
      }
      if (best) { pAim = best.i; pDwell = 0.35 + rnd() * 0.5; }
    }
    if (pAim != null) pGaze.lerp(tmpV.set(...V[pAim]), 1 - Math.exp(-dt * 6));
    partner.position.copy(pPos);
    partner.lookAt(pGaze);
    pDir.copy(pGaze).sub(pPos).normalize();

    tick -= dt;
    const decay = Math.exp(-dt / 90);
    for (let i = 0; i < N; i++) { A[i] *= decay; B[i] *= decay; }
    if (tick <= 0) {
      tick += 0.1; // 10 Hz, like HeedVision
      const h1 = hit(camera.position, camDir);
      if (h1) A[h1.i] = Math.min(1, A[h1.i] + 0.3);
      const h2 = hit(pPos, pDir);
      if (h2) { B[h2.i] = Math.min(1, B[h2.i] + 0.3); rayGeo.attributes.position.setXYZ(1, pPos.x + pDir.x * h2.t, pPos.y + pDir.y * h2.t, pPos.z + pDir.z * h2.t); }
      else rayGeo.attributes.position.setXYZ(1, pGaze.x, pGaze.y, pGaze.z);
      rayGeo.attributes.position.setXYZ(0, pPos.x, pPos.y, pPos.z);
      rayGeo.attributes.position.needsUpdate = true;
      reveal(camera.position, camDir, "you");
      reveal(pPos, pDir, "partner");
    }
    targets.forEach((t) => (t.at += dt));
  }

  function draw() {
    let found = 0;
    for (let i = 0; i < N; i++) {
      const a = A[i], b = B[i], m = Math.max(a, b);
      if (!cues || m < 0.04) { voxels.setMatrixAt(i, zero); continue; }
      const c = Math.min(a, b) > 0.35 * m && Math.min(a, b) > 0.06 ? col.both : a >= b ? col.you : col.partner;
      // more attention, more solid: blend from the background towards the colour
      tmpC.copy(col.bg).lerp(c, 0.3 + 0.7 * clamp(m * 1.4, 0, 1));
      voxels.setColorAt(i, tmpC);
      voxels.setMatrixAt(i, m4.makeTranslation(V[i][0], V[i][1], V[i][2]));
    }
    voxels.instanceMatrix.needsUpdate = true;
    if (voxels.instanceColor) voxels.instanceColor.needsUpdate = true;
    for (const t of targets) {
      const on = !!t.found;
      if (on) found++;
      t.box.visible = t.edge.visible = on;
      if (on) {
        t.edge.material.color.copy(t.found === "you" ? col.you : col.partner);
        const s = 0.6 + 0.4 * Math.min(1, t.at / 0.3);
        t.box.scale.setScalar(s); t.edge.scale.setScalar(s);
      }
      t.ghost.visible = !on && showTargets;
    }
    if (ui.found) ui.found.textContent = `${found} of ${targets.length} found`;
    renderer.render(scene, camera);
  }

  // ---------------------------------------------------------------- lifecycle
  let w = 0, h = 0;
  function resize() {
    const cw = canvas.clientWidth || 900, ch = canvas.clientHeight || 600;
    const k = Math.min(2, (devicePixelRatio || 1) * scale());
    if (cw === w && ch === h && renderer.getPixelRatio() === k) return;
    w = cw; h = ch;
    renderer.setPixelRatio(k);
    renderer.setSize(cw, ch, false);
    camera.aspect = cw / ch;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(() => { resize(); if (!running) draw(); }).observe(canvas);
  addEventListener("hv-theme", () => {
    readTheme();
    pointMat.color.copy(col.point); frameMat.color.copy(col.frame); ghostMat.color.copy(col.ink);
    headMat.color.copy(col.partner); rayMat.color.copy(col.partner);
    targets.forEach((t) => !t.found && t.edge.material.color.copy(col.ink));
    if (!running) draw();
  });

  let running = false, last = 0;
  const frame = (t) => {
    if (!running) return;
    const dt = Math.min(0.05, (t - (last || t)) / 1000);
    last = t;
    resize();
    update(dt);
    draw();
    requestAnimationFrame(frame);
  };
  // a still: run the simulation for a while without drawing
  function settle(n) {
    reset(); setStep(n);
    for (let i = 0; i < 900; i++) update(1 / 30);
    resize(); draw();
  }
  function setStep(n) {
    step = n;
    setTargets(n >= 1);
    setCues(n >= 2);
    if (!running) { resize(); draw(); }
  }
  update(0); resize(); draw();
  return {
    get step() { return step; },
    start() { if (running) return; running = true; last = 0; requestAnimationFrame(frame); },
    stop() { running = false; },
    setStep, settle, reset() { reset(); setStep(step); },
  };
}
