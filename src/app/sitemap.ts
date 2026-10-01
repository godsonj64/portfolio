import type { MetadataRoute } from "next";
import { projects } from "@/content/projects";
import { site } from "@/content/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: site.url, lastModified: now, priority: 1 },
    ...projects.map((p) => ({ url: `${site.url}/work/${p.slug}`, lastModified: now, priority: 0.8 })),
    { url: `${site.url}/lab`, lastModified: now, priority: 0.8, changeFrequency: "daily" as const },
    { url: `${site.url}/code/nano-lab`, lastModified: now, priority: 0.6, changeFrequency: "daily" as const },
  ];
}
