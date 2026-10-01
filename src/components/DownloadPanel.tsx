"use client";

import { useEffect, useState } from "react";

export type BuildView = { key: string; os: "mac" | "windows" | "linux"; label: string; sub: string; size: string; name: string };
type Os = BuildView["os"];

function detectOs(): Os | null {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|Android/i.test(ua)) return null;
  if (/Mac/i.test(ua)) return "mac";
  if (/Win/i.test(ua)) return "windows";
  if (/Linux|X11/i.test(ua)) return "linux";
  return null;
}

/** Direct download buttons. Links go to /dl/<project>/<build>, which resolves the latest release and starts the download. */
export function DownloadPanel({ slug, builds, version, published }: { slug: string; builds: BuildView[]; version: string; published: string }) {
  const [os, setOs] = useState<Os | null>(null);
  useEffect(() => setOs(detectOs()), []);

  const groups = (["mac", "windows", "linux"] as Os[])
    .map((o) => ({ os: o, items: builds.filter((b) => b.os === o) }))
    .filter((g) => g.items.length)
    .sort((a, b) => (a.os === os ? -1 : b.os === os ? 1 : 0));

  return (
    <div className="dl">
      <div className="dl-head">
        <p className="eyebrow">Download</p>
        <p className="dl-ver mono">v{version} <span>· {published}</span></p>
      </div>
      {groups.map((g) => (
        <div key={g.os} className={`dl-group ${g.os === os ? "rec" : ""}`}>
          <p className="dl-os">
            {g.items[0].label}
            {g.os === os && <em className="mono">Your system</em>}
          </p>
          {g.items.map((b) => (
            <a key={b.key} className="dl-btn" href={`/dl/${slug}/${b.key}`} download={b.name}>
              <span className="dl-btn-main">
                <strong>{b.sub.split(" · ")[0] || b.label}</strong>
                <small>{b.sub.split(" · ").slice(1).join(" · ")}</small>
              </span>
              <span className="dl-size mono">{b.size}</span>
              <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M10 3v10m0 0 4-4m-4 4-4-4M4 17h12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </a>
          ))}
        </div>
      ))}
      <p className="dl-foot">Direct downloads, hosted on GitHub Releases. The links always point at the latest version.</p>
    </div>
  );
}

/** Header call-to-action: picks the visitor's OS, falls back to the first build. */
export function DownloadCta({ slug, builds }: { slug: string; builds: BuildView[] }) {
  const [os, setOs] = useState<Os | null>(null);
  useEffect(() => setOs(detectOs()), []);
  const pick = builds.find((b) => b.os === os && /installer/.test(b.sub)) ?? builds.find((b) => b.os === os) ?? builds[0];
  if (!pick) return null;
  return (
    <a className="pill" href={`/dl/${slug}/${pick.key}`} download={pick.name}>
      <span className="pill-ico" aria-hidden>↓</span>
      Download for {pick.label}
    </a>
  );
}
