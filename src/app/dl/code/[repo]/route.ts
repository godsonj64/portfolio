import { NextResponse } from "next/server";
import { codeRepos } from "@/content/repos";
import { getHead } from "@/lib/github";

/** /dl/code/<repo> -> the repository as a .zip, straight from GitHub's codeload CDN (public repos only). */
export async function GET(_req: Request, { params }: { params: Promise<{ repo: string }> }) {
  const cfg = codeRepos[(await params).repo];
  const head = cfg && (await getHead(cfg));
  if (!cfg || !head) return new NextResponse("Not found", { status: 404 });
  return NextResponse.redirect(`https://codeload.github.com/${cfg.owner}/${cfg.repo}/zip/${head.sha}`, {
    status: 302,
    headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" },
  });
}
