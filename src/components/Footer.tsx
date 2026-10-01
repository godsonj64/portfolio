import Link from "next/link";
import { Figure } from "./Figure";
import { projects } from "@/content/projects";
import { site } from "@/content/site";

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-sky" aria-hidden>
        <div className="horizon" />
        <Figure height={34} className="footer-figure" />
      </div>
      <div className="wrap footer-grid">
        <div>
          <p className="footer-name">{site.name}</p>
          <p className="footer-note">Software that runs on your machine.</p>
        </div>
        <nav aria-label="Projects">
          <p className="eyebrow">Work</p>
          <ul>
            {projects.map((p) => (
              <li key={p.slug}><Link href={`/work/${p.slug}`}>{p.name}</Link></li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Lab">
          <p className="eyebrow">Lab</p>
          <ul>
            <li><Link href="/lab#research">Research</Link></li>
            <li><Link href="/lab">Daily log</Link></li>
            <li><Link href="/code/nano-lab">Lab notebook</Link></li>
            <li><Link href="/dl/code/nano-lab" prefetch={false}>Download .zip</Link></li>
          </ul>
        </nav>
        {site.email && (
          <nav aria-label="Contact">
            <p className="eyebrow">Contact</p>
            <ul>
              <li><a href={`mailto:${site.email}`}>{site.email}</a></li>
            </ul>
          </nav>
        )}
      </div>
      <div className="wrap footer-base">
        <span>© {new Date().getFullYear()} {site.name}</span>
        <span>Built with Next.js</span>
      </div>
    </footer>
  );
}
