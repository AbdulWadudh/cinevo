"use client";

import React, { useTransition, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Loader2 } from "lucide-react";

interface HubItem {
  name: string;
  href: string;
  theme: string;
  glowColor: string;
  logoText: string;
  tagline: string;
  bgGradient: string;
}

const HUBS: HubItem[] = [
  {
    name: "Marvel",
    href: "/?company=420|7505&companyName=Marvel+Universe&theme=marvel",
    theme: "marvel",
    glowColor: "rgba(229,62,79,0.5)", // Red glow
    logoText: "MARVEL",
    tagline: "STUDIOS",
    bgGradient: "from-red-600/20 to-red-950/40",
  },
  {
    name: "DC Universe",
    href: "/?company=9993|429|128064&companyName=DC+Universe&theme=dc",
    theme: "dc",
    glowColor: "rgba(14,165,233,0.5)", // Blue glow
    logoText: "DC",
    tagline: "ENTERTAINMENT",
    bgGradient: "from-sky-600/20 to-sky-950/40",
  },
  {
    name: "HBO Classics",
    href: "/?company=3287|3268&companyName=HBO+Classics&theme=hbo",
    theme: "hbo",
    glowColor: "rgba(255,255,255,0.25)", // Silver glow
    logoText: "HBO",
    tagline: "CLASSICS",
    bgGradient: "from-slate-600/20 to-slate-950/40",
  },
  {
    name: "Animation",
    href: "/?genre=16&genreName=Animation&theme=animation",
    theme: "animation",
    glowColor: "rgba(168,85,247,0.5)", // Purple/Magenta glow
    logoText: "ANIMATION",
    tagline: "PORTAL",
    bgGradient: "from-purple-600/20 to-purple-950/40",
  },
  {
    name: "Bollywood",
    href: "/?language=hi&languageName=Bollywood+Cinema&theme=bollywood",
    theme: "bollywood",
    glowColor: "rgba(245,158,11,0.5)", // Amber glow
    logoText: "BOLLYWOOD",
    tagline: "CINEMA",
    bgGradient: "from-amber-600/20 to-amber-950/40",
  },
];

