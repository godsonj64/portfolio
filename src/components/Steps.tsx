import type { Project } from "@/content/projects";

/** How it works: a numbered rail that draws itself in as it scrolls into view. */
export function Steps({ steps }: { steps: Project["steps"] }) {
  return (
    <ol className="steps" data-reveal style={{ ["--n" as string]: steps.length }}>
      {steps.map((s, i) => (
        <li key={s.label} style={{ ["--i" as string]: i }}>
          <strong>{s.label}</strong>
          <span>{s.note}</span>
        </li>
      ))}
    </ol>
  );
}
