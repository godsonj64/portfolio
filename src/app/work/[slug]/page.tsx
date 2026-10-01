import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Art } from "@/components/Art";
import { AppIcon } from "@/components/AppIcon";
import { DownloadCta, DownloadPanel, type BuildView } from "@/components/DownloadPanel";
import { Steps } from "@/components/Steps";
import { ScrollFx } from "@/components/motion/ScrollFx";
import { bySlug, projects } from "@/content/projects";
import { getLatestRelease } from "@/lib/github";
import { buildsOf, stripV } from "@/lib/releases";
import { bytes, longDate } from "@/lib/fmt";

export const revalidate = 300;

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = bySlug((await params).slug);
  if (!p) return {};
  return { title: `${p.name} — ${p.kicker}`, description: p.summary };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = bySlug((await params).slug);
  if (!p) notFound();

  const release = p.releases ? await getLatestRelease(p.releases.owner, p.releases.repo) : null;
  const builds = buildsOf(release);
  const views: BuildView[] = builds.map((b) => ({ key: b.key, os: b.os, label: b.label, sub: b.sub, size: bytes(b.asset.size), name: b.asset.name }));
  const version = release ? stripV(release.tag) : p.fallbackVersion ?? null;
  const platforms = [...new Set(builds.map((b) => b.label))];

  const i = projects.findIndex((x) => x.slug === p.slug);
  const prev = projects[(i - 1 + projects.length) % projects.length];
  const next = projects[(i + 1) % projects.length];
  const style = { "--accent": p.accent, "--accent2": p.accent2 } as CSSProperties;

  const facts: [string, string][] = [
    ["Version", version ? `v${version}` : "—"],
    ["Released", release ? longDate(release.publishedAt) : p.status],
    ["Platforms", platforms.length ? platforms.join(" · ") : "—"],
    ["Source", p.sourceNote],
  ];

  return (
    <article className="project" style={style}>
      <header className="wrap p-head">
        <Link href="/#work" className="back mono">← All work</Link>
        <div className="p-title">
          <AppIcon slug={p.slug} size={76} />
          <div>
            <p className="eyebrow">{p.kicker}</p>
            <h1 className="caps p-h1">{p.name}</h1>
          </div>
        </div>
        <p className="lede">{p.summary}</p>
        <div className="cta">
          {views.length > 0 ? <DownloadCta slug={p.slug} builds={views} /> : <span className="pill pill-ghost" aria-disabled>{p.sourceNote}</span>}
          {p.website && <a className="pill pill-ghost" href={p.website.href} target="_blank" rel="noopener noreferrer">{p.website.label} ↗</a>}
        </div>
      </header>

      <div className="wrap p-hero" data-reveal>
        <div className="p-frame">
          <ScrollFx className="p-frame-in" scale={[1.08, 1]} offset={["start end", "center center"]}>
            <Art slug={p.slug} alt={`${p.name}: ${p.tagline}`} sizes="(min-width: 1500px) 1420px, 96vw" priority focal={p.focal} />
          </ScrollFx>
        </div>
      </div>

      <dl className="wrap facts" data-reveal>
        {facts.map(([k, v]) => (
          <div key={k}>
            <dt className="eyebrow">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>

      <div className="wrap p-body">
        <div className="p-story">
          <h2 className="caps" data-reveal>{p.headline}</h2>
          {p.paragraphs.map((t, k) => (
            <p key={k} data-reveal style={{ ["--d" as string]: 1 }}>{t}</p>
          ))}
          {p.notice && <p className="notice" data-reveal><strong>Notice.</strong> {p.notice}</p>}
        </div>
        <aside className="p-aside" data-reveal style={{ ["--d" as string]: 1 }}>
          {release && views.length > 0 ? (
            <DownloadPanel slug={p.slug} builds={views} version={stripV(release.tag)} published={longDate(release.publishedAt)} />
          ) : (
            <div className="dl">
              <div className="dl-head"><p className="eyebrow">Availability</p>{version && <p className="dl-ver mono">v{version}</p>}</div>
              <p className="dl-foot" style={{ marginTop: 14 }}>
                {p.sourceNote}. There is no public installer yet; this page will show direct downloads the moment one is published.
              </p>
            </div>
          )}
        </aside>
      </div>

      <section className="wrap p-section" aria-label="How it works">
        <p className="eyebrow" data-reveal>How it works</p>
        <Steps steps={p.steps} />
      </section>

      <section className="wrap p-section" aria-label="Highlights">
        <div className="hl-grid">
          {p.highlights.map((h, k) => (
            <div key={h.title} className="hl" data-reveal style={{ ["--d" as string]: k % 2 }}>
              <h3>{h.title}</h3>
              <p>{h.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="wrap p-section stack" aria-label="Built with" data-reveal>
        <p className="eyebrow">Built with</p>
        <ul>{p.stack.map((s) => <li key={s} className="chip mono">{s}</li>)}</ul>
      </section>

      <nav className="wrap p-next" aria-label="More work">
        {[prev, next].map((n, k) => (
          <Link key={n.slug} href={`/work/${n.slug}`} className={`p-next-card ${k ? "right" : ""}`} style={{ ["--accent" as string]: n.accent }}>
            <span className="eyebrow">{k ? "Next" : "Previous"}</span>
            <strong>{n.name}</strong>
            <span>{n.kicker}</span>
            <Art slug={n.slug} alt="" sizes="(min-width: 900px) 40vw, 90vw" />
          </Link>
        ))}
      </nav>
    </article>
  );
}
