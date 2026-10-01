import { walls, srcSet } from "@/lib/art";

type Props = {
  slug: string;
  alt: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
  focal?: string;
};

/** The wallpaper, exactly as supplied: AVIF -> WebP, native 1672px max, with a blurred placeholder underneath. */
export function Art({ slug, alt, sizes = "100vw", priority = false, className, focal = "50% 50%" }: Props) {
  const w = walls[slug];
  const fallback = w.variants.webp.find((v) => v.w === 828) ?? w.variants.webp[0];
  return (
    <picture className={className}>
      <source type="image/avif" srcSet={srcSet(w.variants.avif)} sizes={sizes} />
      <source type="image/webp" srcSet={srcSet(w.variants.webp)} sizes={sizes} />
      <img
        src={fallback.src}
        alt={alt}
        width={w.width}
        height={w.height}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        decoding="async"
        style={{ objectPosition: focal, backgroundColor: w.color, backgroundImage: `url(${w.lqip})`, backgroundSize: "cover" }}
      />
    </picture>
  );
}
