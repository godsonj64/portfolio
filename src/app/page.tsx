import Link from "next/link";
import { HeroArt } from "@/components/HeroArt";
import { Ribbons } from "@/components/Ribbons";
import { Feature } from "@/components/Feature";
import { Tile } from "@/components/Tile";
import { LabTile } from "@/components/LabTile";
import { RelTime } from "@/components/RelTime";
import { Drift, ScrollFx } from "@/components/motion/ScrollFx";
import { ScrubText } from "@/components/motion/ScrubText";
import { Mark } from "@/components/Mark";
import { projects, bySlug } from "@/content/projects";
import { LAB, RESEARCH } from "@/content/repos";
import { icons } from "@/lib/art";
import { getCommits, getHead, getLatestRelease, getLogs, getTree } from "@/lib/github";
import { stripV } from "@/lib/releases";
import { longDate, shortSha } from "@/lib/fmt";
import { site } from "@/content/site";

export const revalidate = 300;

const thesis = [
  { title: "Local by default", body: "Models, files and data stay on your machine. No account, no cloud round-trip, unless you choose a provider yourself." },
  { title: "Small models, real work", body: "A 3B-parameter coder, an on-device speech engine, a local resume scorer: capable models sized for a laptop." },
  { title: "Shipped in the open", body: "Installers are public, source is open where it can be, and the research lab is pushed to daily." },
];

// Collage placement, in the order the tiles appear.
const collage = [
  { slug: "timbre", cls: "m1", sizes: "(min-width: 1000px) 24vw, (min-width: 640px) 48vw, 100vw" },
  { slug: "electroplate", cls: "m2", sizes: "(min-width: 1000px) 48vw, 100vw" },
  { slug: "axio", cls: "m3", sizes: "(min-width: 1000px) 24vw, (min-width: 640px) 48vw, 100vw" },
  { slug: "talenta", cls: "m4", sizes: "(min-width: 1000px) 48vw, 100vw" },
];

export default async function Home() {
  const releases = await Promise.all(projects.map((p) => (p.releases ? getLatestRelease(p.releases.owner, p.releases.repo) : null)));
  const version = (slug: string) => {
    const i = projects.findIndex((p) => p.slug === slug);
    return releases[i] ? stripV(releases[i]!.tag) : projects[i].fallbackVersion ?? null;
  };
  const head = await getHead(LAB);
  const [commits, tree] = head ? await Promise.all([getCommits(LAB, head, 10), getTree(LAB, head)]) : [[], null];
  const logs = head && tree ? await getLogs(LAB, head, tree.entries, 4) : [];
  const featured = projects[0];

  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <HeroArt />

        <div className="wrap hero-copy">
          <ScrollFx y={[0, -90]} opacity={[1, 0]} scale={[1, 0.97]} offset={["start start", "end start"]}>
          <p className="eyebrow reveal-line" style={{ ["--i" as string]: 0 }}>{site.name} · Portfolio</p>
          <h1 id="hero-title" className="display">
            <span className="line"><span style={{ ["--i" as string]: 1 }}>Software that</span></span>
            <span className="line"><span style={{ ["--i" as string]: 2 }}>runs on</span></span>
            <span className="line"><span style={{ ["--i" as string]: 3 }} className="grad">your machine.</span></span>
          </h1>
          <p className="lede reveal-line" style={{ ["--i" as string]: 5 }}>
            Five desktop products and an open research lab for very small neural networks. Everything here runs locally: your files, your models, your data.
          </p>
          <div className="cta reveal-line" style={{ ["--i" as string]: 6 }}>
            <a className="pill" href="#work"><span className="pill-ico" aria-hidden>↓</span>See the work</a>
            <Link className="pill pill-ghost" href="/lab">Enter the lab</Link>
          </div>
          </ScrollFx>
        </div>

        <div className="wrap hero-base">
          <ul className="ticker mono" aria-label="Latest releases">
            {projects.map((p) => (
              <li key={p.slug}>
                <Link href={`/work/${p.slug}`}>
                  <img src={icons[p.slug]["96"]} alt="" width={18} height={18} />
                  <span>{p.name}</span>
                  <b>{version(p.slug) ? `v${version(p.slug)}` : p.status}</b>
                </Link>
              </li>
            ))}
          </ul>
          <span className="scroll mono" aria-hidden>Scroll</span>
        </div>
      </section>

      <Ribbons />

      <section id="work" className="section wrap" aria-labelledby="work-title">
        <header className="bighead" data-reveal>
          <h2 id="work-title" className="caps">
            <Drift from={-36} to={36}>Selected</Drift>
            <Drift from={36} to={-36} className="indent">work</Drift>
          </h2>
          <p className="bighead-note">Five products and one open lab. Every one of them runs on your own machine.</p>
        </header>

        <Feature project={featured} version={version(featured.slug)} />

        <div className="mosaic">
          {collage.map((c) => (
            <Tile key={c.slug} project={bySlug(c.slug)!} version={version(c.slug)} className={c.cls} sizes={c.sizes} />
          ))}
          <LabTile commits={commits} className="m5" />
        </div>
      </section>

      <section className="section wrap thesis" aria-label="Principles">
        {thesis.map((t, i) => (
          <div key={t.title} data-reveal style={{ ["--d" as string]: i }}>
            <h3 className="caps">{t.title}</h3>
            <ScrubText text={t.body} />
          </div>
        ))}
      </section>

      <section className="wrap banner-wrap" aria-labelledby="lab-title">
        <div className="banner" data-reveal>
          <div className="banner-copy">
            <p className="label dark">The Lab · open research</p>
            <h2 id="lab-title" className="caps">Nano neural nets, in the open.</h2>
            <p>
              New architectures, memory models and low-bit compression for very small neural networks, plus a daily lab notebook. Every file is browsable and downloadable right here, with no detour through GitHub.
            </p>
            <ul className="rchips" aria-label="Research">
              {RESEARCH.map((r) => (
                <li key={r.slug}><Link href={`/code/${r.slug}`}>{r.title}</Link></li>
              ))}
            </ul>
            <div className="cta">
              <Link className="pill pill-dark" href="/lab"><span className="pill-ico" aria-hidden>↗</span>Open the lab</Link>
              <Link className="pill pill-line" href="/lab#research">All research</Link>
            </div>
          </div>
          <div className="banner-panel">
            <p className="panel-bar mono"><span>~/nano-lab</span><span>{head ? `@${shortSha(head.sha)}` : "not pushed yet"}</span></p>
            <ol className="panel-list">
              {logs.length > 0
                ? logs.map((l) => (
                    <li key={l.path}>
                      <Link href={`/code/nano-lab/${l.path}`}>
                        <time className="mono" dateTime={l.date}>{longDate(l.date)}</time>
                        <strong>{l.title}</strong>
                      </Link>
                    </li>
                  ))
                : commits.slice(0, 4).map((c) => (
                    <li key={c.sha}>
                      <Link href="/lab">
                        <time className="mono" dateTime={c.date}><RelTime iso={c.date} /></time>
                        <strong>{c.message}</strong>
                      </Link>
                    </li>
                  ))}
              {logs.length === 0 && commits.length === 0 && (
                <li className="panel-empty mono">The first log lands with the first push.</li>
              )}
            </ol>
            <div className="panel-mark" aria-hidden><Mark size={34} /></div>
          </div>
        </div>
      </section>
    </>
  );
}
