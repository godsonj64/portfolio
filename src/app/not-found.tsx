import Link from "next/link";

export default function NotFound() {
  return (
    <section className="wrap lab-page">
      <p className="eyebrow">404</p>
      <h1 className="caps lab-h1">Off the map.</h1>
      <p className="lede">That page doesn’t exist, or it lives in a repository this site doesn’t serve.</p>
      <div className="cta">
        <Link className="pill" href="/"><span className="pill-ico" aria-hidden>↗</span>Back home</Link>
        <Link className="pill pill-ghost" href="/lab">Visit the lab</Link>
      </div>
    </section>
  );
}
