// How the site feels under the hand: a light that follows the cursor over anything clickable, and
// small synthesized sounds for pressing it. No sound files; the page makes each one when it plays.
//
// Sounds have an off switch: put <span data-sound-toggle></span> where you want it. The choice is
// remembered per browser. They start on with a mouse and off on a phone, because a roomful of phones
// clicking during a talk would be awful. Pages with data-silent on <html> (the slides and the presenter
// view, whose laptop is usually wired to the room's speakers) never make a sound and show no switch.
(function () {
  var CLICKABLE = ".btn, .theme-picker button, .sound-toggle, .link-card";
  var QUIET_CLICKABLE = CLICKABLE + ", .page-toc a, .toc a, .script .click, .qs summary, .entry-go, .authors .author";
  var root = document.documentElement;
  var silent = root.hasAttribute("data-silent");

  // ------------------------------------------------------------ light
  var fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  var lit = [], frame = 0, last = null;
  function clear() { lit.forEach(function (el) { el.classList.remove("lit", "near"); }); lit = []; }
  function shine() {
    frame = 0;
    var e = last, hit = e.target && e.target.closest ? e.target.closest(CLICKABLE) : null;
    // the row it's in catches the light too, along its edges, as in Fluent
    var row = hit ? hit.parentElement : e.target && e.target.querySelector && e.target.querySelector(":scope > .btn, :scope > button, :scope > .link-card") ? e.target : null;
    clear();
    if (!row) return;
    [].forEach.call(row.children, function (el) {
      if (!el.matches(CLICKABLE)) return;
      var r = el.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      if (el !== hit && (x < -90 || y < -90 || x > r.width + 90 || y > r.height + 90)) return;
      el.style.setProperty("--mx", x + "px");
      el.style.setProperty("--my", y + "px");
      el.classList.add("lit-able", el === hit ? "lit" : "near");
      lit.push(el);
    });
  }
  if (fine) {
    addEventListener("pointermove", function (e) { last = e; if (!frame) frame = requestAnimationFrame(shine); }, { passive: true });
    document.addEventListener("pointerleave", clear);
    addEventListener("blur", clear);
    // give each control its light before it's first touched, so it fades in rather than pops
    addEventListener("pointerover", function (e) {
      var c = e.target.closest && e.target.closest(CLICKABLE);
      if (c) c.classList.add("lit-able");
    }, { passive: true });
  }

  // ------------------------------------------------------------ sound
  var KEY = "heedvision-sound", ctx = null, out = null, noise = null;
  function stored() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function isOn() {
    if (silent) return false;
    var s = stored();
    return s ? s === "on" : fine;
  }
  function tick(c, dest, t, freq, q, gain, length) {
    var src = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain();
    src.buffer = noiseIn(c);
    bp.type = "bandpass"; bp.frequency.value = freq; bp.Q.value = q;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + length);
    src.connect(bp); bp.connect(g); g.connect(dest);
    src.start(t, Math.random() * 0.05, length + 0.01);
  }
  function tone(c, dest, t, freq, gain, length, to) {
    var o = c.createOscillator(), g = c.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + length);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + length);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + length + 0.01);
  }
  function noiseIn(c) {
    if (noise && noise.sampleRate === c.sampleRate) return noise;
    noise = c.createBuffer(1, Math.floor(c.sampleRate * 0.1), c.sampleRate);
    var d = noise.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return noise;
  }
  var VOICES = {
    hover: function (c, d, t) { tick(c, d, t, 5200, 2, 0.012, 0.006); },
    press: function (c, d, t) { tick(c, d, t, 2300, 1.1, 0.11, 0.016); tone(c, d, t, 170, 0.07, 0.03, 90); },
    release: function (c, d, t) { tick(c, d, t, 3600, 1.3, 0.05, 0.01); },
    on: function (c, d, t) { tone(c, d, t, 620, 0.03, 0.05); tone(c, d, t + 0.05, 930, 0.03, 0.07); },
    off: function (c, d, t) { tone(c, d, t, 930, 0.025, 0.05); tone(c, d, t + 0.05, 620, 0.025, 0.07); },
    sent: function (c, d, t) { tone(c, d, t, 587, 0.03, 0.09); tone(c, d, t + 0.08, 880, 0.03, 0.14); },
  };
  // browsers allow sound only after a press or a key, so nothing starts before then
  function wake() {
    if (silent || ctx || !window.AudioContext) return;
    ctx = new AudioContext();
    out = ctx.createGain();
    out.gain.value = 0.8;
    out.connect(ctx.destination);
  }
  function play(name) {
    if (!isOn() || !ctx || !VOICES[name]) return;
    if (ctx.state === "suspended") ctx.resume();
    VOICES[name](ctx, out, ctx.currentTime);
    api.last = name;
  }

  var hovered = null, hoverAt = 0;
  if (!silent) {
    addEventListener("pointerover", function (e) {
      if (e.pointerType !== "mouse") return;
      var c = e.target.closest && e.target.closest(QUIET_CLICKABLE);
      if (c === hovered) return;
      hovered = c;
      var now = performance.now();
      if (c && now - hoverAt > 70) { hoverAt = now; play("hover"); }
    }, { passive: true });
    addEventListener("pointerdown", function (e) {
      wake();
      if (e.button === 0 && e.target.closest && e.target.closest(QUIET_CLICKABLE)) play("press");
    }, { capture: true, passive: true });
    addEventListener("keydown", wake, { capture: true, passive: true });
    document.addEventListener("click", function (e) {
      var c = e.target.closest && e.target.closest(QUIET_CLICKABLE);
      if (!c) return;
      if (e.detail === 0) play("press");
      // read a switch's state once its own handler has changed it
      if (c.hasAttribute("aria-pressed")) setTimeout(function () { play(c.getAttribute("aria-pressed") === "true" ? "on" : "off"); }, 0);
      else if (e.detail !== 0) play("release");
    });
    document.addEventListener("submit", function () { play("sent"); });
  }

  // ------------------------------------------------------------ the switch
  var ICON = {
    on: '<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/>',
    off: '<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
  };
  function draw(el) {
    var on = isOn();
    el.setAttribute("aria-pressed", String(on));
    el.setAttribute("title", on ? "Sounds on" : "Sounds off");
    el.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + ICON[on ? "on" : "off"] + "</svg>";
  }
  function mount() {
    document.querySelectorAll("[data-sound-toggle]").forEach(function (slot) {
      if (silent) { slot.hidden = true; return; }
      var b = document.createElement("button");
      b.type = "button";
      b.className = "sound-toggle";
      b.setAttribute("aria-label", "Sounds");
      slot.appendChild(b);
      draw(b);
      b.addEventListener("click", function () {
        try { localStorage.setItem(KEY, isOn() ? "off" : "on"); } catch (e) {}
        document.querySelectorAll(".sound-toggle").forEach(draw);
        wake();
      });
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();
  addEventListener("storage", function (e) { if (e.key === KEY) document.querySelectorAll(".sound-toggle").forEach(draw); });

  var api = window.HVTactile = { isOn: isOn, play: play, voices: VOICES, last: null };
})();
