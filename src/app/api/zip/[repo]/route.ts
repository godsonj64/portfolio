import { NextResponse } from "next/server";
import { zipSync } from "fflate";
import { codeRepos } from "@/content/repos";
import { fetchRaw, getHead, getTree } from "@/lib/github";
import { isCompressible } from "@/lib/mime";

export const maxDuration = 60;

const MAX_FILES = 600;
const MAX_BYTES = 60 * 1024 * 1024;

/** /api/zip/<repo>?path=experiments/foo  ->  that folder as a .zip. (The whole repo uses /dl/code/<repo>.) */
export async function GET(req: Request, { params }: { params: Promise<{ repo: string }> }) {
  const cfg = codeRepos[(await params).repo];
  const head = cfg && (await getHead(cfg));
  const tree = cfg && head && (await getTree(cfg, head));
  if (!cfg || !head || !tree) return new NextResponse("Not found", { status: 404 });

  const dir = (new URL(req.url).searchParams.get("path") ?? "").replace(/^\/+|\/+$/g, "");
  const prefix = dir ? dir + "/" : "";
  if (dir && !tree.entries.some((e) => e.type === "tree" && e.path === dir)) return new NextResponse("No such folder", { status: 404 });

  const files = tree.entries.filter((e) => e.type === "blob" && e.path.startsWith(prefix));
  const total = files.reduce((n, f) => n + f.size, 0);
  if (!files.length) return new NextResponse("Empty folder", { status: 404 });
  if (files.length > MAX_FILES || total > MAX_BYTES)
    return new NextResponse(`Folder too large to zip here (${files.length} files, ${(total / 1048576).toFixed(0)} MB). Use the full-repo download.`, { status: 413 });

  const out: Record<string, [Uint8Array, { level: 0 | 6 }]> = {};
  let next = 0;
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      while (next < files.length) {
        const f = files[next++];
        const res = await fetchRaw(cfg, head.sha, f.path);
        if (!res) continue;
        out[f.path.slice(prefix.length)] = [new Uint8Array(await res.arrayBuffer()), { level: isCompressible(f.path) ? 6 : 0 }];
      }
    }),
  );
  const base = `${cfg.repo}${dir ? "-" + dir.replace(/\//g, "-") : ""}`;
  const zip = zipSync(Object.fromEntries(Object.entries(out).map(([k, v]) => [`${base}/${k}`, v])));
  return new NextResponse(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${base}.zip"`,
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
