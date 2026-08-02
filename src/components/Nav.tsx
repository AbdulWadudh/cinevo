"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, Heart } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import SiteMenu from "@/components/SiteMenu";
import { FocusSection, FocusableLink, FocusableButton } from "@/components/tv/Focusable";
import { createClient } from "@/lib/supabase/client";
import { getProfileBrief } from "@/app/actions/auth";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { site } from "@/config";

export default function Nav() {
  const router = useRouter();
  const pathname = usePathname();

  const [scrolled, setScrolled] = useState(false);

  // Auth state for the nav avatar / sign-in link
  const [authUser, setAuthUser] = useState<{ avatarUrl: string | null; initial: string } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const toUser = (u: SupabaseUser | null) => {
      if (!u) return null;
      const meta = u.user_metadata ?? {};
      const name = meta.full_name || meta.name || u.email || "U";
      return {
        avatarUrl: meta.avatar_url || meta.picture || null,
        initial: String(name).charAt(0).toUpperCase(),
      };
    };
    // Prefer the app's own profile (Prisma) so an edited avatar/username shows
    // immediately; fall back to Supabase metadata (e.g. fresh Google sign-in).
    const hydrate = async (u: SupabaseUser | null) => {
      const base = toUser(u);
      if (!u) { setAuthUser(null); return; }
      setAuthUser(base);
      try {
        const brief = await getProfileBrief();
        if (brief) setAuthUser({ avatarUrl: brief.avatarUrl || base?.avatarUrl || null, initial: brief.initial });
      } catch { /* keep metadata fallback */ }
    };

    supabase.auth.getUser().then(({ data }) => hydrate(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      hydrate(session?.user ?? null)
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const goSearch = () => {
    router.push("/search");
  };

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Browse", href: "/browse" },
    { name: "Gallery", href: "/gallery" },
    { name: "Mystery", href: "/reveal" },
    { name: "Radio", href: "/radio" },
    { name: "Wishlist", href: "/wishlist" },
    { name: "History", href: "/history" },
  ];

  return (
    <>
      {/* Desktop / tablet navbar (all links visible). Mobile uses the StaggeredMenu below. */}
      <nav
        className={`fixed top-0 left-0 right-0 z-40 hidden md:flex items-center justify-between px-6 md:px-12 py-4 transition-all duration-300 ${scrolled ? "bg-bg/95 backdrop-blur-xl border-b border-white/[0.04] shadow-lg" : "bg-gradient-to-b from-bg/90 to-transparent"
          }`}
      >
        <div className="flex items-center gap-10">
          <Link href="/" className="flex items-center hover:scale-105 transition-transform duration-200">
            {/* eslint-disable-next-line @next/next/no-img-element -- static logo, variable width */}
            <img src={site.logo.full} alt={site.name} className="h-8 w-auto" />
          </Link>
          <FocusSection className="hidden md:flex items-center gap-6" focusKey="NAV_LINKS">
            {navLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <FocusableLink
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-medium tracking-wide transition-colors relative py-1 px-1.5 rounded ${active ? "text-fg" : "text-fg-secondary hover:text-fg"
                    }`}
                >
                  {link.name}
                  {active && <span className="absolute bottom-0 left-1.5 right-1.5 h-[2px] bg-accent-strong rounded-full" />}
                </FocusableLink>
              );
            })}
          </FocusSection>
        </div>

        <FocusSection className="hidden md:flex items-center gap-4" focusKey="NAV_ACTIONS">
          <FocusableButton
            onPress={goSearch}
            ariaLabel="Search"
            className="p-2 text-fg-secondary hover:text-fg hover:bg-white/6 rounded-full transition-all cursor-pointer"
          >
            <Search className="w-5 h-5" />
          </FocusableButton>
          <NotificationBell />
          <FocusableLink href="/wishlist" ariaLabel="Wishlist" className="p-2 text-fg-secondary hover:text-fg hover:bg-white/6 rounded-full transition-all block">
            <Heart className="w-5 h-5" />
          </FocusableLink>
          {authUser ? (
            <Link href="/profile" aria-label="Profile" className="block">
              {authUser.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- user avatar from arbitrary host
                <img
                  src={authUser.avatarUrl}
                  alt="Profile"
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-lg object-cover border border-white/[0.12] hover:border-accent transition-colors"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-accent to-purple-600 shadow-[0_2px_10px_rgba(229,62,79,0.3)] flex items-center justify-center text-xs font-extrabold text-white hover:scale-105 transition-transform">
                  {authUser.initial}
                </div>
              )}
            </Link>
          ) : (
            <Link
              href="/login"
              className="text-xs font-semibold text-fg-secondary hover:text-fg border border-white/[0.1] hover:border-accent px-3.5 py-2 rounded-lg transition-all"
            >
              Sign In
            </Link>
          )}
        </FocusSection>

      </nav>

      {/* Mobile / tablet: the StaggeredMenu overlay (hidden on md+ via CSS). */}
      <SiteMenu />
    </>
  );
}
