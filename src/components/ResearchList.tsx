import Link from "next/link";
import type { CSSProperties } from "react";
import { RelTime } from "./RelTime";
import { RESEARCH } from "@/content/repos";
import { getRepoMeta } from "@/lib/github";

/** Published research repos, grouped. Each opens in the on-site code browser or downloads as a .zip. */
export async function ResearchList() {
  const metas = await Promise.all(RESEARCH.map((r) => getRepoMeta(r.owner, r.repo)));
  // A repo that has since been made private disappears (its code routes refuse it too).
  const rows = RESEARCH.map((r, i) => ({ r, m: metas[i] })).filter(({ m }) => !m?.private);
  const groups = [...new Set(rows.map(({ r }) => r.group))];

  return (
    <div className="research">
      {groups.map((g) => (
        <section key={g} className="rgroup" aria-label={g}>
          <p className="eyebrow rgroup-label">{g}</p>
          <ul>
            {rows
              .filter(({ r }) => r.group === g)
              .map(({ r, m }, i) => (
                <li key={r.slug} className="rrow" data-reveal style={{ "--d": i % 3 } as CSSProperties}>
                  <Link href={`/code/${r.slug}`} className="rrow-main">
                    <h3 className="caps">{r.title}</h3>
                    <div>
                      <p className="rrow-name">{r.name}</p>
                      <p className="rrow-blurb">{r.blurb}</p>
                    </div>
                  </Link>
                  <div className="rrow-side">
                    {m && (
                      <p className="mono rrow-meta">
                        {m.language && <span>{m.language}</span>}
                        <span>updated <RelTime iso={m.pushedAt} /></span>
                      </p>
                    )}
                    <div className="tools">
                      <Link className="tool" href={`/code/${r.slug}`}>Browse</Link>
                      <a className="tool" href={`/dl/code/${r.slug}`} download>.zip</a>
                    </div>
                  </div>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
