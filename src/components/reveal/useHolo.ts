"use client";

import { useEffect, useRef } from "react";
import type { PointerEvent } from "react";

// Pointer → holo CSS variables, with spring smoothing. Math + tuning adapted
// from pokemon-cards-css (Simon Goellner, MIT). Sets the same custom properties
// the holo CSS reads, so any element with the holo layers can use it.

const clamp = (v: number, min = 0, max = 100) => Math.min(Math.max(v, min), max);
const round = (v: number, p = 3) => parseFloat(v.toFixed(p));
const adjust = (v: number, a: number, b: number, c: number, d: number) =>
  round(c + ((d - c) * (v - a)) / (b - a));

interface S { v: number; t: number; vel: number }
const spring = (i: number): S => ({ v: i, t: i, vel: 0 });
const step = (s: S, stiff: number, damp: number) => {
  s.vel += (s.t - s.v) * stiff;
  s.vel *= 1 - damp;
  s.v += s.vel;
};

export function useHolo<T extends HTMLElement>(opts: { spin?: boolean } = {}) {
  const ref = useRef<T | null>(null);
  const sp = useRef({
    rx: spring(0), ry: spring(0),
    gx: spring(50), gy: spring(50), go: spring(0),
    bx: spring(50), by: spring(50),
    delta: spring(0),
  });

  useEffect(() => {
    if (opts.spin) sp.current.delta = { v: 360, t: 0, vel: 0 };
    const IS = 0.066, ID = 0.25;   // interact spring
    const DS = 0.016, DD = 0.58;   // delta (reveal-spin) spring — slow & smooth
    let raf = 0;
    const tick = () => {
      const s = sp.current;
      const el = ref.current;
      step(s.rx, IS, ID); step(s.ry, IS, ID);
      step(s.gx, IS, ID); step(s.gy, IS, ID); step(s.go, IS, ID);
      step(s.bx, IS, ID); step(s.by, IS, ID);
      step(s.delta, DS, DD);
      if (el) {
        const gx = s.gx.v, gy = s.gy.v;
        const fromCenter = clamp(Math.sqrt((gy - 50) ** 2 + (gx - 50) ** 2) / 50, 0, 1);
        el.style.setProperty("--pointer-x", `${gx}%`);
        el.style.setProperty("--pointer-y", `${gy}%`);
        el.style.setProperty("--pointer-from-center", `${fromCenter}`);
        el.style.setProperty("--pointer-from-top", `${gy / 100}`);
        el.style.setProperty("--pointer-from-left", `${gx / 100}`);
        el.style.setProperty("--card-opacity", `${s.go.v}`);
        el.style.setProperty("--rotate-x", `${s.rx.v + s.delta.v}deg`);
        el.style.setProperty("--rotate-y", `${s.ry.v}deg`);
        el.style.setProperty("--background-x", `${s.bx.v}%`);
        el.style.setProperty("--background-y", `${s.by.v}%`);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [opts.spin]);

  const onPointerMove = (e: PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = clamp(round((100 / r.width) * (e.clientX - r.left)));
    const py = clamp(round((100 / r.height) * (e.clientY - r.top)));
    const cx = px - 50, cy = py - 50;
    const s = sp.current;
    s.bx.t = adjust(px, 0, 100, 37, 63);
    s.by.t = adjust(py, 0, 100, 33, 67);
    s.rx.t = round(-(cx / 3.5));
    s.ry.t = round(cy / 3.5);
    s.gx.t = px; s.gy.t = py; s.go.t = 1;
    el.classList.add("interacting");
  };

  const onPointerLeave = () => {
    const el = ref.current;
    const s = sp.current;
    s.rx.t = 0; s.ry.t = 0;
    s.gx.t = 50; s.gy.t = 50; s.go.t = 0;
    s.bx.t = 50; s.by.t = 50;
    el?.classList.remove("interacting");
  };

  return { ref, onPointerMove, onPointerLeave };
}
