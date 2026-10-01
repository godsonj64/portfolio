import type { CSSProperties } from "react";
import { icons } from "@/lib/art";
import { projects } from "@/content/projects";

/**
 * Two crossing tapes: project names on a light band, each project's own tagline on a band of its colour.
 * Decorative (the same names and lines appear elsewhere as real content), so hidden from assistive tech.
 */
export function Ribbons() {
  const names = [...projects, ...projects];
  return (
    <section className="ribbons" aria-hidden>
      <div className="tape tape-b">
        <div className="tape-track">
          {names.map((p, i) => (
            <span key={i} className="tape-item" style={{ "--accent": p.accent } as CSSProperties}>
              {p.tagline.replace(/\.$/, "")}
            </span>
          ))}
        </div>
      </div>
      <div className="tape tape-a">
        <div className="tape-track">
          {names.map((p, i) => (
            <span key={i} className="tape-item">
              <img src={icons[p.slug]["96"]} alt="" width={26} height={26} loading="lazy" decoding="async" />
              {p.name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
