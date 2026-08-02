"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import BackButton from "@/components/BackButton";

/** Idle time before the pill fades out. */
const IDLE_HIDE_MS = 2000;

/** Back pill that fades out when the cursor goes still and returns on movement. */
export default function FloatingBackButton({ accentClass = "" }: { accentClass?: string }) {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** (Re)starts the countdown. No setState, so it's safe from an effect body. */
  const hideSoon = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(false), IDLE_HIDE_MS);
  }, []);

  const reveal = useCallback(() => {
    setVisible(true);
    hideSoon();
  }, [hideSoon]);

  useEffect(() => {
    window.addEventListener("mousemove", reveal);
    window.addEventListener("touchstart", reveal);
    // Starts visible, so the mount only needs to arm the timer.
    hideSoon();

    return () => {
      window.removeEventListener("mousemove", reveal);
      window.removeEventListener("touchstart", reveal);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [reveal, hideSoon]);

  return (
    <BackButton
      label="Back"
      fallback="/"
      className={`fixed left-3 top-17 z-40 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/8 bg-bg/80 px-3.5 py-2 text-xs text-fg-secondary shadow-lg backdrop-blur-md transition-opacity duration-200 hover:bg-white/10 hover:text-fg sm:left-6 md:left-14 md:top-20 ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      } ${accentClass}`}
    />
  );
}
