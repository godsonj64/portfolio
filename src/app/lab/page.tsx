import type { Metadata } from "next";
import Link from "next/link";
import { RelTime } from "@/components/RelTime";
import { LAB } from "@/content/repos";
import { getCommits, getExperiments, getHead, getLogs, getTree, type CommitInfo } from "@/lib/github";
import { renderMarkdown } from "@/lib/markdown";
import { dayKey, dayLabel, longDate, shortSha } from "@/lib/fmt";

export const revalidate = 120;
export const metadata: Metadata = {
  title: "The Lab — nano neural nets, in the open",
  description: "Open research on very small neural networks: experiments, code and a daily log, browsable and downloadable from this site.",
};

function groupByDay(commits: CommitInfo[]) {
  const days = new Map<string, CommitInfo[]>();
  for (const c of commits) {
    const k = dayKey(c.date);
    days.set(k, [...(days.get(k) ?? []), c]);
  }
  return [...days.entries()];
}

export default async function Lab() {
  const head = await getHead(LAB);
  const tree = head && (await getTree(LAB, head));

  if (!head || !tree) {
    return (
      <section className="wrap lab-page">
        <p className="eyebrow">The Lab</p>
        <h1 className="caps lab-h1">Opening soon.</h1>
        <p className="lede">The research repository hasn’t been pushed yet. The moment it is, this page fills itself: daily log, experiments and every file, browsable and downloadable right here.</p>
        <div className="cta"><Link className="pill pill-ghost" href="/">Back home</Link></div>
      </section>
    );
  }

  const [logs, experiments, commits] = await Promise.all([
    getLogs(LAB, head, tree.entries, 30),
    getExperiments(LAB, head, tree.entries),
    getCommits(LAB, head, 100),
  ]);
  const latest = logs[0];
  const latestHtml = latest ? await renderMarkdown(latest.body, { repo: LAB.slug, dir: "log" }) : null;
  const files = tree.entries.filter((e) => e.type === "blob").length;
  const days = groupByDay(commits);

  const stats: [string, React.ReactNode][] = [
    ["Last push", <RelTime key="t" iso={head.date} />],
    ["Commits", commits.length >= 100 ? "100+" : String(commits.length)],
    ["Experiments", String(experiments.length)],
    ["Log entries", String(logs.length)],
    ["Files", String(files)],
  ];

  return (
    <div className="lab-page">
      <header className="wrap lab-head">
        <p className="eyebrow">The Lab</p>
        <h1 className="caps lab-h1">Nano neural nets, in the open.</h1>
        <p className="lede">
          Experiments on very small neural networks. Everything is here: read the daily log, open any file, or take the whole repository with you. No detour through GitHub.
        </p>
        <div className="cta">
          <Link className="pill" href="/code/nano-lab"><span className="pill-ico" aria-hidden>↗</span>Browse the code</Link>
          <a className="pill pill-ghost" href="/dl/code/nano-lab" download>Download repo (.zip)</a>
        </div>
        <dl className="stats">
          {stats.map(([k, v]) => (
            <div key={k}><dt className="eyebrow">{k}</dt><dd className="mono">{v}</dd></div>
          ))}
        </dl>
      </header>

      {latest && latestHtml && (
        <section className="wrap lab-section" aria-labelledby="latest-title" data-reveal>
          <header className="lab-sec-head">
            <p className="eyebrow">Latest log</p>
            <h2 id="latest-title" className="h3">{latest.title}</h2>
            <p className="mono lab-date">{longDate(latest.date)} · <Link href={`/code/nano-lab/${latest.path}`}>open file</Link></p>
          </header>
          <div className="doc"><div className="prose" dangerouslySetInnerHTML={{ __html: latestHtml }} /></div>
        </section>
      )}

      {experiments.length > 0 && (
        <section className="wrap lab-section" aria-labelledby="exp-title">
          <header className="lab-sec-head" data-reveal>
            <p className="eyebrow">Experiments</p>
            <h2 id="exp-title" className="h3">{experiments.length} so far</h2>
          </header>
          <div className="exp-grid">
            {experiments.map((e, i) => (
              <Link key={e.slug} href={`/code/nano-lab/${e.path}`} className="exp" data-reveal style={{ ["--d" as string]: i % 3 }}>
                <span className="exp-top mono"><i className={`st st-${e.status.toLowerCase().replace(/\W+/g, "-")}`} />{e.status}{e.date && <time dateTime={e.date}> · {longDate(e.date)}</time>}</span>
                <strong>{e.title}</strong>
                <span className="exp-sum">{e.summary}</span>
                {e.tags.length > 0 && <span className="exp-tags mono">{e.tags.map((t) => <em key={t}>{t}</em>)}</span>}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="wrap lab-section lab-cols" aria-labelledby="tl-title">
        <div>
          <header className="lab-sec-head" data-reveal>
            <p className="eyebrow">Daily log</p>
            <h2 id="tl-title" className="h3">One entry a day</h2>
          </header>
          {logs.length ? (
            <ol className="log-list" data-reveal>
              {logs.map((l) => (
                <li key={l.path}>
                  <Link href={`/code/nano-lab/${l.path}`}>
                    <time className="mono" dateTime={l.date}>{longDate(l.date)}</time>
                    <strong>{l.title}</strong>
                    {l.summary && <span>{l.summary}</span>}
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <p className="note" data-reveal>No log entries yet. Add <code>log/YYYY-MM-DD.md</code> and push.</p>
          )}
        </div>
        <div>
          <header className="lab-sec-head" data-reveal>
            <p className="eyebrow">Activity</p>
            <h2 className="h3">Commits by day</h2>
          </header>
          <ol className="activity" data-reveal>
            {days.slice(0, 14).map(([day, cs]) => (
              <li key={day}>
                <p className="mono">{dayLabel(day)}</p>
                <ul>
                  {cs.slice(0, 6).map((c) => (
                    <li key={c.sha}><Link href="/code/nano-lab"><span className="mono sha">{shortSha(c.sha)}</span>{c.message}</Link></li>
                  ))}
                  {cs.length > 6 && <li className="more mono">+{cs.length - 6} more</li>}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}
