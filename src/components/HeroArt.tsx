"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import * as m from "motion/react-m";
import { useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from "motion/react";
import manifest from "@/content/hero-manifest.json";

type Variant = { w: number; src: string; bytes: number };
type Comp = { width: number; height: number; focus: number[]; lqip: string; layers: Record<string, { avif: Variant[]; webp: Variant[] }> };
const wide = manifest.wide as Comp;
const tall = manifest.tall as Comp;
const set = (v: Variant[]) => v.map((x) => `${x.src} ${x.w}w`).join(", ");
const TALL = "(max-aspect-ratio: 4/5)";

// Back to front. `lag`: how far the layer trails the page as the hero scrolls away (% of its height;
// negative climbs ahead of it). `depth`: pointer parallax in px.
const LAYERS = [
  { name: "sky", lag: 12, depth: 4 },
  { name: "earth", lag: 6, depth: 8 },
  { name: "back", lag: 6, depth: 10 },
  { name: "rocket", lag: -10, depth: 16 },
  { name: "glow", lag: -10, depth: 16 },
  { name: "front", lag: 0, depth: 20 },
  { name: "fore", lag: 0, depth: 26 },
] as const;

/**
 * The hero backdrop: a night launch through ink-and-wash cumulus, baked offline from GLSL shaders
 * (scripts/hero) into seven parallax layers, with a wide and a tall composition.
 */
export function HeroArt() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  // the container fills the hero, so its scroll progress is the hero's
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 60, damping: 20, mass: 0.6 });
  const sy = useSpring(py, { stiffness: 60, damping: 20, mass: 0.6 });

  useEffect(() => {
    if (reduce || !window.matchMedia("(pointer: fine)").matches) return;
    const onMove = (e: PointerEvent) => {
      px.set(e.clientX / window.innerWidth - 0.5);
      py.set(e.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduce, px, py]);

  const style = {
    "--lq-wide": `url(${wide.lqip})`,
    "--lq-tall": `url(${tall.lqip})`,
    "--fx-wide": `${wide.focus[0]}%`,
    "--fy-wide": `${wide.focus[1]}%`,
    "--fx-tall": `${tall.focus[0]}%`,
    "--fy-tall": `${tall.focus[1]}%`,
  } as CSSProperties;

  return (
    <div ref={ref} className="hero-art" style={style} aria-hidden>
      {LAYERS.map((l) => (
        <Layer key={l.name} name={l.name} lag={l.lag} depth={l.depth} progress={scrollYProgress} sx={sx} sy={sy} still={!!reduce} />
      ))}
      <div className="hero-scrim" />
    </div>
  );
}

function Layer({ name, lag, depth, progress, sx, sy, still }: {
  name: string; lag: number; depth: number; progress: MotionValue<number>; sx: MotionValue<number>; sy: MotionValue<number>; still: boolean;
}) {
  const y = useTransform(progress, [0, 1], ["0%", `${lag}%`]);
  const x2 = useTransform(sx, (v) => v * -depth);
  const y2 = useTransform(sy, (v) => v * -depth * 0.5);
  const w = wide.layers[name], t = tall.layers[name];
  const first = name === "sky";
  return (
    <m.div className={`hero-layer hero-l-${name}`} style={still ? undefined : { y }}>
      <m.div className="hero-layer-in" style={still ? undefined : { x: x2, y: y2 }}>
        <picture>
          <source media={TALL} type="image/avif" srcSet={set(t.avif)} sizes="100vw" />
          <source media={TALL} type="image/webp" srcSet={set(t.webp)} sizes="100vw" />
          <source type="image/avif" srcSet={set(w.avif)} sizes="100vw" />
          <img
            src={w.webp[1].src}
            srcSet={set(w.webp)}
            sizes="100vw"
            alt=""
            width={wide.width}
            height={wide.height}
            decoding="async"
            fetchPriority={first ? "high" : "auto"}
          />
        </picture>
      </m.div>
    </m.div>
  );
}
