// HeedVision's live demo as a plugin: `plugins: hv-live` in talk.md, then `::live` on a slide.
// A clean fork of the HeedVision demo: two headsets side by side over one shared voxel
// store (hvdemo.js). A template for your own interactive components: register markup
// with MDeck.component, and a runtime so the deck starts and stops it with its slide.
(function () {
  MDeck.component("live", (a) => MDeck.wrap("div", a, "c-live",
    `<div class="hvd-panes">${["A", "B"].map((u, i) => `<div class="hvd-pane"><canvas data-user="${i}" aria-label="User ${u}'s headset: drag to move them, click the sphere to hide or show their voxels"></canvas><span class="who">User ${u}</span></div>`).join("")}</div>` +
    `<button type="button" class="hvd-reset" data-act="reset">Reset</button>`,
    " data-voxdemo"), { label: "Live demo", w: 1400, h: 700 });
  let mod;
  MDeck.runtime({
    selector: "[data-voxdemo]",
    async mount(el, opts) {
      mod = mod || (await import(new URL("plugins/hvdemo.js", document.baseURI)));
      return mod.create(el, opts);
    },
  });
})();
