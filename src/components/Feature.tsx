import Link from "next/link";
import type { CSSProperties } from "react";
import { Art } from "./Art";
import { AppIcon } from "./AppIcon";
import type { Project } from "@/content/projects";

/** Split feature: the full wallpaper on one side, a bold line, copy and a pill on the other. */
export function Feature({ project: p, version }: { project: Project; version: string | null }) {
  return (
    <article className="feature" style={{ "--accent": p.accent } as CSSProperties}>
      <Link href={`/work/${p.slug}`} className="feature-art" aria-label={`${p.name} — ${p.tagline}`} data-reveal>
        <Art slug={p.slug} alt={`${p.name}: ${p.tagline}`} sizes="(min-width: 1000px) 56vw, 100vw" priority focal={p.focal} />
      </Link>
      <div className="feature-copy" data-reveal style={{ "--d": 1 } as CSSProperties}>
        <p className="label">
          <AppIcon slug={p.slug} size={30} />
          <span>{p.name} · {p.kicker}</span>
        </p>
        <h3 className="caps caps-lg">{p.headline}</h3>
        <p className="feature-text">{p.summary}</p>
        <p className="feature-meta mono">{[version && `v${version}`, p.status, p.sourceNote].filter(Boolean).join("  ·  ")}</p>
        <div className="cta">
          <Link className="pill" href={`/work/${p.slug}`}>
            <span className="pill-ico" aria-hidden>↗</span>
            Explore {p.name}
          </Link>
        </div>
      </div>
    </article>
  );
}
