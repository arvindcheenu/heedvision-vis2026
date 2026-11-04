// Bundled to slides/vendor/magic-move.js: Shiki Magic Move plus the highlighter it needs.
import { createHighlighterCoreSync } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import python from "shiki/langs/python.mjs";
import javascript from "shiki/langs/javascript.mjs";
import { codeToKeyedTokens, createMagicMoveMachine, toKeyedTokens } from "@shikijs/magic-move/core";
import { MagicMoveRenderer } from "@shikijs/magic-move/renderer";

const theme = {
  name: "attention", type: "light", fg: "#1d1d1f", bg: "#00000000",
  settings: [
    { settings: { foreground: "#1d1d1f" } },
    { scope: ["comment", "punctuation.definition.comment"], settings: { foreground: "#8d8d8a" } },
    { scope: ["keyword", "storage", "keyword.operator.word"], settings: { foreground: "#d6246e" } },
    { scope: ["entity.name.function", "support.function", "meta.function-call.generic"], settings: { foreground: "#1f76d6" } },
    { scope: ["string", "constant.numeric", "constant.language", "support.type"], settings: { foreground: "#c96f12" } },
  ],
};
const hl = createHighlighterCoreSync({ themes: [theme], langs: [python, javascript], engine: createJavaScriptRegexEngine() });

// plain text, one token per word, so sentences morph word by word
function textTokens(code) {
  let offset = 0;
  return code.split("\n").map((line) => {
    const toks = line.split(/(\s+)/).filter(Boolean).map((content) => { const t = { content, offset, color: "currentColor" }; offset += content.length; return t; });
    offset += 1;
    return toks;
  });
}
export function mount(el, steps, { lang = "python", duration = 750 } = {}) {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const toTokens = lang === "text"
    ? (code, ln) => toKeyedTokens(code, textTokens(code), undefined, ln)
    : (code, ln) => codeToKeyedTokens(hl, code, { lang, theme: "attention" }, ln);
  // the theme's colours become the site's tokens, so code follows light and dark
  const VARS = { "#1d1d1f": "var(--ink)", "#8d8d8a": "var(--muted)", "#d6246e": "var(--accent-text)", "#1f76d6": "var(--you-text)", "#c96f12": "var(--partner-text)" };
  const themed = (code, ln) => { const info = toTokens(code, ln); info.tokens.forEach((t) => { const c = VARS[String(t.color || "").toLowerCase()]; if (c) t.color = c; }); return info; };
  const machine = createMagicMoveMachine(themed);
  el.textContent = "";
  el.classList.add("shiki-magic-move-container");
  const renderer = new MagicMoveRenderer(el, { duration: reduce ? 0 : duration, stagger: reduce ? 0 : 0.3, easing: "cubic-bezier(0.2, 0, 0, 1)", animateContainer: false, containerStyle: false });
  let at = -1;
  const go = (i) => {
    i = Math.max(0, Math.min(steps.length - 1, i));
    if (i === at) return;
    const first = at < 0;
    at = i;
    const r = machine.commit(steps[i]);
    if (first) renderer.replace(r.current); else renderer.render(r.current);
  };
  go(0);
  return { go, get step() { return at; } };
}
