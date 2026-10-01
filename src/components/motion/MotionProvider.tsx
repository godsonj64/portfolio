"use client";

import { useEffect, type ReactNode } from "react";
import { LazyMotion, domAnimation } from "motion/react";
import Lenis from "lenis";

/** Lazy-loaded Motion features + Lenis smooth scrolling (off for reduced motion, paused while the loader is up). */
export function MotionProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
      autoRaf: true,
      anchors: { offset: -84 },
      allowNestedScroll: true,
      stopInertiaOnNavigate: true,
    });
    const html = document.documentElement;
    const sync = () => (html.classList.contains("loading") ? lenis.stop() : lenis.start());
    const mo = new MutationObserver(sync);
    mo.observe(html, { attributes: true, attributeFilter: ["class"] });
    sync();
    return () => { mo.disconnect(); lenis.destroy(); };
  }, []);

  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  );
}
