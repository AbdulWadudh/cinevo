"use client";

import { useEffect } from "react";

/** Registers the service worker so the PWA is installable and can receive push. */
export default function PwaRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => { /* ignore */ });
  }, []);
  return null;
}
