// One file to make this site yours. Every page loads it first.
window.SITE = {
  title: "HeedVision",
  subtitle: "Attention Awareness in Collaborative Immersive Analytics Environments",
  venue: "IEEE VIS 2026 · Boston",
  url: "https://heedvision.arvindchee.nu/",

  // Look. `accent` is the only colour in the interface.
  accent: "#d6246e",
  // "sans" or "serif" (the system stacks in shared/site.css), or any CSS font stack.
  fonts: { heading: "serif", body: "sans" },

  // photo paths are relative to the site root
  authors: [
    { name: "Arvind Srinivasan", email: "arvind@cs.au.dk", photo: "slides/assets/people/arvind.jpg", url: "https://orcid.org/0000-0002-3409-6077" },
    { name: "Niklas Elmqvist", email: "elm@cs.au.dk", photo: "slides/assets/people/niklas.jpg", url: "https://orcid.org/0000-0001-5805-5301" },
  ],

  // shown small and in greyscale
  logos: [
    { src: "shared/logos/vis2026.png", alt: "IEEE VIS 2026" },
    { src: "shared/logos/au.svg", alt: "Aarhus University" },
    { src: "shared/logos/ca3.svg", alt: "Center for Anytime Anywhere Analytics" },
  ],
};
