"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, Check } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  icon?: React.ReactNode;
  ariaLabel?: string;
  /** Trigger min-width (Tailwind class). */
  className?: string;
}

/** Animated, fully-custom dropdown (no native <select>) matching Cinevo's UI. */
export default function CustomSelect({ value, options, onChange, icon, ariaLabel, className = "" }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={`relative ${className}`} ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-sm font-semibold transition-all duration-200 cursor-pointer outline-none ${open
          ? "bg-accent/15 border-accent/50 text-white"
          : "bg-surface border-border text-fg hover:border-fg-secondary/50"
          }`}
    >
        <span className="flex items-center gap-2 min-w-0">
          {icon && <span className={open ? "text-accent" : "text-muted"}>{icon}</span>}
          <span className="truncate">{selected?.label ?? "—"}</span>
        </span>
        <ChevronDown className={`w-3.5 h-3.5 flex-none text-muted transition-transform duration-200 ${open ? "rotate-180 text-accent" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="absolute left-0 top-full mt-2 z-50 min-w-full w-max max-w-[260px] max-h-[260px] overflow-y-auto bg-surface/98 backdrop-blur-2xl border border-white/[0.12] rounded-2xl shadow-[0_24px_60px_rgba(0,0,0,0.7)] py-1 scrollbar-hide"
          >
            {options.map((opt) => {
              const active = opt.value === value;
              return (
                <li key={opt.value || "all"}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => { onChange(opt.value); setOpen(false); }}
                    className={`w-full flex items-center gap-2 px-4 py-2 text-left text-sm transition-colors cursor-pointer ${active ? "bg-accent/15 text-accent font-bold" : "text-fg hover:bg-white/[0.06] hover:text-white"}`}
                  >
                    <span className="flex-1 truncate">{opt.label}</span>
                    {active && <Check className="w-3.5 h-3.5 flex-none text-accent" />}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