export default function StudioHubs() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loadingHub, setLoadingHub] = useState<HubItem | null>(null);

  const themeGlow = loadingHub
    ? loadingHub.theme === "marvel" ? "rgba(239,68,68,0.12)" :
      loadingHub.theme === "dc" ? "rgba(14,165,233,0.12)" :
      loadingHub.theme === "hbo" ? "rgba(255,255,255,0.06)" :
      loadingHub.theme === "animation" ? "rgba(168,85,247,0.12)" :
      "rgba(245,158,11,0.12)"
    : "";

  const ringColorClass = loadingHub
    ? loadingHub.theme === "marvel" ? "text-red-500" :
      loadingHub.theme === "dc" ? "text-sky-400" :
      loadingHub.theme === "hbo" ? "text-slate-400" :
      loadingHub.theme === "animation" ? "text-purple-400" :
      "text-amber-500"
    : "";

  const logoStyleClass = loadingHub
    ? loadingHub.theme === "marvel" ? "text-white font-serif px-3 py-1 bg-red-600 rounded-sm border-2 border-white text-base tracking-tighter" :
      loadingHub.theme === "dc" ? "text-white font-mono border-2 border-white rounded-full w-14 h-14" :
      loadingHub.theme === "hbo" ? "text-white font-sans font-black uppercase text-2xl tracking-tight" :
      loadingHub.theme === "animation" ? "text-purple-400 font-sans italic tracking-widest font-black text-xl" :
      "text-amber-500 font-serif font-black text-2xl tracking-wide"
    : "";

  const barBgClass = loadingHub
    ? loadingHub.theme === "marvel" ? "bg-red-500 text-red-500" :
      loadingHub.theme === "dc" ? "bg-sky-400 text-sky-400" :
      loadingHub.theme === "hbo" ? "bg-white text-white" :
      loadingHub.theme === "animation" ? "bg-purple-400 text-purple-400" :
      "bg-amber-500 text-amber-500"
    : "";

  const handleNavigate = (e: React.MouseEvent<HTMLAnchorElement>, hub: HubItem) => {
    e.preventDefault();
    setLoadingHub(hub);
    startTransition(() => {
      router.push(hub.href);
    });
  };

  return (
    <section className="w-full px-6 md:px-12 mb-10 pt-4">
      <div className="mb-4">
        <h2 className="font-display text-lg md:text-xl font-bold tracking-tight text-fg">
          Studios & Brands
        </h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {HUBS.map((hub) => (
          <Link
            key={hub.name}
            href={hub.href}
            onClick={(e) => handleNavigate(e, hub)}
            className="block relative group"
          >
            <motion.div
              whileHover={{
                scale: 1.05,
                boxShadow: `0 10px 30px ${hub.glowColor}`,
                borderColor: hub.theme === "marvel" ? "rgba(229,62,79,0.4)" :
                  hub.theme === "dc" ? "rgba(14,165,233,0.4)" :
                    hub.theme === "hbo" ? "rgba(255,255,255,0.3)" :
                      hub.theme === "animation" ? "rgba(168,85,247,0.4)" :
                        "rgba(245,158,11,0.4)"
              }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className={`relative overflow-hidden aspect-video rounded-2xl border border-white/6 bg-linear-to-b ${hub.bgGradient} backdrop-blur-md flex flex-col items-center justify-center p-4 cursor-pointer`}
            >
              {/* Logo Typography */}
              <div className="text-center select-none pointer-events-none">
                <span
                  className={`font-black tracking-tighter text-2xl sm:text-3xl font-display ${hub.theme === "marvel" ? "text-red-500 font-serif px-2 bg-white" :
                      hub.theme === "dc" ? "text-white font-mono border-2 border-white rounded-full px-3 py-0.5" :
                        hub.theme === "hbo" ? "text-white font-sans font-extrabold uppercase tracking-tight" :
                          hub.theme === "animation" ? "text-purple-400 font-sans italic tracking-widest font-extrabold" :
                            "text-amber-500 font-serif font-black tracking-normal"
                    }`}
                >
                  {hub.logoText}
                </span>

                {hub.tagline && (
                  <div className={`text-[8px] font-black tracking-[0.25em] text-fg-secondary mt-1.5 ${hub.theme === "marvel" ? "text-white" : ""
                    }`}>
                    {hub.tagline}
                  </div>
                )}
              </div>

              {/* Hover dynamic background light effect */}
              <div className="absolute inset-0 -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08)_0%,transparent_70%)]" />
            </motion.div>
          </Link>
        ))}
      </div>

      {/* Cinematic Premium Loading Overlay */}
      <AnimatePresence>
        {isPending && loadingHub && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#030304]/90 backdrop-blur-xl"
          >
            {/* Ambient Background Pulse Glow */}
            <motion.div
              animate={{
                scale: [1, 1.15, 1],
                opacity: [0.5, 0.8, 0.5],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{
                background: `radial-gradient(circle, ${themeGlow} 0%, transparent 60%)`,
              }}
              className="absolute w-[600px] h-[600px] pointer-events-none -z-10"
            />

            {/* Glowing Rings Container */}
            <div className="relative w-36 h-36 flex items-center justify-center mb-8">
              {/* Outer Slow Counter-Clockwise Ring */}
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className={`absolute inset-0 rounded-full border border-t-transparent border-b-transparent border-l-transparent border-r-current opacity-30 ${ringColorClass}`}
              />

              {/* Inner Fast Clockwise Ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className={`absolute w-[85%] h-[85%] rounded-full border border-dashed border-current opacity-40 ${ringColorClass}`}
              />

              {/* Central Logo Emblem */}
              <motion.div
                animate={{ scale: [0.95, 1.05, 0.95] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className={`font-black font-display tracking-tight flex items-center justify-center select-none ${logoStyleClass}`}
              >
                {loadingHub.logoText}
              </motion.div>
            </div>

            {/* Text & Status Bar Container */}
            <div className="flex flex-col items-center max-w-sm px-6">
              {/* Animated Text */}
              <motion.h3 
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.5, ease: "easeOut" }}
                className="font-display text-lg md:text-xl font-black uppercase tracking-widest text-fg text-center"
              >
                {loadingHub.theme === "marvel" ? "Entering Marvel Universe" :
                 loadingHub.theme === "dc" ? "Loading DC Universe" :
                 loadingHub.theme === "hbo" ? "Opening HBO Classics" :
                 loadingHub.theme === "animation" ? "Accessing Animation Portal" :
                 "Exploring Bollywood"}
              </motion.h3>

              <motion.p
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
                className="text-xs text-fg-secondary mt-1 tracking-wider text-center"
              >
                Syncing cinematic library...
              </motion.p>

              {/* Sleek Fills-Up Loading Bar */}
              <div className="relative w-48 h-1 bg-white/10 rounded-full overflow-hidden mt-6 shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]">
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1.8, ease: "easeInOut" }}
                  className={`h-full rounded-full shadow-[0_0_10px_currentColor] ${barBgClass}`}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
