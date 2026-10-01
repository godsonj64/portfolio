import { NextResponse } from "next/server";
import { codeRepos } from "@/content/repos";
import { fetchRaw, getHead, getTree } from "@/lib/github";
import { mimeFor } from "@/lib/mime";

const MAX = 25 * 1024 * 1024; // bigger files are better fetched from the release feed than proxied through a function

/**
 * Serves a file from an allow-listed public repo, at the current head commit.
 * - the path must exist in the repo's git tree (no arbitrary URL fetching)
 * - active content (html, svg, js) is delivered inert: text/plain or sandboxed
 * - ?download=1 forces a save-as with the original filename
 */
export async function GET(req: Request, { params }: { params: Promise<{ repo: string; path: string[] }> }) {
  const { repo, path: segs } = await params;
  const cfg = codeRepos[repo];
  const head = cfg && (await getHead(cfg));
  const tree = cfg && head && (await getTree(cfg, head));
  if (!cfg || !head || !tree) return new NextResponse("Not found", { status: 404 });

  const path = segs.map(decodeURIComponent).join("/");
  const entry = tree.entries.find((e) => e.path === path && e.type === "blob");
  if (!entry) return new NextResponse("Not found", { status: 404 });
  if (entry.size > MAX) return new NextResponse("File too large to proxy", { status: 413 });

  const upstream = await fetchRaw(cfg, head.sha, path);
  if (!upstream?.body) return new NextResponse("Upstream error", { status: 502 });

  const download = new URL(req.url).searchParams.has("download");
  const name = path.split("/").pop()!;
  const headers = new Headers({
    "Content-Type": mimeFor(path),
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
    "Content-Disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(name)}`,
  });
  if (entry.size) headers.set("Content-Length", String(entry.size));
  return new NextResponse(upstream.body, { headers });
}
