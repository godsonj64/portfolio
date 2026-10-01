import "server-only";
import { Marked } from "marked";
import sanitizeHtml from "sanitize-html";
import matter from "gray-matter";
import katex from "katex";
import { esc, highlightBlock, normLang } from "./highlight";

export type MdCtx = {
  /** repo slug, enables rewriting relative links/images to /code/... and /api/raw/... */
  repo?: string;
  /** directory of the markdown file inside the repo ("" for the root) */
  dir: string;
};

function normalize(path: string): string {
  const out: string[] = [];
  for (const seg of path.split("/")) {
    if (!seg || seg === ".") continue;
    if (seg === "..") out.pop();
    else out.push(seg);
  }
  return out.join("/");
}

function resolve(href: string, ctx: MdCtx, as: "link" | "image"): string {
  if (/^(https?:|mailto:|data:image\/)/i.test(href) || href.startsWith("#")) return href;
  if (!ctx.repo) return href;
  const [p, hash] = href.split("#");
  const target = normalize(href.startsWith("/") ? p : `${ctx.dir}/${decodeURIComponent(p)}`);
  const enc = target.split("/").map(encodeURIComponent).join("/");
  return as === "image" ? `/api/raw/${ctx.repo}/${enc}` : `/code/${ctx.repo}/${enc}${hash ? `#${hash}` : ""}`;
}

const slugify = (s: string) =>
  s.toLowerCase().replace(/<[^>]+>/g, "").replace(/[^\p{L}\p{N}\s-]/gu, "").trim().replace(/\s+/g, "-");

// Math is rendered by KaTeX into placeholders and swapped in *after* sanitising, so KaTeX's markup never
// has to be allowed through the HTML sanitiser (and user HTML can never pose as math).
const slot = (i: number) => `MATHSLOT${i}ENDSLOT`;
const tex = (src: string, displayMode: boolean) =>
  katex.renderToString(src, { displayMode, throwOnError: false, output: "htmlAndMathml", strict: "ignore", trust: false });

export async function renderMarkdown(src: string, ctx: MdCtx): Promise<string> {
  const seen = new Map<string, number>();
  const math: string[] = [];
  const md = new Marked({
    extensions: [
      {
        name: "mathBlock",
        level: "block",
        start: (s: string) => { const i = s.indexOf("$$"); return i < 0 ? undefined : i; },
        tokenizer(s: string) {
          const m = /^\$\$([\s\S]+?)\$\$[^\S\n]*(?:\n|$)/.exec(s);
          if (m) return { type: "mathBlock", raw: m[0], text: m[1].trim() };
        },
        renderer(tok) {
          math.push(tex(tok.text, true));
          return `<div class="math">${slot(math.length - 1)}</div>\n`;
        },
      },
      {
        name: "mathInline",
        level: "inline",
        start: (s: string) => { const i = s.indexOf("$"); return i < 0 ? undefined : i; },
        tokenizer(s: string) {
          const d = /^\$\$([\s\S]+?)\$\$/.exec(s); // display math inside a paragraph
          if (d) return { type: "mathInline", raw: d[0], text: d[1].trim(), display: true };
          const m = /^\$(?!\s)((?:\\.|[^\\$\n])+?)(?<!\s)\$(?!\d)/.exec(s); // $x$, but not "$5 and $10"
          if (m) return { type: "mathInline", raw: m[0], text: m[1], display: false };
        },
        renderer(tok) {
          math.push(tex(tok.text, !!tok.display));
          return slot(math.length - 1);
        },
      },
    ],
    gfm: true,
    async: true,
    walkTokens: async (tok) => {
      if (tok.type === "code") (tok as any).html = await highlightBlock(tok.text, normLang(tok.lang));
    },
    renderer: {
      code(tok) {
        return (tok as any).html ?? `<pre class="code"><code>${esc(tok.text)}</code></pre>`;
      },
      heading({ tokens, depth }) {
        const inner = this.parser.parseInline(tokens);
        let id = slugify(inner);
        const n = seen.get(id) ?? 0;
        seen.set(id, n + 1);
        if (n) id = `${id}-${n}`;
        return `<h${depth} id="${id}">${inner}</h${depth}>\n`;
      },
      link({ href, title, tokens }) {
        const inner = this.parser.parseInline(tokens);
        const url = resolve(href, ctx, "link");
        return `<a href="${esc(url)}"${title ? ` title="${esc(title)}"` : ""}>${inner}</a>`;
      },
      image({ href, title, text }) {
        return `<img src="${esc(resolve(href, ctx, "image"))}" alt="${esc(text)}"${title ? ` title="${esc(title)}"` : ""} loading="lazy">`;
      },
    },
  });

  const html = (await md.parse(src)) as string;

  const clean = sanitizeHtml(html, {
    allowedTags: [
      "h1", "h2", "h3", "h4", "h5", "h6", "p", "a", "ul", "ol", "li", "blockquote", "code", "pre", "em", "strong", "del", "hr", "br",
      "table", "thead", "tbody", "tr", "th", "td", "img", "details", "summary", "span", "div", "input", "sup", "sub", "kbd", "figure", "figcaption",
    ],
    allowedAttributes: {
      a: ["href", "title", "id", "rel", "target"],
      img: ["src", "alt", "title", "width", "height", "loading"],
      pre: ["class", "data-lang"],
      code: ["class"],
      span: ["class", "style"],
      th: ["align"],
      td: ["align"],
      div: ["align", "class"],
      input: ["type", "checked", "disabled"],
      "*": ["id"],
    },
    allowedStyles: {
      span: {
        color: [/^#[0-9a-f]{3,8}$/i],
        "font-style": [/^italic$/],
        "font-weight": [/^bold$/],
      },
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: { img: ["http", "https", "data"] },
    transformTags: {
      a: (tag, attribs) => {
        const external = /^https?:/i.test(attribs.href ?? "");
        return { tagName: tag, attribs: external ? { ...attribs, rel: "noopener noreferrer", target: "_blank" } : attribs };
      },
    },
  });
  return math.length ? clean.replace(/MATHSLOT(\d+)ENDSLOT/g, (_, i) => math[Number(i)] ?? "") : clean;
}

/** Markdown file with optional YAML front matter: the front matter becomes a small key/value strip. */
export async function renderMarkdownDoc(src: string, ctx: MdCtx): Promise<{ html: string; meta: [string, string][] }> {
  let content = src;
  let meta: [string, string][] = [];
  try {
    const fm = matter(src);
    content = fm.content;
    meta = Object.entries(fm.data)
      .map(([k, v]): [string, string] => [
        k,
        Array.isArray(v) ? v.join(", ") : v instanceof Date ? v.toISOString().slice(0, 10) : typeof v === "object" && v ? JSON.stringify(v) : String(v ?? ""),
      ])
      .filter(([, v]) => v !== "");
  } catch {
    // malformed front matter: render the file as-is
  }
  return { html: await renderMarkdown(content, ctx), meta };
}
