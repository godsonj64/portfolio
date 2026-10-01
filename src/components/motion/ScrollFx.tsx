"use client";

import { useRef, type ReactNode } from "react";
import * as m from "motion/react-m";
import { useReducedMotion, useScroll, useTransform, type UseScrollOptions } from "motion/react";

type Range = [number, number];
type Props = {
  children: ReactNode;
  className?: string;
  x?: Range;
  y?: Range;
  scale?: Range;
  opacity?: Range;
  offset?: UseScrollOptions["offset"];
};

/** Maps an element's own scroll progress onto transforms. Purely presentational; static under reduced motion. */
export function ScrollFx({ children, className, x, y, scale, opacity, offset = ["start end", "end start"] }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress: p } = useScroll({ target: ref, offset });
  const tx = useTransform(p, [0, 1], x ?? [0, 0]);
  const ty = useTransform(p, [0, 1], y ?? [0, 0]);
  const ts = useTransform(p, [0, 1], scale ?? [1, 1]);
  const to = useTransform(p, [0, 1], opacity ?? [1, 1]);
  if (reduce) return <div ref={ref} className={className}>{children}</div>;
  return (
    <m.div
      ref={ref}
      className={className}
      style={{ x: x ? tx : undefined, y: y ? ty : undefined, scale: scale ? ts : undefined, opacity: opacity ? to : undefined }}
    >
      {children}
    </m.div>
  );
}

/** One line of a big heading that drifts sideways as it crosses the viewport. */
export function Drift({ children, from, to, className }: { children: ReactNode; from: number; to: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const x = useTransform(scrollYProgress, [0, 1], [from, to]);
  return (
    <m.span ref={ref} className={className} style={{ display: "block", x: reduce ? 0 : x }}>
      {children}
    </m.span>
  );
}
