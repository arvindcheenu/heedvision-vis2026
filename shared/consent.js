// Google Analytics, only after a yes. Nothing is loaded from Google, and no cookie is set, until someone
// agrees. The choice is remembered in this browser, and "Cookie settings" changes it.
//
// It stays out of the way of the talk: no question on the slides (data-no-prompt), and nothing at all in an
// embedded slide or when the address holds a presenter key. Query strings never reach Google, because they
// can hold that key.
(function () {
  var ID = "G-LJ8YB1JDH1";
  var KEY = "heedvision-analytics";
  var HOST = "heedvision.arvindchee.nu"; // local work and previews never send anything
  var script = document.currentScript;
  var askAllowed = !script.hasAttribute("data-no-prompt");
  var params = new URLSearchParams(location.search);

  if (window.parent !== window) return;
  if (params.has("present") || params.has("receiver") || params.has("embed") || params.has("poster") || /print/.test(params.get("view") || "")) return;

  function choice() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function remember(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }

  function clean(url) {
    try { var u = new URL(url); return u.origin + u.pathname; } catch (e) { return ""; }
  }
  var started = false;
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  function start() {
    window["ga-disable-" + ID] = false;
    if (started) { gtag("consent", "update", { analytics_storage: "granted" }); return; }
    started = true;
    gtag("consent", "default", { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
    gtag("js", new Date());
    gtag("config", ID, { page_location: clean(location.href), page_referrer: clean(document.referrer), cookie_domain: location.hostname });
    if (location.hostname !== HOST) return;
    var tag = document.createElement("script");
    tag.async = true;
    tag.src = "https://www.googletagmanager.com/gtag/js?id=" + ID;
    document.head.appendChild(tag);
  }
  function stop() {
    window["ga-disable-" + ID] = true;
    if (started) gtag("consent", "update", { analytics_storage: "denied" });
    document.cookie.split(";").forEach(function (c) {
      var name = c.split("=")[0].trim();
      if (/^_g(a|id|at)/.test(name)) document.cookie = name + "=; Max-Age=0; path=/; domain=" + location.hostname;
      if (/^_g(a|id|at)/.test(name)) document.cookie = name + "=; Max-Age=0; path=/";
    });
  }

  // ------------------------------------------------------------ the question
  var box = null;
  function style() {
    if (document.getElementById("hv-consent-style")) return;
    var s = document.createElement("style");
    s.id = "hv-consent-style";
    s.textContent = ".hv-consent{position:fixed;left:16px;bottom:16px;z-index:80;box-sizing:border-box;width:min(360px,calc(100vw - 32px));padding:16px;border-radius:var(--r,14px);background:var(--bg,Canvas);color:var(--fg,CanvasText);color-scheme:light dark;box-shadow:0 0 0 .5px color-mix(in srgb,currentColor 18%,transparent),0 12px 32px -12px rgb(0 0 0/.35);font:var(--w-text,400) 15px/1.45 var(--f-text,inherit)}"
      + ".hv-consent p{margin:0 0 12px}.hv-consent a{color:inherit}"
      + ".hv-consent-row{display:flex;gap:8px}"
      + ".hv-consent button{flex:1;min-height:40px;padding:0 14px;border:0;border-radius:var(--r,14px);background:color-mix(in srgb,currentColor 9%,transparent);color:inherit;font:var(--w-strong,600) 15px/1 var(--f-text,inherit);cursor:pointer}"
      + ".hv-consent button:hover{background:color-mix(in srgb,currentColor 15%,transparent)}"
      + ".hv-consent button:focus-visible,.hv-cookie-link:focus-visible{outline:2px solid currentColor;outline-offset:2px}"
      + ".hv-cookie-link{appearance:none;padding:0;border:0;background:none;color:inherit;font:inherit;text-decoration:underline;text-underline-offset:.16em;cursor:pointer}"
      + ".hv-cookie-foot{margin:24px 16px;font-size:13px;opacity:.75;text-align:center}"
      + "@media print{.hv-consent,.hv-cookie-foot{display:none!important}}";
    document.head.appendChild(s);
  }
  function close() { if (box) { box.remove(); box = null; } }
  function ask(returnTo) {
    if (box) return;
    style();
    box = document.createElement("section");
    box.className = "hv-consent";
    box.setAttribute("aria-label", "Cookies");
    box.innerHTML = '<p>Mind if we count your visit? Google Analytics uses cookies to show us how people find this work. No ads, and everything works the same if you say no. <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener">How Google uses this</a></p>'
      + '<div class="hv-consent-row"><button type="button" class="btn" data-yes>Sure</button><button type="button" class="btn" data-no>No thanks</button></div>';
    document.body.appendChild(box);
    function done(v) {
      remember(v);
      close();
      if (v === "yes") start(); else stop();
      if (returnTo && returnTo.isConnected) returnTo.focus();
    }
    box.querySelector("[data-yes]").addEventListener("click", function () { done("yes"); });
    box.querySelector("[data-no]").addEventListener("click", function () { done("no"); });
    if (returnTo) box.querySelector("[data-yes]").focus();
  }

  function ready() {
    if (choice() === "yes") start();
    else if (choice() === null && askAllowed) ask();
    if (!askAllowed) return;
    // a way to change your mind, on every page that asks
    style();
    var link = document.querySelector("[data-cookie-settings]");
    if (!link) {
      var foot = document.createElement("p");
      foot.className = "hv-cookie-foot";
      foot.innerHTML = '<button type="button" data-cookie-settings>Cookie settings</button>';
      document.body.appendChild(foot);
      link = foot.firstChild;
    }
    link.classList.add("hv-cookie-link");
    link.addEventListener("click", function () { ask(link); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready); else ready();
})();
