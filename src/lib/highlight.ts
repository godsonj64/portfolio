import "server-only";
import { createHighlighter, createJavaScriptRegexEngine, type Highlighter, type ThemeRegistration } from "shiki";

// A palette of the site's own: violet keywords, mint strings, amber numbers, sky functions.
const theme: ThemeRegistration = {
  name: "gj",
  type: "dark",
  colors: { "editor.background": "#0b0b10", "editor.foreground": "#d7d7e0" },
  settings: [
    { settings: { foreground: "#d7d7e0" } },
    { scope: ["comment", "punctuation.definition.comment"], settings: { foreground: "#6c6c7a", fontStyle: "italic" } },
    { scope: ["keyword", "storage", "keyword.control", "keyword.operator.new", "keyword.operator.expression"], settings: { foreground: "#b79cff" } },
    { scope: ["string", "string.quoted", "punctuation.definition.string"], settings: { foreground: "#8fe3c2" } },
    { scope: ["constant.numeric", "constant.language", "constant.character.escape"], settings: { foreground: "#ffb27a" } },
    { scope: ["entity.name.function", "support.function", "meta.function-call entity.name.function"], settings: { foreground: "#7cc4ff" } },
    { scope: ["entity.name.type", "entity.name.class", "support.type", "support.class", "storage.type"], settings: { foreground: "#f2c879" } },
    { scope: ["variable.parameter", "variable.other.readwrite"], settings: { foreground: "#e8e8f0" } },
    { scope: ["punctuation", "meta.brace", "keyword.operator"], settings: { foreground: "#9a9aa8" } },
    { scope: ["entity.name.tag", "markup.heading", "entity.name.section"], settings: { foreground: "#ff8fb1" } },
    { scope: ["entity.other.attribute-name", "support.type.property-name", "meta.object-literal.key"], settings: { foreground: "#9fb6ff" } },
    { scope: ["markup.inserted"], settings: { foreground: "#8fe3c2" } },
    { scope: ["markup.deleted"], settings: { foreground: "#ff8f9a" } },
    { scope: ["markup.bold"], settings: { fontStyle: "bold" } },
    { scope: ["markup.italic"], settings: { fontStyle: "italic" } },
  ],
};

const LANGS = [
  "python", "typescript", "tsx", "javascript", "jsx", "json", "jsonc", "yaml", "toml", "bash", "markdown",
  "html", "css", "c", "cpp", "rust", "go", "sql", "diff", "ini", "dockerfile", "makefile", "latex",
] as const;

let hl: Promise<Highlighter> | undefined;
const highlighter = () =>
  (hl ??= createHighlighter({ themes: [theme], langs: [...LANGS], engine: createJavaScriptRegexEngine() }).catch((e) => {
    hl = undefined; // let the next request retry instead of caching the failure
    throw e;
  }));

const EXT: Record<string, string> = {
  py: "python", pyi: "python", ts: "typescript", tsx: "tsx", js: "javascript", mjs: "javascript", cjs: "javascript", jsx: "jsx",
  json: "json", jsonc: "jsonc", yml: "yaml", yaml: "yaml", toml: "toml", sh: "bash", bash: "bash", zsh: "bash", md: "markdown",
  mdx: "markdown", html: "html", htm: "html", css: "css", c: "c", h: "c", cc: "cpp", cpp: "cpp", hpp: "cpp", rs: "rust", go: "go",
  sql: "sql", diff: "diff", patch: "diff", cu: "cpp", cuh: "cpp", ini: "ini", cfg: "ini", tex: "latex",
};

export function langFor(path: string): string {
  const base = path.split("/").pop()!.toLowerCase();
  if (base === "dockerfile") return "dockerfile";
  if (base === "makefile") return "makefile";
  const ext = base.includes(".") ? base.split(".").pop()! : "";
  return EXT[ext] ?? "text";
}

export const normLang = (l?: string | null): string => {
  const x = (l ?? "").trim().toLowerCase().split(/\s/)[0];
  if (!x) return "text";
  const alias: Record<string, string> = { cuda: "cpp", cu: "cpp", py: "python", sh: "bash", shell: "bash", zsh: "bash", js: "javascript", ts: "typescript", yml: "yaml", md: "markdown", "c++": "cpp", rs: "rust", tex: "latex" };
  const v = alias[x] ?? x;
  return (LANGS as readonly string[]).includes(v) ? v : "text";
};

export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** One HTML string per source line (inner HTML, no wrapper). Falls back to plain text for huge or unknown input. */
export async function highlightLines(code: string, lang: string): Promise<string[]> {
  const lines = code.replace(/\r\n?/g, "\n").split("\n");
  if (lang === "text" || lines.length > 6000 || lines.some((l) => l.length > 2500)) return lines.map(esc);
  try {
    const h = await highlighter();
    const tokens = h.codeToTokensBase(lines.join("\n"), { lang: lang as any, theme });
    return tokens.map((line) =>
      line
        .map((t) => {
          const fs = t.fontStyle ?? 0;
          const style = [t.color ? `color:${t.color}` : "", fs & 1 ? "font-style:italic" : "", fs & 2 ? "font-weight:bold" : ""].filter(Boolean).join(";");
          return style ? `<span style="${style}">${esc(t.content)}</span>` : esc(t.content);
        })
        .join(""),
    );
  } catch {
    return lines.map(esc);
  }
}

/** Highlighted fenced block for rendered markdown. */
export async function highlightBlock(code: string, lang: string): Promise<string> {
  const lines = await highlightLines(code.replace(/\n$/, ""), lang);
  return `<pre class="code" data-lang="${esc(lang)}"><code>${lines.join("\n")}</code></pre>`;
}
