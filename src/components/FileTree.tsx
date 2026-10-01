import Link from "next/link";
import type { Node } from "@/lib/tree";
import { hrefFor } from "@/lib/tree";

function Branch({ nodes, repo, current, depth = 0 }: { nodes: Node[]; repo: string; current: string; depth?: number }) {
  return (
    <ul className="ft" role={depth ? "group" : "tree"}>
      {nodes.map((n) =>
        n.type === "tree" ? (
          <li key={n.path}>
            <details open={current === n.path || current.startsWith(n.path + "/") || depth === 0 && n.children.length < 6}>
              <summary><span className="ft-ico" aria-hidden>▸</span>{n.name}</summary>
              <Branch nodes={n.children} repo={repo} current={current} depth={depth + 1} />
            </details>
          </li>
        ) : (
          <li key={n.path}>
            <Link href={hrefFor(repo, n.path)} className={current === n.path ? "on" : ""} aria-current={current === n.path ? "page" : undefined}>
              {n.name}
            </Link>
          </li>
        ),
      )}
    </ul>
  );
}

export function FileTree({ nodes, repo, current }: { nodes: Node[]; repo: string; current: string }) {
  return (
    <nav className="tree" aria-label="Repository files">
      <Branch nodes={nodes} repo={repo} current={current} />
    </nav>
  );
}
