import type { Metadata } from "next";
import Link from "next/link";
import "katex/dist/katex.min.css";
import { notFound } from "next/navigation";
import { CodeView } from "@/components/CodeView";
import { CopyButton } from "@/components/CopyButton";
import { FileTree } from "@/components/FileTree";
import { RelTime } from "@/components/RelTime";
import { codeRepos } from "@/content/repos";
import { getHead, getText, getTree, listDir } from "@/lib/github";
import { highlightLines, langFor } from "@/lib/highlight";
import { renderMarkdownDoc } from "@/lib/markdown";
import { renderNotebook } from "@/lib/notebook";
import { kindOf } from "@/lib/mime";
import { bytes, shortSha } from "@/lib/fmt";
import { hrefFor, nest, rawHref } from "@/lib/tree";

export const revalidate = 120;
export const dynamicParams = true;

const MAX_PREVIEW = 700 * 1024;
const MAX_NOTEBOOK = 4 * 1024 * 1024; // notebooks carry their plots inline

export function generateStaticParams() {
  return Object.keys(codeRepos).map((repo) => ({ repo, path: [] as string[] }));
}

export async function generateMetadata({ params }: { params: Promise<{ repo: string; path?: string[] }> }): Promise<Metadata> {
  const { repo, path = [] } = await params;
  const cfg = codeRepos[repo];
  if (!cfg) return {};
  const p = path.map(decodeURIComponent).join("/");
  return { title: p ? `${p} · ${cfg.title}` : `${cfg.title} · code`, description: cfg.blurb };
}

function Meta({ pairs }: { pairs: [string, string][] }) {
  if (!pairs.length) return null;
  return (
    <dl className="fm mono">
      {pairs.map(([k, v]) => (
        <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
      ))}
    </dl>
  );
}

export default async function CodePage({ params }: { params: Promise<{ repo: string; path?: string[] }> }) {
  const { repo, path: segs = [] } = await params;
  const cfg = codeRepos[repo];
  if (!cfg) notFound();
  const head = await getHead(cfg);
  const tree = head && (await getTree(cfg, head));
  if (!head || !tree) notFound();

  const path = segs.map(decodeURIComponent).join("/");
  const entry = path ? tree.entries.find((e) => e.path === path) : null;
  if (path && !entry) notFound();
  const isDir = !path || entry!.type === "tree";

  const nodes = nest(tree.entries);
  const crumbs = path.split("/").filter(Boolean);

  // ── content
  let body: React.ReactNode = null;
  let side: React.ReactNode = null;

  if (isDir) {
    const rows = listDir(tree.entries, path);
    const readme = rows.find((r) => r.type === "blob" && /^readme\.(md|markdown)$/i.test(r.path.split("/").pop()!));
    const md = readme ? await getText(cfg, head.sha, readme.path) : null;
    const doc = md ? await renderMarkdownDoc(md, { repo, dir: path }) : null;
    body = (
      <>
        <table className="dir">
          <tbody>
            {path && (
              <tr><td colSpan={2}><Link href={hrefFor(repo, crumbs.slice(0, -1).join("/"))}>..</Link></td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.path}>
                <td><Link href={hrefFor(repo, r.path)}>{r.path.split("/").pop()}{r.type === "tree" ? "/" : ""}</Link></td>
                <td className="mono dir-size">{r.type === "blob" ? bytes(r.size) : ""}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={2} className="dir-empty">Empty.</td></tr>}
          </tbody>
        </table>
        {doc && (
          <section className="doc" aria-label="README">
            <p className="eyebrow doc-label mono">{readme!.path.split("/").pop()}</p>
            <Meta pairs={doc.meta} />
            <div className="prose" dangerouslySetInnerHTML={{ __html: doc.html }} />
          </section>
        )}
      </>
    );
    side = (
      <div className="tools">
        <a className="tool" href={path ? `/api/zip/${repo}?path=${encodeURIComponent(path)}` : `/dl/code/${repo}`} download>
          {path ? "Download folder (.zip)" : "Download repo (.zip)"}
        </a>
      </div>
    );
  } else {
    const kind = kindOf(path);
    const size = entry!.size;
    const raw = rawHref(repo, path);
    side = (
      <div className="tools">
        <a className="tool" href={raw} target="_blank" rel="noopener">Raw</a>
        <a className="tool" href={rawHref(repo, path, true)} download>Download</a>
        {(kind === "text" || kind === "markdown") && <CopyButton href={raw} />}
      </div>
    );

    if (kind === "image") {
      body = <div className="media"><img src={raw} alt={path} /></div>;
    } else if (kind === "binary") {
      body = <p className="note">Binary file · {bytes(size)}. Use Download to save it.</p>;
    } else if (size > (kind === "notebook" ? MAX_NOTEBOOK : MAX_PREVIEW)) {
      body = <p className="note">This file is {bytes(size)}, too large to preview here. Use Download or Raw.</p>;
    } else {
      const text = await getText(cfg, head.sha, path);
      if (text == null) notFound();
      const ctx = { repo, dir: path.split("/").slice(0, -1).join("/") };
      const nbHtml = kind === "notebook" ? await renderNotebook(text, ctx) : null;
      if (text.slice(0, 8000).includes("\u0000")) {
        body = <p className="note">Binary file · {bytes(size)}. Use Download to save it.</p>;
      } else if (nbHtml !== null) {
        body = <div className="doc notebook"><div className="prose nb" dangerouslySetInnerHTML={{ __html: nbHtml }} /></div>;
      } else if (kind === "markdown") {
        const doc = await renderMarkdownDoc(text, ctx);
        body = <div className="doc"><Meta pairs={doc.meta} /><div className="prose" dangerouslySetInnerHTML={{ __html: doc.html }} /></div>;
      } else {
        const lines = await highlightLines(text.replace(/\n$/, ""), langFor(path));
        body = <CodeView lines={lines} />;
      }
    }
  }

  return (
    <div className="wrap code-page">
      <header className="code-head">
        <p className="eyebrow">{repo === "nano-lab" ? "Lab notebook" : `Research${cfg.name ? ` · ${cfg.name}` : ""}`}</p>
        <h1 className="code-title">
          <Link href={hrefFor(repo, "")}>{cfg.title}</Link>
          {crumbs.map((c, i) => (
            <span key={i}>
              <i aria-hidden>/</i>
              <Link href={hrefFor(repo, crumbs.slice(0, i + 1).join("/"))}>{c}</Link>
            </span>
          ))}
        </h1>
        <p className="code-meta mono">
          <span>{head.ref}</span>
          <span>@{shortSha(head.sha)}</span>
          <span><RelTime iso={head.date} /></span>
          <span className="msg">{head.message.split("\n")[0]}</span>
        </p>
      </header>

      <div className="code-layout">
        <aside className="code-side" aria-label="Files">
          <FileTree nodes={nodes} repo={repo} current={path} />
          {tree.truncated && <p className="note">Large repository: the tree is truncated.</p>}
        </aside>
        <section className="code-main">
          <div className="code-bar">
            <span className="mono code-file">{isDir ? (path || "/") : `${bytes(entry!.size)} · ${langFor(path)}`}</span>
            {side}
          </div>
          {body}
        </section>
      </div>
    </div>
  );
}
