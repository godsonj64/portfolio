import manifest from "@/content/art-manifest.json";

export type Variant = { w: number; src: string; bytes: number };
export type Wall = {
  width: number;
  height: number;
  color: string;
  lqip: string;
  variants: { avif: Variant[]; webp: Variant[] };
};

export const walls = manifest.walls as unknown as Record<string, Wall>;
export const icons = manifest.icons as unknown as Record<string, Record<string, string>>;
export const ogImage = manifest.og as string;

export const srcSet = (v: Variant[]) => v.map((x) => `${x.src} ${x.w}w`).join(", ");
