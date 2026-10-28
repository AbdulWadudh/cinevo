"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { useTheme } from "@/lib/theme/studio/provider";

const DECAY_MASK = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180"><filter id="d"><feTurbulence type="fractalNoise" baseFrequency="0.075" numOctaves="4" seed="11" result="t"/><feColorMatrix in="t" type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 1 0 0 0 0"/><feComponentTransfer><feFuncA type="discrete" tableValues="0 0 1 1 0 1 0 1"/></feComponentTransfer></filter><rect width="180" height="180" fill="white" filter="url(#d)"/></svg>`,
)}")`;

export default function DecayBorder({ className = "" }: { className?: string }) {
  const { cardEffect, decayRing } = useTheme();
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (cardEffect !== "decay" || reduceMotion) return;
    const node = ref.current;
    const parent = node?.parentElement;
    if (!parent) return;
    const move = (event: PointerEvent) => {
      const box = parent.getBoundingClientRect();
      parent.style.setProperty("--decay-mx", `${-(event.clientX - box.left)}px`);
      parent.style.setProperty("--decay-my", `${-(event.clientY - box.top)}px`);
    };
    parent.addEventListener("pointermove", move);
    return () => {
      parent.removeEventListener("pointermove", move);
    };
  }, [cardEffect, reduceMotion]);

  if (cardEffect !== "decay") return null;

  return (
    <span
      ref={ref}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 z-[1] rounded-[inherit] border border-accent opacity-70 mix-blend-screen ${className}`.trim()}
      style={{
        borderWidth: decayRing,
        boxShadow: "inset 0 0 16px rgba(var(--accent-rgb), 0.35)",
        filter: "blur(0.35px)",
        maskImage: DECAY_MASK,
        WebkitMaskImage: DECAY_MASK,
        maskSize: "110px 110px",
        WebkitMaskSize: "110px 110px",
        maskRepeat: "repeat",
        WebkitMaskRepeat: "repeat",
        maskPosition: "var(--decay-mx, 0px) var(--decay-my, 0px)",
        WebkitMaskPosition: "var(--decay-mx, 0px) var(--decay-my, 0px)",
      }}
    />
  );
}
