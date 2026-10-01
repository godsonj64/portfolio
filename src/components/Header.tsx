"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import * as m from "motion/react-m";
import { AnimatePresence, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { RelTime } from "./RelTime";

/**
 * Dynamic header, after greymac.com: a black notch hangs from the top edge holding the ∞ mark, which traces
 * itself as you scroll. Hover, focus or tap the notch and it widens to reveal the navigation. The name and the
 * lab chip step out of the way while you scroll down and come back when you scroll up.
 */
const LEFT = [
  { href: "/", label: "Home" },
  { href: "/#work", label: "Work" },
];
const RIGHT = [
  { href: "/lab", label: "Lab" },
  { href: "/lab#research", label: "Research" },
];
const MARK = "M32 20c-5.2-7.4-9.6-10.6-14.2-10.6C12.4 9.4 8.6 14 8.6 20s3.8 10.6 9.2 10.6c4.6 0 9-3.2 14.2-10.6s9.6-10.6 14.2-10.6c5.4 0 9.2 4.6 9.2 10.6s-3.8 10.6-9.2 10.6c-4.6 0-9-3.2-14.2-10.6Z";
const spring = { type: "spring", stiffness: 420, damping: 36, mass: 0.7 } as const;

function Shoulder({ flip = false }: { flip?: boolean }) {
  return (
    <svg className={`shoulder${flip ? " flip" : ""}`} viewBox="0 0 28 36" width="28" height="36" aria-hidden>
      <path d="M0 0H28V36H24C17 36 13.5 32 11.5 25L8 12C6.5 5 4 0 0 0Z" fill="#000" />
      <path d="M0 .5C4 .5 6.5 5 8 12l3.5 13c2 7 5.5 10.5 12.5 10.5H28" fill="none" stroke="rgba(255,255,255,.13)" />
    </svg>
  );
}

export function Header({ name, pushedIso }: { name: string; pushedIso: string | null }) {
  const reduce = useReducedMotion();
  const { scrollY, scrollYProgress } = useScroll();
  const eased = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });
  const trace = useTransform(eased, (v) => 0.05 + v * 0.95);
  const [away, setAway] = useState(false);
  const [open, setOpen] = useState(false);
  const touch = useRef(false);
  const notch = useRef<HTMLDivElement>(null);

  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    if (y < 140) setAway(false);
    else if (y > prev + 4) setAway(true);
    else if (y < prev - 4) setAway(false);
    if (touch.current && Math.abs(y - prev) > 3) setOpen(false);
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: PointerEvent) => { if (!notch.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("pointerdown", onDown); };
  }, []);

  const sides = { opacity: away ? 0 : 1, y: away ? -16 : 0 };
  const links = (items: typeof LEFT, side: "l" | "r") => (
    <m.ul
      key={side}
      className="notch-links"
      initial={{ opacity: 0, x: side === "l" ? 10 : -10 }}
      animate={{ opacity: 1, x: 0, transition: { delay: 0.06 } }}
      exit={{ opacity: 0, x: side === "l" ? 10 : -10, transition: { duration: 0.12 } }}
    >
      {items.map((l) => (
        <li key={l.href}><Link href={l.href} onClick={() => setOpen(false)}>{l.label}</Link></li>
      ))}
    </m.ul>
  );

  return (
    <header className="hdr">
      <m.div className="hdr-shade" aria-hidden initial={false} animate={{ opacity: away ? 0 : 1 }} transition={{ duration: 0.4 }} />

      <m.div className="hdr-side" initial={false} animate={sides} transition={spring}>
        <Link href="/" className="brand">{name}</Link>
      </m.div>

      <div
        ref={notch}
        className="notch"
        onPointerEnter={(e) => { touch.current = e.pointerType !== "mouse"; if (!touch.current) setOpen(true); }}
        onPointerLeave={(e) => { if (e.pointerType === "mouse") setOpen(false); }}
        onFocus={() => setOpen(true)}
        onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false); }}
      >
        <Shoulder />
        <m.nav
          className="notch-mid"
          aria-label="Primary"
          initial={false}
          animate={{ width: open ? "auto" : 76 }}
          transition={reduce ? { duration: 0 } : spring}
        >
          <AnimatePresence initial={false}>{open && links(LEFT, "l")}</AnimatePresence>
          <Link
            href="/"
            className="notch-mark"
            aria-label="Home"
            aria-expanded={open}
            onPointerDown={(e) => { touch.current = e.pointerType !== "mouse"; }}
            onClick={(e) => { if (touch.current && !open) { e.preventDefault(); setOpen(true); } }}
          >
            <svg viewBox="0 0 64 40" width="34" height="21" aria-hidden>
              <defs>
                <linearGradient id="notch-trace" x1="2" y1="0" x2="62" y2="0" gradientUnits="userSpaceOnUse">
                  <stop offset="0" stopColor="#8b7bff" />
                  <stop offset=".5" stopColor="#f2f2ff" />
                  <stop offset="1" stopColor="#3ee0d0" />
                </linearGradient>
              </defs>
              <path d={MARK} fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="3.4" strokeLinecap="round" />
              <m.path d={MARK} fill="none" stroke="url(#notch-trace)" strokeWidth="3.6" strokeLinecap="round" style={{ pathLength: trace }} />
            </svg>
          </Link>
          <AnimatePresence initial={false}>{open && links(RIGHT, "r")}</AnimatePresence>
        </m.nav>
        <Shoulder flip />
      </div>

      <m.div className="hdr-side right" initial={false} animate={sides} transition={spring}>
        {pushedIso && (
          <Link href="/lab" className="sync" title="Latest push to the research lab">
            <span>Lab pushed <RelTime iso={pushedIso} /></span>
          </Link>
        )}
      </m.div>
    </header>
  );
}
