import type { TreeEntry } from "./github";

export type Node = { name: string; path: string; type: "tree" | "blob"; size: number; children: Node[] };

/** Nests the flat git tree for the sidebar. Directories first, then files, both natural-sorted. */
export function nest(entries: TreeEntry[]): Node[] {
  const roots: Node[] = [];
  const byPath = new Map<string, Node>();
  for (const e of [...entries].sort((a, b) => a.path.localeCompare(b.path))) {
    const node: Node = { name: e.path.split("/").pop()!, path: e.path, type: e.type, size: e.size, children: [] };
    byPath.set(e.path, node);
    const parent = byPath.get(e.path.slice(0, Math.max(0, e.path.lastIndexOf("/"))));
    (e.path.includes("/") && parent ? parent.children : roots).push(node);
  }
  const sort = (ns: Node[]) => {
    ns.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }) : a.type === "tree" ? -1 : 1));
    ns.forEach((n) => sort(n.children));
  };
  sort(roots);
  return roots;
}

export const hrefFor = (repo: string, path: string) =>
  `/code/${repo}${path ? "/" + path.split("/").map(encodeURIComponent).join("/") : ""}`;
export const rawHref = (repo: string, path: string, download = false) =>
  `/api/raw/${repo}/${path.split("/").map(encodeURIComponent).join("/")}${download ? "?download=1" : ""}`;
