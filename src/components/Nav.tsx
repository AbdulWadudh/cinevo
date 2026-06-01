"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, Bell, Menu, X, Heart } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import { createClient } from "@/lib/supabase/client";
import { getProfileBrief } from "@/app/actions/auth";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export default function Nav() {
  const router = useRouter();
  const pathname = usePathname();

  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    setMobileMenuOpen(false);
    router.push("/search");
  };

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Browse", href: "/browse" },
    { name: "Wishlist", href: "/wishlist" },
    { name: "History", href: "/history" },
  ];

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 md:px-12 py-4 transition-all duration-300 ${
          scrolled ? "bg-bg/95 backdrop-blur-xl border-b border-white/[0.04] shadow-lg" : "bg-gradient-to-b from-bg/90 to-transparent"
        }`}
      >
        <div className="flex items-center gap-10">
          <Link href="/" className="flex items-center hover:scale-105 transition-transform duration-200">
            <img src="/full_logo.png" alt="Cinevo" className="h-8 w-auto" />
          </Link>
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-medium tracking-wide transition-colors relative py-1 ${
                    active ? "text-fg" : "text-fg-secondary hover:text-fg"
                  }`}
                >
                  {link.name}
                  {active && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent rounded-full" />}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="hidden md:flex items-center gap-4">
          <button
            onClick={goSearch}
            aria-label="Search"
            className="p-2 text-fg-secondary hover:text-fg hover:bg-white/[0.06] rounded-full transition-all cursor-pointer"
          >
            <Search className="w-5 h-5" />
          </button>
          <NotificationBell />
          <Link href="/wishlist" aria-label="Wishlist Dashboard" className="p-2 text-fg-secondary hover:text-fg hover:bg-white/[0.06] rounded-full transition-all">
            <Heart className="w-5 h-5" />
          </Link>
          {authUser ? (
            <Link href="/profile" aria-label="Profile" className="block">
              {authUser.avatarUrl ? (
                <img
                  src={authUser.avatarUrl}
                  alt="Profile"
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
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-fg-secondary hover:text-fg hover:bg-white/[0.06] rounded-full transition-all"
          aria-label="Toggle mobile menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {/* Mobile Menu Panel */}
      <div
        className={`fixed inset-0 bg-bg/98 z-50 flex flex-col justify-center p-8 transition-all duration-300 md:hidden ${
          mobileMenuOpen ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full pointer-events-none"
        }`}
      >
        <button
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close menu"
          className="absolute top-5 right-5 p-2.5 bg-surface hover:bg-surface-hover hover:text-accent text-fg-secondary border border-border rounded-xl transition-all cursor-pointer"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="flex flex-col gap-6 text-center">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`text-2xl font-bold font-display ${active ? "text-accent" : "text-fg-secondary hover:text-fg"}`}
              >
                {link.name}
              </Link>
            );
          })}

          {authUser ? (
            <Link
              href="/profile"
              onClick={() => setMobileMenuOpen(false)}
              className="text-2xl font-bold font-display text-fg-secondary hover:text-fg"
            >
              Profile
            </Link>
          ) : (
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="mx-auto mt-1 inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-accent text-white hover:bg-accent-hover transition-all"
            >
              Sign In
            </Link>
          )}

          <div className="h-px bg-border w-1/3 mx-auto my-4" />
          <div className="flex justify-center gap-6">
            <button
              onClick={goSearch}
              className="p-3 bg-surface hover:bg-surface-hover rounded-full transition-all cursor-pointer"
              aria-label="Search"
            >
              <Search className="w-6 h-6 text-fg-secondary" />
            </button>
            <button className="p-3 bg-surface hover:bg-surface-hover rounded-full transition-all relative">
              <Bell className="w-6 h-6 text-fg-secondary" />
              <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-accent rounded-full" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
