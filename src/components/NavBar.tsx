"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, Heart, Palette } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import NotificationBell from "@/components/NotificationBell";
import SiteMenu from "@/components/SiteMenu";
import { FocusSection, FocusableLink, FocusableButton } from "@/components/tv/Focusable";
import ExperienceBrand from "@/components/theme/ExperienceBrand";
import { createClient } from "@/lib/supabase/client";
import { getProfileBrief } from "@/app/actions/auth";
import { getExperience } from "@/lib/theme/experiences";
import { useTheme } from "@/lib/theme/studio/provider";
import type { NavViewer } from "@/lib/auth";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { site } from "@/config";

export default function NavBar({ initialViewer }: { initialViewer: NavViewer | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const { openStudio, experience } = useTheme();
  const activeExperience = getExperience(experience);

  const [scrolled, setScrolled] = useState(false);
  const [viewer, setViewer] = useState<NavViewer | null>(initialViewer);

  useEffect(() => {
    const supabase = createClient();

    const fromMetadata = (u: SupabaseUser): NavViewer => {
      const meta = u.user_metadata ?? {};
      const name = meta.full_name || meta.name || u.email || "U";
      return {
        id: u.id,
        avatarUrl: meta.avatar_url || meta.picture || null,
        initial: String(name).charAt(0).toUpperCase(),
        isAdmin: false,
      };
    };

    const hydrate = async (u: SupabaseUser | null) => {
      if (!u) { setViewer(null); return; }
      // The server already resolved this exact user; keep its answer so the
      // admin shortcut never re-appears a beat after the nav settles.
      if (initialViewer?.id === u.id) return;

      const base = fromMetadata(u);
      setViewer(base);
      try {
        const brief = await getProfileBrief();
        if (brief) {
          setViewer({
            id: u.id,
            avatarUrl: brief.avatarUrl || base.avatarUrl,
            initial: brief.initial,
            isAdmin: brief.isAdmin,
          });
        }
      } catch { /* keep metadata fallback */ }
    };

    supabase.auth.getUser().then(({ data }) => hydrate(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      hydrate(session?.user ?? null)
    );
    return () => sub.subscription.unsubscribe();
  }, [initialViewer]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const goSearch = () => {
    router.push("/search");
  };

  const navLinks = activeExperience.nav;
  // Two clone links can share a destination (TV Shows and Movies both open the
  // catalogue). Only the first matching one may claim the active underline.
  const activeHref = navLinks.find(
    (link) => link.href.split(/[?#]/)[0] === pathname,
  )?.href;

  return (
    <>
      {/* Desktop / tablet navbar (all links visible). Mobile uses the StaggeredMenu below. */}
      <motion.nav
        initial={reduceMotion ? false : { opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: activeExperience.motion.base / 1000, ease: "easeOut" }}
        data-xp-nav=""
        data-scrolled={scrolled}
        className={`fixed top-0 left-0 right-0 z-40 hidden md:flex items-center justify-between px-6 md:px-12 py-4 transition-all duration-300 ${scrolled ? "bg-bg/95 backdrop-blur-xl border-b border-white/[0.04] shadow-lg" : "bg-linear-to-b from-bg/90 to-transparent"
          }`}
      >
        <div className="flex items-center gap-10">
          <Link
            href="/"
            data-xp-nav-brand=""
            className="flex items-center hover:scale-105 transition-transform duration-200"
            aria-label={`${site.name} home`}
          >
            <ExperienceBrand className="h-8 w-auto" />
          </Link>
          <FocusSection
            className="hidden md:flex items-center gap-6"
            focusKey="NAV_LINKS"
          >
            {navLinks.map((link) => {
              const active = link.href === activeHref;
              return (
                <FocusableLink
                  key={`${link.label}-${link.href}`}
                  href={link.href}
                  data-xp-nav-link=""
                  data-active={active}
                  className={`text-sm font-medium tracking-wide transition-colors relative py-1 px-1.5 rounded ${active ? "text-fg" : "text-fg-secondary hover:text-fg"
                    }`}
                >
                  {link.label}
                  {active && (
                    <motion.span
                      layoutId={reduceMotion ? undefined : "active-nav-link"}
                      transition={{ type: "spring", stiffness: 450, damping: 35 }}
                      data-xp-nav-active=""
                      className="absolute bottom-0 left-1.5 right-1.5 h-0.5 bg-accent-strong rounded-full"
                    />
                  )}
                </FocusableLink>
              );
            })}
          </FocusSection>
        </div>

        <FocusSection className="hidden md:flex items-center gap-4" focusKey="NAV_ACTIONS">
          <FocusableButton
            onPress={goSearch}
            ariaLabel="Search"
            data-xp-nav-action=""
            className="p-2 text-fg-secondary hover:text-fg hover:bg-white/6 rounded-full transition-all cursor-pointer"
          >
            <Search className="w-5 h-5" />
          </FocusableButton>
          <NotificationBell />
          <FocusableLink href="/wishlist" ariaLabel="Wishlist" data-xp-nav-action="" data-xp-nav-heart="" className="p-2 text-fg-secondary hover:text-fg hover:bg-white/6 rounded-full transition-all block">
            <Heart className="w-5 h-5" />
          </FocusableLink>
          <FocusableButton
            onPress={openStudio}
            ariaLabel="Theme studio"
            data-xp-nav-action=""
            className="p-2 text-fg-secondary hover:text-fg hover:bg-white/6 rounded-full transition-all cursor-pointer"
          >
            <Palette className="w-5 h-5" />
          </FocusableButton>
          {viewer ? (
            <Link href="/profile" aria-label="Profile" data-xp-nav-action="" className="block">
              {viewer.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- user avatar from arbitrary host
                <img
                  src={viewer.avatarUrl}
                  alt="Profile"
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-lg object-cover border border-white/[0.12] hover:border-accent transition-colors"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-linear-to-tr from-accent to-accent-strong shadow-[0_2px_10px_rgba(var(--accent-rgb),0.3)] flex items-center justify-center text-xs font-extrabold text-white hover:scale-105 transition-transform">
                  {viewer.initial}
                </div>
              )}
            </Link>
          ) : (
            <Link
              href="/login"
              data-xp-signin=""
              className="text-xs font-semibold text-fg-secondary hover:text-fg border border-white/[0.1] hover:border-accent px-3.5 py-2 rounded-lg transition-all"
            >
              Sign In
            </Link>
          )}
        </FocusSection>

      </motion.nav>

      {/* Mobile / tablet: the StaggeredMenu overlay (hidden on md+ via CSS). */}
      <SiteMenu />
    </>
  );
}
