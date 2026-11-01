// Site-wide settings. Edit these, nothing else needs to change.
window.HV = {
  // Public address of the transcript page (shown as text and QR code).
  talkUrl: "https://heedvision.arvindchee.nu/talk/",

  // Cloudflare Worker that relays the presenter's slide and stores questions.
  // Leave empty to run fully offline (no follow-along, no questions).
  live: {
    endpoint: "https://heedvision-live.arvindcheenu.workers.dev",
    room: "vis2026",
  },

  // Optional live demos, keyed by an embed's data-live attribute.
  // When set and reachable, the slide shows the iframe; otherwise it plays the recording.
  demos: {
    heedvision: "",
  },

  links: {
    site: "https://heedvision.arvindchee.nu/",
    paper: "https://heedvision.arvindchee.nu/heedvision.pdf",
    osf: "https://osf.io/frsp8/",
  },
};

// For local testing: ?live=http://127.0.0.1:8787 points at `npx wrangler dev`.
// Only loopback addresses are accepted, so a link can't redirect the audience.
(function () {
  const v = new URLSearchParams(location.search).get("live");
  if (v && /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/.test(v)) window.HV.live.endpoint = v;
})();
