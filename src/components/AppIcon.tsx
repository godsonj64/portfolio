import { icons } from "@/lib/art";
import { bySlug } from "@/content/projects";

export function AppIcon({ slug, size = 40 }: { slug: string; size?: number }) {
  const p = bySlug(slug)!;
  const set = icons[slug];
  const src = size <= 48 ? set["96"] : size <= 96 ? set["192"] : set["384"];
  return (
    <span className={`appicon ${p.iconStyle}`} style={{ width: size, height: size }}>
      <img src={src} alt="" width={size} height={size} decoding="async" loading="lazy" />
    </span>
  );
}
