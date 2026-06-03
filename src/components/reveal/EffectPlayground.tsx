"use client";

import React, { useState } from "react";
import { Sparkles } from "lucide-react";
import CustomSelect, { type SelectOption } from "@/components/ui/CustomSelect";
import HoloCard, { type RevealItem } from "./HoloCard";
import { CARD_EFFECTS } from "./effects";
import { useRevealEffect, setRevealEffect } from "./revealEffectStore";

const OPTIONS: SelectOption[] = CARD_EFFECTS.map((e) => ({ label: e.label, value: e.key }));

// A sample title to demo the effect against (TMDB poster).
const DEMO_ITEM: RevealItem = {
  id: 157336,
  mediaType: "movie",
  title: "Interstellar",
  poster: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
  rating: 8.4,
  year: "2014",
};

/** Admin demo: pick the holo effect used by the Mystery reveal and preview it live. */
export default function EffectPlayground() {
  const effectKey = useRevealEffect();
  // Local nonce to replay the reveal flip each time the effect changes.
  const [nonce, setNonce] = useState(0);

  const onChange = (key: string) => {
    setRevealEffect(key);
    setNonce((n) => n + 1);
  };

  return (
    <div className="border-t border-white/[0.06] mt-8 pt-6">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
        <div>
          <h3 className="text-sm font-bold text-fg flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" /> Reveal card effect
          </h3>
          <p className="text-xs text-muted mt-0.5 max-w-md">
            Choose the holographic effect used when revealing Mystery cards. Hover/drag the
            preview to see the shine. Saved for everyone on this device.
          </p>
        </div>
        <CustomSelect
          value={effectKey}
          options={OPTIONS}
          onChange={onChange}
          ariaLabel="Card effect"
          icon={<Sparkles className="w-3.5 h-3.5" />}
        />
      </div>

      <div className="flex justify-center py-4 [perspective:1800px]">
        <HoloCard key={`${effectKey}-${nonce}`} item={DEMO_ITEM} effectKey={effectKey} demo />
      </div>
    </div>
  );
}
