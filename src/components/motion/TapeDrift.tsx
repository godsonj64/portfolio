"use client";

import { useRef, type ReactNode } from "react";
import * as m from "motion/react-m";
import { useReducedMotion, useScroll, useTransform } from "motion/react";

/** Pushes a ribbon sideways as the page scrolls past, on top of its own slow marquee. */
export function TapeDrift({ children, dir }: { children: ReactNode; dir: 1 | -1 }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const x = useTransform(scrollYProgress, [0, 1], dir === 1 ? [0, -220] : [-220, 0]);
  return (
    <m.div ref={ref} style={{ x: reduce ? 0 : x }}>
      {children}
    </m.div>
  );
}
