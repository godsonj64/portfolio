import Link from "next/link";
import { Mark } from "./Mark";
import { RelTime } from "./RelTime";
import { getHead } from "@/lib/github";
import { LAB } from "@/content/repos";
import { site } from "@/content/site";

export async function Nav() {
  // the "Lab pushed" chip is decorative: never let a GitHub hiccup take the whole page down with it
  const head = await getHead(LAB).catch(() => null);
  return (
    <header className="nav">
      <Link href="/" className="brand" aria-label={`${site.name} — home`}>
        <Mark size={18} />
        <span>{site.name}</span>
      </Link>
      <nav aria-label="Primary" className="nav-links">
        <Link href="/#work">Work</Link>
        <Link href="/lab">Lab</Link>
        <Link href="/lab#research">Research</Link>
        <a href={site.github} target="_blank" rel="noopener noreferrer">GitHub<span aria-hidden> ↗</span></a>
      </nav>
      {head && (
        <Link href="/lab" className="sync" title="Latest push to the research lab">
          <span>Lab pushed <RelTime iso={head.date} /></span>
        </Link>
      )}
    </header>
  );
}
