import type { Asset, Release } from "./github";

export type Os = "mac" | "windows" | "linux";
export type Arch = "arm64" | "x64" | "universal" | "any";
export type Kind = "installer" | "portable" | "archive";

export type Build = {
  key: string; // stable across versions: used by /dl/<project>/<key>
  os: Os;
  arch: Arch;
  kind: Kind;
  ext: string;
  label: string; // "macOS"
  sub: string; // "Apple Silicon · .dmg"
  asset: Asset;
};

export const OS_LABEL: Record<Os, string> = { mac: "macOS", windows: "Windows", linux: "Linux" };
const ARCH_LABEL: Record<Arch, string> = { arm64: "Apple Silicon / ARM64", x64: "x64 / Intel", universal: "Universal", any: "" };

const IGNORE = /\.(blockmap|ya?ml|sha\d*|sig|asc|txt|json|md|pdf)$/i;

export function classify(asset: Asset): Build | null {
  const n = asset.name.toLowerCase();
  if (IGNORE.test(n)) return null;
  const ext = n.match(/\.(dmg|pkg|exe|msi|appimage|deb|rpm|zip|tar\.gz)$/)?.[1];
  if (!ext) return null;

  let os: Os | null = null;
  if (/(dmg|pkg)$/.test(ext) || /\bmac|darwin|osx/.test(n)) os = "mac";
  else if (/(exe|msi)$/.test(ext) || /win/.test(n)) os = "windows";
  else if (/(appimage|deb|rpm)$/.test(ext) || /linux/.test(n)) os = "linux";
  if (!os) return null;

  let arch: Arch = "any";
  if (/universal/.test(n)) arch = "universal";
  else if (/arm64|aarch64/.test(n)) arch = "arm64";
  else if (/x64|x86_64|amd64/.test(n)) arch = "x64";
  else if (os === "windows") arch = "x64";

  const kind: Kind = /portable/.test(n) ? "portable" : ext === "zip" || ext === "tar.gz" ? "archive" : "installer";
  const key = [os, arch, kind, ext.replace(".", "")].join("-");
  const kindLabel = kind === "portable" ? "portable" : kind === "archive" ? "archive" : "installer";
  const sub = [ARCH_LABEL[arch], `.${ext} ${kindLabel}`].filter(Boolean).join(" · ");
  return { key, os, arch, kind, ext, label: OS_LABEL[os], sub, asset };
}

/** Classified, de-duplicated builds for a release, grouped by OS (mac, windows, linux order). */
export function buildsOf(release: Release | null): Build[] {
  if (!release) return [];
  const byKey = new Map<string, Build>();
  for (const a of release.assets) {
    const b = classify(a);
    if (!b) continue;
    const prev = byKey.get(b.key);
    // when two files map to one key (e.g. "Setup.exe" and a bare .exe) prefer the Setup one
    if (!prev || /setup/i.test(b.asset.name)) byKey.set(b.key, b);
  }
  const order: Os[] = ["mac", "windows", "linux"];
  const kindRank: Record<Kind, number> = { installer: 0, portable: 1, archive: 2 };
  return [...byKey.values()].sort(
    (a, b) => order.indexOf(a.os) - order.indexOf(b.os) || kindRank[a.kind] - kindRank[b.kind] || a.arch.localeCompare(b.arch),
  );
}

/** Resolve /dl/<project>/<target>: an exact key, or a short alias like "mac" / "windows" / "linux". */
export function resolveBuild(builds: Build[], target: string): Build | null {
  const t = target.toLowerCase();
  const exact = builds.find((b) => b.key === t);
  if (exact) return exact;
  if (t === "mac" || t === "macos" || t === "windows" || t === "win" || t === "linux") {
    const os: Os = t.startsWith("mac") ? "mac" : t.startsWith("win") ? "windows" : "linux";
    const pool = builds.filter((b) => b.os === os);
    return pool.find((b) => b.kind === "installer") ?? pool[0] ?? null;
  }
  return null;
}

export const stripV = (tag: string) => tag.replace(/^v/i, "");
