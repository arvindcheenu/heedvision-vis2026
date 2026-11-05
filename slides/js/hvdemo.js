// A clean fork of the HeedVision demo (demo.webstrates.net/hv-demo-voxels), as
// two headsets side by side. The scene, voxelization, gaze ray, attention store
// and colouring follow the demo's own code (Enclosure, VoxelLayer, ModelLayer,
// Ray and VoxelStore helpers); what's left out is the Webstrates plumbing. Varv's
// shared VoxelStore becomes one in-page store both views read and write, the way
// Spatialstrates syncs two headsets. Logging, the user manager and XR are gone.
//
// Drag a view to move that person (they wander on their own when left alone),
// scroll to step closer, click the sphere to hide or show that person's voxels.
//
//   create(el, { scale }) → { start, stop, setStep, settle, reset }
import * as THREE from "../vendor/three/three.module.min.js";
import { MeshBVH } from "../vendor/three-mesh-bvh/index.module.js";

// ---------------------------------------------------------------- constants (Experiment Constants, VoxelStore helpers)
const LOCAL_USER_COLOR = "skyblue";
const OTHER_USER_COLOR = "gold";
const MUTUAL_USER_COLOR = "lightpink";
const VOXEL_SIZE = 0.1;
const INCREMENT = 0.2;          // attention added per ray hit, up to 1
const RAY_EVERY = 0.5;          // the ray casts every 30th frame: twice a second at 60 fps
const TARGET_SHARE = 0.05;      // 5% of voxels hide a target
const NAMES = ["User A", "User B"];
const CENTER = new THREE.Vector3(0, 1.5, 0); // the enclosure group sits at (0, 1.5, 0), scaled 0.15

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

// ---------------------------------------------------------------- Enclosure helpers: voxelize with a BVH
function voxelize(geometry, voxelSize) {
  geometry.computeBoundingBox();
  const bb = geometry.boundingBox, size = new THREE.Vector3();
  bb.getSize(size);
  const pad = voxelSize * 0.5;
  const min = bb.min.clone().sub(size.clone().multiplyScalar(pad));
  const max = bb.max.clone().add(size.clone().multiplyScalar(pad));
  const steps = max.clone().sub(min).divideScalar(voxelSize).ceil();
  const bvh = new MeshBVH(geometry.clone(), { maxLeafTris: 2, strategy: 0 });
  const half = voxelSize * 0.5, box = new THREE.Box3(), inv = new THREE.Matrix4(), out = [];
  for (let i = 0; i < steps.x; i++) for (let j = 0; j < steps.y; j++) for (let k = 0; k < steps.z; k++) {
    const x = min.x + (i + 0.5) * voxelSize, y = min.y + (j + 0.5) * voxelSize, z = min.z + (k + 0.5) * voxelSize;
    box.min.set(x - half, y - half, z - half);
    box.max.set(x + half, y + half, z + half);
    if (bvh.intersectsBox(box, inv)) out.push([x, y, z]);
  }
  return out;
}

// ---------------------------------------------------------------- Enclosure utilities: the voxel material
class VoxelMaterial extends THREE.ShaderMaterial {
  constructor() {
    super({
      uniforms: { baseOpacity: { value: 1.0 } },
      vertexShader: `
        attribute vec3 instanceColor;
        attribute float instanceOpacity;
        attribute float instanceEmissive;
        varying vec3 vColor;
        varying float vOpacity;
        varying float vEmissive;
        void main() {
          vColor = instanceColor;
          vOpacity = instanceOpacity;
          vEmissive = instanceEmissive;
          gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform float baseOpacity;
        varying vec3 vColor;
        varying float vOpacity;
        varying float vEmissive;
        void main() {
          gl_FragColor = vec4(vColor * (1.0 + vEmissive), vOpacity * baseOpacity);
        }`,
      transparent: true,
    });
  }
}

// text on a box face, as drei's Text does in the demo
function textTexture(lines, { size = 64, color = "#000", bg = null, w = 512, h = 128, weight = 400 } = {}) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d");
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
  g.fillStyle = color;
  g.textAlign = "center"; g.textBaseline = "middle";
  g.font = `${weight} ${size}px ${getComputedStyle(document.documentElement).getPropertyValue("--f-text") || "system-ui"}`;
  const ls = [].concat(lines);
  ls.forEach((t, i) => g.fillText(t, w / 2, h / 2 + (i - (ls.length - 1) / 2) * size * 1.6));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// the Spatialstrates room: grey sky, light floor, a grid
