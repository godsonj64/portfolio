import "server-only";
import { esc, highlightBlock, normLang } from "./highlight";
import { renderMarkdown, type MdCtx } from "./markdown";

const ANSI = /\u001b\[[0-9;]*[A-Za-z]/g;
const BASE64 = /^[A-Za-z0-9+/=\s]+$/;
const text = (v: unknown) => (Array.isArray(v) ? v.join("") : typeof v === "string" ? v : "");

/**
 * Renders a Jupyter notebook as static HTML: markdown cells (sanitised), highlighted code cells, and their
 * text / PNG / JPEG outputs. Rich HTML and JavaScript outputs are deliberately not rendered.
 */
export async function renderNotebook(json: string, ctx: MdCtx): Promise<string | null> {
  let nb: any;
  try { nb = JSON.parse(json); } catch { return null; }
  const cells: any[] = nb?.cells ?? nb?.worksheets?.[0]?.cells;
  if (!Array.isArray(cells)) return null;
  const lang = normLang(nb.metadata?.kernelspec?.language ?? nb.metadata?.language_info?.name ?? "python");

  const parts: string[] = [];
  for (const cell of cells) {
    const src = text(cell.source ?? cell.input);
    if (cell.cell_type === "markdown") {
      if (src.trim()) parts.push(`<div class="nb-md">${await renderMarkdown(src, ctx)}</div>`);
      continue;
    }
    if (cell.cell_type !== "code") continue;
    const n = cell.execution_count ?? cell.prompt_number;
    parts.push(`<div class="nb-cell"><span class="nb-in">In [${n ?? " "}]</span>${await highlightBlock(src, lang)}`);
    for (const out of cell.outputs ?? []) {
      const data = out.data ?? {};
      if (out.output_type === "stream") {
        parts.push(`<pre class="nb-out${out.name === "stderr" ? " err" : ""}">${esc(text(out.text).replace(ANSI, ""))}</pre>`);
      } else if (out.output_type === "error") {
        parts.push(`<pre class="nb-out err">${esc(text(out.traceback?.join?.("\n") ?? `${out.ename}: ${out.evalue}`).replace(ANSI, ""))}</pre>`);
      } else {
        const img = ["image/png", "image/jpeg"].find((t) => typeof text(data[t]) === "string" && text(data[t]) && BASE64.test(text(data[t])));
        if (img) parts.push(`<div class="nb-img"><img alt="Cell output" loading="lazy" src="data:${img};base64,${text(data[img]).replace(/\s/g, "")}"></div>`);
        else if (data["text/plain"]) parts.push(`<pre class="nb-out">${esc(text(data["text/plain"]))}</pre>`);
      }
    }
    parts.push("</div>");
  }
  return parts.join("\n");
}
