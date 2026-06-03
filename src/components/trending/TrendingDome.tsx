"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Play, Clapperboard } from "lucide-react";
import DomeGallery from "@/components/reactbits/DomeGallery";
import { useTrailer } from "@/components/TrailerProvider";

export interface DomeImage {
  src: string;
  alt: string;
  id: number;
  mediaType: "movie" | "tv";
  title: string;
}

interface OpenedItem {
  id: string;
  mediaType: "movie" | "tv";
  title: string;
}

export default function TrendingDome({ images }: { images: DomeImage[] }) {
  const router = useRouter();
  const { openTrailer } = useTrailer();
  const [opened, setOpened] = useState<OpenedItem | null>(null);

  const play = () => {
    if (!opened) return;
    router.push(`/watch/${opened.mediaType}/${opened.id}`);
  };

  const trailer = () => {
    if (!opened) return;
    openTrailer({ id: opened.id, mediaType: opened.mediaType, title: opened.title });
  };

  return (
    <div className="absolute inset-0">
      <DomeGallery
        images={images}
        grayscale={false}
        autoRotate
        autoRotateSpeed={6}
        fit={0.62}
        minRadius={600}
        maxVerticalRotationDeg={12}
        dragDampening={1.4}
        overlayBlurColor="#08080f"
        imageBorderRadius="16px"
        openedImageBorderRadius="16px"
        openedImageWidth="320px"
        openedImageHeight="480px"
        onOpenItem={(it: OpenedItem) => setOpened(it)}
        onCloseItem={() => setOpened(null)}
      />

      {/* Play / Watch Trailer actions for the opened poster */}
      <AnimatePresence>
        {opened && (
          <motion.div
            key="dome-actions"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] flex flex-col items-center gap-3 px-4"
          >
            <span className="text-sm font-bold text-white drop-shadow-lg max-w-[80vw] truncate text-center">
              {opened.title}
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={play}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold bg-accent text-white hover:bg-accent-hover hover:scale-[1.03] active:scale-95 transition-all shadow-[0_8px_30px_rgba(229,62,79,0.4)] cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" /> Play
              </button>
              <button
                onClick={trailer}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-white/[0.12] border border-white/[0.18] text-white backdrop-blur-md hover:bg-white/[0.2] hover:scale-[1.03] active:scale-95 transition-all cursor-pointer"
              >
                <Clapperboard className="w-4 h-4" /> Watch Trailer
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
