import type { MetadataRoute } from "next";
import { projects } from "@/content/projects";
import { site } from "@/content/site";
import { codeRepos } from "@/content/repos";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: site.url, lastModified: now, priority: 1 },
    ...projects.map((p) => ({ url: `${site.url}/work/${p.slug}`, lastModified: now, priority: 0.8 })),
    { url: `${site.url}/lab`, lastModified: now, priority: 0.8, changeFrequency: "daily" as const },
    ...Object.keys(codeRepos).map((r) => ({ url: `${site.url}/code/${r}`, lastModified: now, priority: 0.6, changeFrequency: "weekly" as const })),
  ];
}
