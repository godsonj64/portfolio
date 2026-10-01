"use client";

import { useEffect, useRef } from "react";

/**
 * Hero sky: two parallax layers of stars with gentle twinkle, pointer parallax and an occasional shooting star.
 * Cheap by design — a single 2D canvas, 30 fps, paused when off-screen or the tab is hidden, static under reduced motion.
 */
type Star = { x: number; y: number; z: number; r: number; p: number; hue: number };

export function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = ref.current!;
    const ctx = el.getContext("2d", { alpha: true })!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lowPower = (navigator.hardwareConcurrency || 8) <= 4 || ((navigator as any).deviceMemory ?? 8) <= 4;
    let w = 0, h = 0, dpr = 1;
    let stars: Star[] = [];
    let mx = 0, my = 0, tx = 0, ty = 0;
    let visible = true;
    let raf = 0, last = 0;
    let comet: { x: number; y: number; vx: number; vy: number; life: number } | null = null;
    let nextComet = performance.now() + 5000 + Math.random() * 5000;

    const seed = () => {
      const count = Math.min(lowPower ? 380 : 760, Math.floor((w * h) / 2600));
      stars = Array.from({ length: count }, () => {
        const z = Math.pow(Math.random(), 1.8); // most stars far, few near
        return {
          x: Math.random() * w,
          y: Math.random() * h * 0.82,
          z,
          r: (0.35 + z * 1.25) * dpr,
          p: Math.random() * Math.PI * 2,
          hue: Math.random() < 0.14 ? 28 : Math.random() < 0.4 ? 215 : 235,
        };
      });
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = el.getBoundingClientRect();
      w = Math.round(r.width * dpr);
      h = Math.round(r.height * dpr);
      el.width = w; el.height = h;
      seed();
      draw(performance.now(), true);
    };

    const draw = (now: number, still = false) => {
      ctx.clearRect(0, 0, w, h);
      mx += (tx - mx) * 0.05;
      my += (ty - my) * 0.05;
      const t = now / 1000;
      for (const s of stars) {
        const drift = still ? 0 : (t * (2 + s.z * 7) * dpr) % w;
        const x = (((s.x + drift + mx * s.z * 26 * dpr) % w) + w) % w;
        const y = s.y + my * s.z * 14 * dpr;
        const tw = still ? 0.8 : 0.62 + 0.38 * Math.sin(t * (0.6 + s.z * 1.6) + s.p);
        ctx.globalAlpha = (0.25 + s.z * 0.75) * tw;
        ctx.fillStyle = `hsl(${s.hue} ${s.hue === 28 ? 80 : 60}% ${84 + s.z * 12}%)`;
        ctx.beginPath();
        ctx.arc(x, y, s.r, 0, 6.283);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (!still && comet) {
        comet.x += comet.vx * dpr; comet.y += comet.vy * dpr; comet.life -= 0.012;
        const len = 150 * dpr;
        const g = ctx.createLinearGradient(comet.x, comet.y, comet.x - comet.vx * len / 9, comet.y - comet.vy * len / 9);
        g.addColorStop(0, `rgba(255,255,255,${0.9 * comet.life})`);
        g.addColorStop(1, "rgba(120,160,255,0)");
        ctx.strokeStyle = g; ctx.lineWidth = 1.6 * dpr; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(comet.x, comet.y); ctx.lineTo(comet.x - comet.vx * len / 9, comet.y - comet.vy * len / 9); ctx.stroke();
        if (comet.life <= 0 || comet.x > w + 100 || comet.y > h) comet = null;
      } else if (!still && now > nextComet) {
        comet = { x: Math.random() * w * 0.5, y: Math.random() * h * 0.3, vx: 9 + Math.random() * 4, vy: 3.2 + Math.random() * 2, life: 1 };
        nextComet = now + 8000 + Math.random() * 9000;
      }
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (!visible || document.hidden || now - last < 33) return;
      last = now;
      draw(now);
    };

    const onMove = (e: PointerEvent) => {
      tx = e.clientX / window.innerWidth - 0.5;
      ty = e.clientY / window.innerHeight - 0.5;
    };
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(el);
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();
    if (!reduce) {
      window.addEventListener("pointermove", onMove, { passive: true });
      raf = requestAnimationFrame(loop);
    }
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      io.disconnect(); ro.disconnect();
    };
  }, []);

  return <canvas ref={ref} className="starfield" aria-hidden />;
}
