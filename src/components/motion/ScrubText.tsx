"use client";

import { useRef } from "react";
import * as m from "motion/react-m";
import { useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";

function Word({ text, progress, range }: { text: string; progress: MotionValue<number>; range: [number, number] }) {
  const opacity = useTransform(progress, range, [0.2, 1]);
  return (
    <>
      <m.span style={{ opacity }}>{text}</m.span>{" "}
    </>
  );
}

/** Words light up one by one as the paragraph scrolls through the viewport. */
export function ScrubText({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.92", "start 0.5"] });
  if (reduce) return <p ref={ref} className={className}>{text}</p>;
  const words = text.split(" ");
  return (
    <p ref={ref} className={className} aria-label={text}>
      <span aria-hidden>
        {words.map((w, i) => (
          <Word key={i} text={w} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]} />
        ))}
      </span>
    </p>
  );
}
