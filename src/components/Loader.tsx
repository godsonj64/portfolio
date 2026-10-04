"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Loading screen: a luminous comet traces a lemniscate (∞) over a faint ghost track while the hue drifts between
 * the two lobes. Inspired by the "guanxian" loader on Dribbble; drawn from scratch.
 *
 * It is shown once per browser session, skipped for reduced-motion, and released as soon as fonts are ready and a
 * short minimum has elapsed (never longer than MAX_MS).
 */
const MIN_MS = 1500;
const MAX_MS = 4000;
const KEY = "gj-loaded";

// Lemniscate of Bernoulli, parametrised by t; a = half-width.
function lem(t: number, a: number): [number, number] {
  const s = Math.sin(t), c = Math.cos(t), d = 1 + s * s;
  return [(a * c) / d, (a * s * c) / d];
}

export function Loader() {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const html = document.documentElement;
    const finish = () => {
      html.classList.remove("loading");
      html.classList.add("ready");
      try { sessionStorage.setItem(KEY, "1"); } catch {}
    };
    let skip = false;
    try { skip = !!sessionStorage.getItem(KEY); } catch {}
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (skip || reduce) {
      finish();
      setGone(true);
      return;
    }

    const el = canvas.current!;
    const ctx = el.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = 420, H = 240;
    el.width = W * dpr; el.height = H * dpr;
    ctx.scale(dpr, dpr);
    const A = 116; // lobe half-width
    const cx = W / 2, cy = H / 2;

    let raf = 0;
    const t0 = performance.now();
    const tail = 120; // samples in the comet trail
    const span = 2.1; // radians of trail length

    const frame = (now: number) => {
      const time = (now - t0) / 1000;
      const head = time * 2.35; // radians per second
      ctx.clearRect(0, 0, W, H);

      // ghost track
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      for (let i = 0; i <= 200; i++) {
        const [x, y] = lem((i / 200) * Math.PI * 2, A);
        i ? ctx.lineTo(cx + x, cy + y) : ctx.moveTo(cx + x, cy + y);
      }
      ctx.closePath();
      ctx.strokeStyle = "rgba(255,255,255,0.055)";
      ctx.lineWidth = 15;
      ctx.stroke();

      ctx.globalCompositeOperation = "lighter";
      let prev: [number, number] | null = null;
      for (let i = 0; i <= tail; i++) {
        const f = i / tail; // 0 at head -> 1 at tail
        const t = head - f * span;
        const [x, y] = lem(t, A);
        const px = cx + x, py = cy + y;
        if (prev) {
          const life = Math.pow(1 - f, 1.5);
          const hue = 262 - (x / A + 1) * 42; // violet on the left lobe -> teal on the right
          const w = 1 + 13 * Math.pow(1 - f, 0.9);
          ctx.beginPath();
          ctx.moveTo(prev[0], prev[1]);
          ctx.lineTo(px, py);
          ctx.strokeStyle = `hsla(${hue}, 100%, 62%, ${0.16 * life})`;
          ctx.lineWidth = w * 3.1;
          ctx.stroke();
          ctx.strokeStyle = `hsla(${hue}, 100%, 70%, ${0.5 * life})`;
          ctx.lineWidth = w * 1.5;
          ctx.stroke();
          ctx.strokeStyle = `hsla(${hue + 14}, 100%, ${88 - f * 12}%, ${0.95 * life})`;
          ctx.lineWidth = Math.max(0.8, w * 0.55);
          ctx.stroke();
        }
        prev = [px, py];
      }
      // head flare
      const [hx, hy] = lem(head, A);
      const hue = 262 - (hx / A + 1) * 42;
      const g = ctx.createRadialGradient(cx + hx, cy + hy, 0, cx + hx, cy + hy, 26);
      g.addColorStop(0, `hsla(${hue + 10}, 100%, 96%, 0.95)`);
      g.addColorStop(0.25, `hsla(${hue}, 100%, 70%, 0.45)`);
      g.addColorStop(1, `hsla(${hue}, 100%, 55%, 0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx + hx, cy + hy, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    // release: fonts ready + minimum time, hard cap
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      root.current?.classList.add("done");
      html.classList.add("intro"); // hero lines rise as the curtain lifts
      finish();
      window.setTimeout(() => { cancelAnimationFrame(raf); setGone(true); }, 900);
    };
    const minimum = new Promise<void>((r) => setTimeout(r, MIN_MS));
    const fonts = (document as any).fonts?.ready ?? Promise.resolve();
    Promise.all([minimum, fonts]).then(release);
    const cap = window.setTimeout(release, MAX_MS);

    return () => { cancelAnimationFrame(raf); clearTimeout(cap); };
  }, []);

  if (gone) return null;
  return (
    <div className="loader" ref={root} role="status" aria-live="polite" aria-label="Loading">
      <canvas ref={canvas} className="loader-canvas" style={{ width: 420, height: 240 }} aria-hidden />
      <p className="loader-text">Loading<span aria-hidden>…</span></p>
    </div>
  );
}
