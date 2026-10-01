import Link from "next/link";
import type { CSSProperties } from "react";
import { Art } from "./Art";
import { AppIcon } from "./AppIcon";
import type { Project } from "@/content/projects";

/** Collage tile: the art, then a caption underneath so the artwork itself stays unobstructed. */
export function Tile({ project: p, version, className, sizes }: { project: Project; version: string | null; className: string; sizes: string }) {
  return (
    <article className={`tile ${className}`} style={{ "--accent": p.accent } as CSSProperties} data-reveal>
      <Link href={`/work/${p.slug}`} className="tile-link">
        <div className="tile-art">
          <Art slug={p.slug} alt={`${p.name}: ${p.tagline}`} sizes={sizes} focal={p.focal} />
        </div>
        <div className="tile-cap">
          <AppIcon slug={p.slug} size={36} />
          <div className="tile-text">
            <h3>{p.name}</h3>
            <p>{p.kicker} <span className="mono">· {version ? `v${version}` : p.status}</span></p>
          </div>
          <span className="round" aria-hidden>↗</span>
        </div>
      </Link>
    </article>
  );
}
