import { NextResponse } from "next/server";
import { bySlug } from "@/content/projects";
import { getLatestRelease } from "@/lib/github";
import { buildsOf, resolveBuild } from "@/lib/releases";

/**
 * /dl/<project>/<build>  ->  the latest release asset.
 * <build> is a stable key ("mac-universal-installer-dmg") or an alias ("mac", "windows", "linux").
 * The visitor's browser downloads straight from GitHub's CDN; they never land on a GitHub page.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ project: string; target: string }> }) {
  const { project, target } = await params;
  const p = bySlug(project);
  if (!p?.releases) return new NextResponse("Not found", { status: 404 });
  const release = await getLatestRelease(p.releases.owner, p.releases.repo);
  const build = release && resolveBuild(buildsOf(release), target);
  if (!build || !build.asset.url.startsWith("https://github.com/")) return new NextResponse("No such build", { status: 404 });
  return NextResponse.redirect(build.asset.url, {
    status: 302,
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
