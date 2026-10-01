import "server-only";
import matter from "gray-matter";
import type { CodeRepo } from "@/content/repos";

/**
 * Thin GitHub client.
 *
 * - Every call is cached by Next's data cache and tagged `github`, so the push webhook (/api/revalidate)
 *   can expire everything at once.
 * - File bodies are fetched at an immutable commit SHA, so they cache forever and are always fresh after a push.
 * - Repos GitHub reports as private are refused outright, even if the token could read them.
 */
const API = "https://api.github.com";
export const GH_TAG = "github";
const TOKEN = process.env.GITHUB_TOKEN;

function authHeaders(): Record<string, string> {
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "portfolio-site",
    ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
  };
}

async function api<T>(path: string, revalidate = 300, tags: string[] = []): Promise<T | null> {
  try {
    const res = await fetch(API + path, { headers: authHeaders(), next: { revalidate, tags: [GH_TAG, ...tags] } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

const encodePath = (p: string) => p.split("/").map(encodeURIComponent).join("/");

/* ───────────── repo + head ───────────── */

export type RepoMeta = {
  private: boolean;
  defaultBranch: string;
  pushedAt: string;
  description: string | null;
  license: string | null;
  size: number;
};

export async function getRepoMeta(owner: string, repo: string): Promise<RepoMeta | null> {
  const r = await api<any>(`/repos/${owner}/${repo}`, 3600);
  if (!r) return null;
  return {
    private: !!r.private,
    defaultBranch: r.default_branch,
    pushedAt: r.pushed_at,
    description: r.description,
    license: r.license?.spdx_id ?? null,
    size: r.size,
  };
}

export type Head = { sha: string; treeSha: string; ref: string; message: string; date: string; author: string };

export async function getHead(cfg: CodeRepo): Promise<Head | null> {
  const meta = await getRepoMeta(cfg.owner, cfg.repo);
  if (!meta || meta.private) return null;
  const ref = cfg.ref ?? meta.defaultBranch;
  const c = await api<any>(`/repos/${cfg.owner}/${cfg.repo}/commits/${encodeURIComponent(ref)}`, 120);
  if (!c) return null;
  return {
    sha: c.sha,
    treeSha: c.commit.tree.sha,
    ref,
    message: c.commit.message,
    date: c.commit.committer?.date ?? c.commit.author?.date,
    author: c.commit.author?.name ?? cfg.owner,
  };
}

/* ───────────── tree ───────────── */

export type TreeEntry = { path: string; type: "blob" | "tree"; size: number; sha: string };

export async function getTree(cfg: CodeRepo, head: Head): Promise<{ entries: TreeEntry[]; truncated: boolean } | null> {
  const t = await api<any>(`/repos/${cfg.owner}/${cfg.repo}/git/trees/${head.treeSha}?recursive=1`, 31536000);
  if (!t) return null;
  const entries: TreeEntry[] = (t.tree as any[])
    .filter((e) => e.type === "blob" || e.type === "tree")
    .map((e) => ({ path: e.path, type: e.type, size: e.size ?? 0, sha: e.sha }));
  return { entries, truncated: !!t.truncated };
}

export function listDir(entries: TreeEntry[], dir: string): TreeEntry[] {
  const prefix = dir ? dir + "/" : "";
  const out: TreeEntry[] = [];
  for (const e of entries) {
    if (!e.path.startsWith(prefix)) continue;
    const rest = e.path.slice(prefix.length);
    if (!rest || rest.includes("/")) continue;
    out.push(e);
  }
  return out.sort((a, b) =>
    a.type === b.type ? a.path.localeCompare(b.path, undefined, { numeric: true, sensitivity: "base" }) : a.type === "tree" ? -1 : 1,
  );
}

/* ───────────── file bodies ───────────── */

export const rawUrl = (cfg: CodeRepo, sha: string, path: string) =>
  `https://raw.githubusercontent.com/${cfg.owner}/${cfg.repo}/${sha}/${encodePath(path)}`;

/** Streams a file at a pinned commit. No token is ever sent to raw.githubusercontent.com. */
export async function fetchRaw(cfg: CodeRepo, sha: string, path: string): Promise<Response | null> {
  try {
    const res = await fetch(rawUrl(cfg, sha, path), { cache: "force-cache" });
    return res.ok ? res : null;
  } catch {
    return null;
  }
}

export async function getText(cfg: CodeRepo, sha: string, path: string): Promise<string | null> {
  const res = await fetchRaw(cfg, sha, path);
  return res ? await res.text() : null;
}

/* ───────────── commits ───────────── */

export type CommitInfo = { sha: string; message: string; date: string; author: string };

export async function getCommits(cfg: CodeRepo, head: Head, perPage = 100): Promise<CommitInfo[]> {
  const list = await api<any[]>(
    `/repos/${cfg.owner}/${cfg.repo}/commits?sha=${encodeURIComponent(head.ref)}&per_page=${perPage}`,
    120,
  );
  return (list ?? []).map((c) => ({
    sha: c.sha,
    message: String(c.commit.message ?? "").split("\n")[0],
    date: c.commit.committer?.date ?? c.commit.author?.date,
    author: c.commit.author?.name ?? "",
  }));
}

/* ───────────── releases ───────────── */

export type Asset = { name: string; size: number; url: string; downloads: number };
export type Release = { tag: string; name: string; publishedAt: string; assets: Asset[] };

export async function getLatestRelease(owner: string, repo: string): Promise<Release | null> {
  const meta = await getRepoMeta(owner, repo);
  if (!meta || meta.private) return null; // never expose a private feed
  const r = await api<any>(`/repos/${owner}/${repo}/releases/latest`, 300);
  if (!r) return null;
  return {
    tag: r.tag_name,
    name: r.name || r.tag_name,
    publishedAt: r.published_at,
    assets: (r.assets as any[]).map((a) => ({ name: a.name, size: a.size, url: a.browser_download_url, downloads: a.download_count })),
  };
}

/* ───────────── the lab ───────────── */

export type LogEntry = { date: string; path: string; title: string; summary: string; tags: string[]; body: string };
export type Experiment = { slug: string; path: string; title: string; summary: string; status: string; date?: string; tags: string[] };

const asStrings = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : typeof v === "string" ? [v] : []);

function firstParagraph(md: string): string {
  const para = md
    .replace(/^#.*$/gm, "")
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .find((s) => s && !s.startsWith("```") && !s.startsWith("|") && !s.startsWith("!["));
  return (para ?? "").replace(/[*_`>#]/g, "").replace(/\s+/g, " ").slice(0, 220);
}

export async function getLogs(cfg: CodeRepo, head: Head, entries: TreeEntry[], limit = 14): Promise<LogEntry[]> {
  const files = entries
    .filter((e) => e.type === "blob" && /^log\/\d{4}-\d{2}-\d{2}[^/]*\.md$/i.test(e.path))
    .sort((a, b) => b.path.localeCompare(a.path))
    .slice(0, limit);
  const out = await Promise.all(
    files.map(async (f): Promise<LogEntry | null> => {
      const raw = await getText(cfg, head.sha, f.path);
      if (raw == null) return null;
      const fm = matter(raw);
      const date = f.path.match(/(\d{4}-\d{2}-\d{2})/)![1];
      const h1 = fm.content.match(/^#\s+(.+)$/m)?.[1];
      return {
        date,
        path: f.path,
        title: String(fm.data.title ?? h1 ?? date),
        summary: String(fm.data.summary ?? firstParagraph(fm.content)),
        tags: asStrings(fm.data.tags),
        body: fm.content,
      };
    }),
  );
  return out.filter((x): x is LogEntry => !!x);
}

export async function getExperiments(cfg: CodeRepo, head: Head, entries: TreeEntry[], limit = 24): Promise<Experiment[]> {
  const readmes = entries
    .filter((e) => e.type === "blob" && /^experiments\/[^/_.][^/]*\/readme\.md$/i.test(e.path))
    .slice(0, limit);
  const out = await Promise.all(
    readmes.map(async (f): Promise<Experiment | null> => {
      const raw = await getText(cfg, head.sha, f.path);
      if (raw == null) return null;
      const fm = matter(raw);
      const slug = f.path.split("/")[1];
      const h1 = fm.content.match(/^#\s+(.+)$/m)?.[1];
      return {
        slug,
        path: `experiments/${slug}`,
        title: String(fm.data.title ?? h1 ?? slug),
        summary: String(fm.data.summary ?? firstParagraph(fm.content)),
        status: String(fm.data.status ?? "ongoing"),
        date: fm.data.date ? new Date(fm.data.date).toISOString().slice(0, 10) : undefined,
        tags: asStrings(fm.data.tags),
      };
    }),
  );
  return out
    .filter((x): x is Experiment => !!x)
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "") || a.slug.localeCompare(b.slug));
}
