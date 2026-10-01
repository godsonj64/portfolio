import Link from "next/link";
import { Mark } from "./Mark";
import { shortDate, shortSha } from "@/lib/fmt";
import type { CommitInfo } from "@/lib/github";

/** The lab's tile: a live window onto the research repo's latest commits. */
export function LabTile({ commits, className }: { commits: CommitInfo[]; className: string }) {
  return (
    <article className={`tile ${className}`} data-reveal>
      <Link href="/lab" className="tile-link">
        <div className="tile-art lab-art">
          <div className="lab-bar mono" aria-hidden>
            <span>~/nano-lab</span>
            <span>git log</span>
          </div>
          {commits.length ? (
            <ol className="lab-feed mono">
              {commits.slice(0, 8).map((c) => (
                <li key={c.sha}>
                  <span className="sha">{shortSha(c.sha)}</span>
                  <span className="when">{shortDate(c.date)}</span>
                  <span className="msg">{c.message}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="lab-empty mono">Waiting for the first push…</p>
          )}
          <span className="lab-caret mono" aria-hidden>▍</span>
        </div>
        <div className="tile-cap">
          <span className="appicon lab-icon" aria-hidden><Mark size={15} /></span>
          <div className="tile-text">
            <h3>The Lab</h3>
            <p>Nano neural nets, in the open <span className="mono">· daily</span></p>
          </div>
          <span className="round" aria-hidden>↗</span>
        </div>
      </Link>
    </article>
  );
}