function skyTexture() {
  const c = document.createElement("canvas");
  c.width = 4; c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = "#dedddc"; g.fillRect(0, 0, 4, 256); // flat, like everything on the slides
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// a visitor's head, for the other person in your view
function makeHead() {
  const g = new THREE.Group();
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.09, 24, 16), new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.6 }));
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.06, 0.05), new THREE.MeshStandardMaterial({ color: 0x1d1d22, roughness: 0.3 }));
  visor.position.set(0, 0.01, -0.08); // a camera looks down −z
  g.add(head, visor);
  return g;
}

export async function create(el, opts = {}) {
  const scale = opts.scale || (() => 1);
  const canvases = [...el.querySelectorAll("canvas[data-user]")];

  // the model: Geometry.createGeometry("Sphere")
  const sphereGeo = new THREE.SphereGeometry(1, 32, 32);
  const positions = voxelize(sphereGeo, VOXEL_SIZE);
  const N = positions.length;

  // targets, picked like checkOrCreateTargets: 5% of the voxel indices
  const R = rng(7);
  const targets = new Set();
  for (let i = 0; i < TARGET_SHARE * N; i++) targets.add(Math.floor(R() * N));

  // VoxelStore: one record per user and voxel, shared by both headsets
  const store = [0, 1].map(() => ({ att: new Float32Array(N), dist: new Float32Array(N), seen: new Float64Array(N) }));
  let clock = 0;

  // ---------------------------------------------------------------- one headset
  const users = canvases.map((canvas, u) => {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene();
    scene.background = skyTexture();
    scene.fog = new THREE.Fog(0xe4e4e3, 5, 16);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x9a9a9a, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.8);
    sun.position.set(2, 4, 3);
    scene.add(sun);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshBasicMaterial({ color: 0xeeeeee }));
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
    const grid = new THREE.GridHelper(40, 80, 0xb4b4b4, 0xc8c8c8);
    grid.position.y = 0.001;
    scene.add(grid);

    const camera = new THREE.PerspectiveCamera(55, 1.6, 0.02, 60);
    scene.add(camera);
    // the Ray component's reticle: a small white dot half a metre ahead
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.006, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.5, transparent: true, depthTest: false, depthWrite: false }));
    dot.position.set(0, 0, -0.5);
    dot.renderOrder = 9999;
    camera.add(dot);

    // the enclosure
    const group = new THREE.Group();
    group.scale.setScalar(0.15);
    group.position.copy(CENTER);
    scene.add(group);
    const model = new THREE.Mesh(sphereGeo, new THREE.MeshStandardMaterial({ color: "#52286a", metalness: 0.1, roughness: 0.2, flatShading: true, side: THREE.DoubleSide }));
    group.add(model);

    // VoxelLayer
    const voxGeo = new THREE.BoxGeometry(VOXEL_SIZE, VOXEL_SIZE, VOXEL_SIZE);
    const colors = new Float32Array(N * 3), opac = new Float32Array(N), emis = new Float32Array(N);
    const tmp = new THREE.Object3D(), base = new THREE.Color().setHSL(0.7, 0.5, 0.5);
    voxGeo.setAttribute("instanceColor", new THREE.InstancedBufferAttribute(colors, 3));
    voxGeo.setAttribute("instanceOpacity", new THREE.InstancedBufferAttribute(opac, 1));
    voxGeo.setAttribute("instanceEmissive", new THREE.InstancedBufferAttribute(emis, 1));
    const voxels = new THREE.InstancedMesh(voxGeo, new VoxelMaterial(), N);
    positions.forEach((p, i) => {
      tmp.position.set(p[0], p[1], p[2]);
      tmp.updateMatrix();
      voxels.setMatrixAt(i, tmp.matrix);
      colors.set([base.r, base.g, base.b], i * 3);
    });
    voxels.instanceMatrix.needsUpdate = true;
    voxels.computeBoundingSphere();
    group.add(voxels);

    // UserLegend: the local user first, in blue; the other in gold
    const legend = new THREE.Group();
    legend.position.set(0.025, 0.5, 1.8);
    [[NAMES[u], LOCAL_USER_COLOR, -1.125], ["Shared", MUTUAL_USER_COLOR, 0], [NAMES[1 - u], OTHER_USER_COLOR, 1.125]].forEach(([t, c, x]) => {
      const b = new THREE.Group();
      b.position.set(x, -2, 0);
      b.add(new THREE.Mesh(new THREE.BoxGeometry(1, 0.3, 0.1), new THREE.MeshStandardMaterial({ color: c })));
      const face = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.3), new THREE.MeshBasicMaterial({ map: textTexture(t, { size: 64, color: "#fff", w: 512, h: 154 }), transparent: true }));
      face.position.z = 0.06;
      b.add(face);
      legend.add(b);
    });
    group.add(legend);

    // InfoLayer
    const info = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.5), new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    info.position.set(0, 2.4, 0);
    group.add(info);

    // the other person
    const other = makeHead();
    scene.add(other);
    scene.updateMatrixWorld(); // so the gaze ray can hit voxels before the first render

    // where this person stands and looks (yaw around the sphere, pitch, distance)
    const pose = u === 0
      ? { yaw: 0.5 - 0.16 * 60, pitch: 0.14, dist: 0.85, spin: 0.16, seed: 11 }   // a minute of warm-up ends
      : { yaw: -0.6 + 0.12 * 60, pitch: 0.02, dist: 0.9, spin: -0.12, seed: 29 }; // with both in front
    const me = {
      u, canvas, renderer, scene, camera, model, voxels, colors, opac, emis, info, other,
      ...pose, home: pose, show: true, aim: new THREE.Vector3(), aimTo: new THREE.Vector3(), dwell: 0,
      idle: 99, rand: rng(pose.seed), rayT: u * 0.25, w: 0, h: 0, infoKey: "",
    };
    return me;
  });

  // ---------------------------------------------------------------- VoxelStore helpers: colour from one viewer's side
  const tc = new THREE.Color(), hsl = {};
  function paint(me) {
    const L = me.u, O = 1 - L, a = store[L], b = store[O];
    for (let i = 0; i < N; i++) {
      const hasL = a.att[i] > 0, hasO = b.att[i] > 0;
      if (!hasL && !hasO) { me.opac[i] = 0; continue; }
      // the newest record wins, as when updates replay in order
      const w = hasL && (!hasO || a.seen[i] >= b.seen[i]) ? L : O;
      const rec = store[w];
      tc.set(hasL && hasO ? MUTUAL_USER_COLOR : w === L ? LOCAL_USER_COLOR : OTHER_USER_COLOR);
      // getVoxelEmissivity: targets glow brighter the closer they were seen from
      const em = targets.has(i) ? clamp(Math.abs(1.2 - rec.dist[i]), 0, 1.2) : 0;
      tc.getHSL(hsl);
      tc.setHSL(hsl.h, hsl.s, Math.min(hsl.l + em * 0.5, 1));
      me.colors[i * 3] = tc.r; me.colors[i * 3 + 1] = tc.g; me.colors[i * 3 + 2] = tc.b;
      // hidden voxels: only your own targets, seen from close by, still show
      me.opac[i] = me.show ? rec.att[i] : em >= 0.6 && w === L ? rec.att[i] : 0;
    }
    me.voxels.geometry.getAttribute("instanceColor").needsUpdate = true;
    me.voxels.geometry.getAttribute("instanceOpacity").needsUpdate = true;
    const key = `${me.show}`;
    if (key !== me.infoKey) {
      me.infoKey = key;
      me.info.material.map?.dispose();
      me.info.material.map = textTexture(["Click to Toggle Voxels", `Visible: ${me.show ? "Yes" : "No"}`], { size: 44, w: 1024, h: 214 });
      me.info.material.needsUpdate = true;
    }
  }

  // ---------------------------------------------------------------- moving each person
  const spot = new THREE.Vector3();
  function place(me) {
    const cp = Math.cos(me.pitch);
    me.camera.position.set(CENTER.x + me.dist * cp * Math.sin(me.yaw), CENTER.y + me.dist * Math.sin(me.pitch), CENTER.z + me.dist * cp * Math.cos(me.yaw));
    me.camera.lookAt(spot.copy(CENTER).add(me.aim));
    me.camera.updateMatrixWorld();
  }
  function wander(me, dt) {
    me.idle += dt;
    if (me.idle < 3.5) { me.aim.multiplyScalar(Math.exp(-dt * 4)); return; } // held by the presenter: look at the centre
    me.yaw += me.spin * dt;
    me.pitch += (0.18 * Math.sin(clock * 0.21 + me.seed) - me.pitch) * dt * 0.4;
    me.dist += (0.82 + 0.14 * Math.sin(clock * 0.13 + me.seed) - me.dist) * dt * 0.5;
    // glance around the side facing you, a new spot every second or so
    if ((me.dwell -= dt) <= 0) {
      me.dwell = 0.7 + me.rand() * 0.9;
      const r = me.rand, a = r() * Math.PI * 2, s = 0.13 * Math.sqrt(r());
      me.aimTo.set(Math.cos(a) * s, Math.sin(a) * s * 0.8, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), me.yaw);
    }
    me.aim.lerp(me.aimTo, 1 - Math.exp(-dt * 3));
  }

  // ---------------------------------------------------------------- the Ray component: a gaze ray from the centre of view
  const ray = new THREE.Raycaster(), fwd = new THREE.Vector3();
  ray.near = 0.01; ray.far = 100;
  function castRay(me) {
    fwd.set(0, 0, -1).applyQuaternion(me.camera.quaternion);
    ray.set(me.camera.position, fwd);
    const hit = ray.intersectObject(me.voxels, false).find((h) => h.instanceId !== undefined);
    if (!hit) return false;
    const s = store[me.u], i = hit.instanceId;
    s.att[i] = Math.min(1, s.att[i] + INCREMENT);
    s.dist[i] = hit.distance;
    s.seen[i] = clock;
    return true;
  }

  function update(dt) {
    clock += dt;
    let changed = false;
    users.forEach((me) => { wander(me, dt); place(me); });
    users.forEach((me) => {
      me.rayT += dt;
      if (me.rayT >= RAY_EVERY) { me.rayT -= RAY_EVERY; changed = castRay(me) || changed; }
    });
    users.forEach((me) => {
      const them = users[1 - me.u];
      if (!them) return;
      me.other.position.copy(them.camera.position);
      me.other.quaternion.copy(them.camera.quaternion);
    });
    if (changed) users.forEach(paint);
  }
  function draw() { users.forEach((me) => me.renderer.render(me.scene, me.camera)); }

  // ---------------------------------------------------------------- input
  users.forEach((me) => {
    const c = me.canvas;
    let drag = null, moved = 0;
    c.addEventListener("pointerdown", (e) => { e.stopPropagation(); drag = { x: e.clientX, y: e.clientY }; moved = 0; c.setPointerCapture(e.pointerId); });
    c.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const k = 1 / (scale() || 1), dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      moved += Math.abs(dx) + Math.abs(dy);
      me.yaw -= dx * k * 0.008;
      me.pitch = clamp(me.pitch + dy * k * 0.006, -1.1, 1.2);
      drag = { x: e.clientX, y: e.clientY };
      me.idle = 0;
    });
    const end = (e) => {
      if (drag && moved < 6) toggleAt(me, e); // a click, not a drag: ModelLayer's onPointerDown
      drag = null;
    };
    c.addEventListener("pointerup", end);
    c.addEventListener("pointercancel", () => (drag = null));
    c.addEventListener("wheel", (e) => { e.preventDefault(); e.stopPropagation(); me.dist = clamp(me.dist * Math.exp(e.deltaY * 0.0012), 0.3, 2.6); me.idle = 0; }, { passive: false });
    ["click", "mousedown", "touchstart"].forEach((t) => c.addEventListener(t, (e) => e.stopPropagation()));
  });
  const ndc = new THREE.Vector2();
  function toggleAt(me, e) {
    const r = me.canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, me.camera);
    if (!ray.intersectObject(me.model, false).length) return;
    me.show = !me.show;
    paint(me);
    if (!running) draw();
  }
  el.querySelectorAll("[data-act]").forEach((b) => b.addEventListener("click", (e) => {
    e.stopPropagation();
    if (b.dataset.act === "reset") { reset(); if (!running) draw(); }
  }));

  function reset() {
    store.forEach((s) => { s.att.fill(0); s.dist.fill(0); s.seen.fill(0); });
    clock = 0;
    users.forEach((me) => { me.show = true; me.idle = 99; paint(me); place(me); });
  }

  // ---------------------------------------------------------------- lifecycle
  function resize() {
    users.forEach((me) => {
      const cw = me.canvas.clientWidth || 800, ch = me.canvas.clientHeight || 500;
      const k = Math.min(2, (devicePixelRatio || 1) * scale());
      if (cw === me.w && ch === me.h && me.renderer.getPixelRatio() === k) return;
      me.w = cw; me.h = ch;
      me.renderer.setPixelRatio(k);
      me.renderer.setSize(cw, ch, false);
      me.camera.aspect = cw / ch;
      me.camera.updateProjectionMatrix();
    });
  }
  new ResizeObserver(() => { resize(); if (!running) draw(); }).observe(el);

  let running = false, last = 0, step = 0;
  const frame = (t) => {
    if (!running) return;
    const dt = Math.min(0.05, (t - (last || t)) / 1000);
    last = t;
    resize();
    update(dt);
    draw();
    requestAnimationFrame(frame);
  };
  // a still: let both people look around for a while, then draw once
  function settle() { warm(); resize(); draw(); }
  // the slide opens on a minute of looking around, so there's something to see; Reset clears it
  function warm() {
    users.forEach((me) => Object.assign(me, { yaw: me.home.yaw, pitch: me.home.pitch, dist: me.home.dist }));
    reset();
    for (let i = 0; i < 1800; i++) update(1 / 30);
  }
  warm(); resize(); draw();
  return {
    get step() { return step; },
    start() { if (running) return; running = true; last = 0; requestAnimationFrame(frame); },
    stop() { running = false; },
    setStep(n) { step = n; },
    settle, reset() { reset(); if (!running) draw(); },
  };
}
