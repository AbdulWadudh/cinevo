"use client";

import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useRadioPlayerContext } from "@/components/radio/RadioPlayerProvider";

/**
 * Silences the radio once the video embed starts, so the two aren't playing
 * over each other. Renders nothing.
 *
 * The embed is a cross-origin iframe, so there is no `play` event to listen
 * for. Two observable signals stand in:
 *
 *  - focus moving into the iframe, which is what clicking a play button does
 *    and shows up in the parent as a `blur` with an iframe as
 *    `document.activeElement`;
 *  - a progress `postMessage`, which the providers that emit one only send
 *    once playback has actually begun.
 *
 * It fires at most once per visit: a manual resume has to stick.
 */
export default function RadioAutoPause() {
  const { player } = useRadioPlayerContext();
  const silencedRef = useRef(false);

  const silence = useCallback(() => {
    if (silencedRef.current) return;
    silencedRef.current = true;

    if (player.status === "playing" || player.status === "connecting") {
      player.pause();
      toast("Radio paused", {
        description: "Something else is playing. Resume it from the mini player.",
        duration: 3000,
      });
    }
  }, [player]);

  useEffect(() => {
    const onBlur = () => {
      if (document.activeElement?.tagName === "IFRAME") silence();
    };

    const onMessage = (event: MessageEvent) => {
      let payload: unknown = event.data;
      if (typeof payload === "string") {
        try {
          payload = JSON.parse(payload);
        } catch {
          return;
        }
      }
      if (!payload || typeof payload !== "object") return;

      const p = payload as Record<string, unknown>;
      const nested = (p.data ?? p.value ?? p.payload) as Record<string, unknown> | undefined;
      const hasTime = ["currentTime", "seconds", "time", "progress"].some(
        (k) => typeof p[k] === "number" || (nested && typeof nested[k] === "number")
      );
      if (hasTime) silence();
    };

    window.addEventListener("blur", onBlur);
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("message", onMessage);
    };
  }, [silence]);

  return null;
}
