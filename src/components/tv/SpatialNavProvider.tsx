"use client";

import { useEffect } from "react";
import { init } from "@noriginmedia/norigin-spatial-navigation";

// Initialise Norigin spatial navigation once on the client. Arrow keys move
// focus spatially, Enter activates. Safe to call at module scope (runs once).
init({
  debug: false,
  visualDebug: false,
  // Use geometry-based measurement so focus jumps to the visually-nearest item.
  useGetBoundingClientRect: true,
});

/**
 * Mounts the spatial-navigation runtime and wires the TV remote "Back" button:
 * close any open overlay if present, otherwise go back in history.
 */
export default function SpatialNavProvider() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Android TV / webOS / Tizen back key codes + browser Backspace.
      const isBack =
        e.key === "GoBack" ||
        e.key === "BrowserBack" ||
        e.keyCode === 10009 || // Tizen
        e.keyCode === 461 ||   // webOS
        (e.key === "Backspace" && !(e.target as HTMLElement)?.closest("input, textarea, [contenteditable]"));
      if (!isBack) return;
      // Let elements that manage their own Escape (modals) react first.
      const escapable = document.querySelector("[data-tv-escapable]");
      if (escapable) {
        e.preventDefault();
        (escapable as HTMLElement).dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        return;
      }
      if (window.history.length > 1) {
        e.preventDefault();
        window.history.back();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return null;
}
