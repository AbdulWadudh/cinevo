"use client";

import React, { useState, useEffect, useTransition, Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, Bell, Menu, X, Heart, Star, Film, User, ArrowLeft, Loader2, Play } from "lucide-react";
import { searchMediaAction, getPersonCreditsAction } from "@/app/actions/tmdb-actions";
import { TMDBMedia } from "@/lib/tmdb";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import WishlistHeart from "@/components/wishlist/WishlistHeart";

function NavInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Disable background scrolling when the search overlay is open
  useEffect(() => {
    if (isSearchOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isSearchOpen]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TMDBMedia[]>([]);
  const [includePeople, setIncludePeople] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Selected Actor credits states inside Search overlay
  const [selectedSearchActor, setSelectedSearchActor] = useState<any | null>(null);
  const [searchActorMovies, setSearchActorMovies] = useState<TMDBMedia[]>([]);
  const [searchActorTV, setSearchActorTV] = useState<TMDBMedia[]>([]);
  const [visibleMoviesCount, setVisibleMoviesCount] = useState(30);
  const [visibleTVCount, setVisibleTVCount] = useState(30);
  const [isActorLoading, setIsActorLoading] = useState(false);

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
    supabase.auth.getUser().then(({ data }) => setAuthUser(toUser(data.user)));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setAuthUser(toUser(session?.user ?? null))
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 60);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Listen to search parameter changes in the URL for bidirectional search sync.
  // `includePeople` is normally user-controlled (so keystrokes don't re-tick it),
  // but a `people=1` flag (set when clicking a cast member) auto-enables it.
  useEffect(() => {
    const searchVal = searchParams?.get("search");
    if (searchVal) {
      setIsSearchOpen(true);
      setSearchQuery(searchVal);
      if (searchParams?.get("people") === "1") {
        setIncludePeople(true);
      }
    }
  }, [searchParams]);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (val.trim() === "") {
      router.push(pathname);
    } else {
      router.push(`?search=${encodeURIComponent(val)}`);
    }
  };

  const handleSearchClose = () => {
    setIsSearchOpen(false);
    setSearchQuery("");
    setSearchResults([]);
    setSelectedSearchActor(null);
    setIncludePeople(false);
    router.push(pathname);
  };

  // Handle Search Input Change
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setSearchResults([]);
      setSelectedSearchActor(null);
      return;
    }

    const delayDebounce = setTimeout(() => {
      startTransition(async () => {
        setSelectedSearchActor(null); // Reset selected actor on new queries
        const res = await searchMediaAction(searchQuery);
        if (res.success && res.data) {
          setSearchResults(res.data);
          
          // Auto-select exact matching actor (e.g. from cast click search redirection)
          const exactActor = res.data.find(
            (item) => item.media_type === "person" &&
            item.name?.toLowerCase().trim() === searchQuery.toLowerCase().trim()
          );
          if (exactActor) {
            handleSearchActorClick(exactActor);
          }
        }
      });
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Click on actor inside search results
  const handleSearchActorClick = async (actor: any) => {
    setSelectedSearchActor(actor);
    setSearchActorMovies([]);
    setSearchActorTV([]);
    setVisibleMoviesCount(30);
    setVisibleTVCount(30);
    setIsActorLoading(true);

    const res = await getPersonCreditsAction(actor.id.toString());
    if (res.success && res.data) {
      const validMedia = res.data.filter((item) => item.poster_path);
      const movies = validMedia.filter((item) => item.media_type === "movie" || !item.media_type);
      const tv = validMedia.filter((item) => item.media_type === "tv");

      // Sort movies and TV series by TMDB rating (vote_average) in descending order
      const sortedMovies = [...movies].sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
      const sortedTV = [...tv].sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));

      setSearchActorMovies(sortedMovies);
      setSearchActorTV(sortedTV);
    }
    setIsActorLoading(false);
  };

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Wishlist", href: "/wishlist" },
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
                  {active && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent rounded-full" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="hidden md:flex items-center gap-4">
          <button 
            onClick={() => setIsSearchOpen(true)}
            aria-label="Search" 
            className="p-2 text-fg-secondary hover:text-fg hover:bg-white/[0.06] rounded-full transition-all cursor-pointer"
          >
            <Search className="w-5 h-5" />
          </button>
          <button aria-label="Notifications" className="p-2 text-fg-secondary hover:text-fg hover:bg-white/[0.06] rounded-full transition-all relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full" />
          </button>
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
        {/* Close button */}
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

          {/* Auth entry */}
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
              onClick={() => {
                setMobileMenuOpen(false);
                setIsSearchOpen(true);
              }}
              className="p-3 bg-surface hover:bg-surface-hover rounded-full transition-all cursor-pointer"
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

      {/* Search panel — opens directly below the navbar */}
      {isSearchOpen && (
        <div className="fixed inset-x-0 top-[64px] bottom-0 bg-bg backdrop-blur-2xl z-40 overflow-y-auto animate-fade-in flex flex-col px-6 md:px-12 pt-6 pb-12">
          {/* Close button & Input header */}
          <div className="w-full flex flex-col mb-8 border-b border-white/[0.08] pb-4">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-4 flex-1">
                <Search className="w-6 h-6 text-accent" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search movies, TV shows, directors, actors..."
                  className="w-full bg-transparent text-xl font-bold tracking-tight text-white placeholder-muted outline-none border-none"
                />
              </div>
              <button
                onClick={handleSearchClose}
                className="p-2.5 bg-surface hover:bg-surface-hover hover:text-accent text-fg-secondary border border-border rounded-xl transition-all cursor-pointer"
                aria-label="Close search"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Custom Checkbox to include Actors/Crew too */}
            <div className="flex items-center gap-2 mt-4 px-1 text-xs select-none">
              <label className="inline-flex items-center gap-2 text-fg-secondary hover:text-fg transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={includePeople}
                  onChange={(e) => setIncludePeople(e.target.checked)}
                  className="w-4 h-4 rounded border-border bg-surface text-accent focus:ring-accent focus:ring-opacity-25"
                />
                <span>Include actors and crew in search results</span>
              </label>
            </div>
          </div>

          {/* Results display */}
          <div className="w-full flex-1 flex flex-col">
            {isPending && (
              <div className="flex items-center justify-center py-20 gap-3">
                <Loader2 className="w-6 h-6 text-accent animate-spin" />
                <span className="text-sm text-fg-secondary">Searching catalog...</span>
              </div>
            )}

            {(() => {
              const filteredResults = searchResults.filter((item) => includePeople || item.media_type !== "person");
              return (
                <>
                  {!isPending && searchQuery.trim() !== "" && filteredResults.length === 0 && (
                    <div className="text-center py-20 text-muted">
                      <Film className="w-12 h-12 mx-auto mb-4 opacity-40 text-accent animate-pulse" />
                      <h3 className="text-lg font-bold text-fg mb-1">No Results Found</h3>
                      <p className="text-sm max-w-xs mx-auto">We couldn&apos;t find anything matching &quot;{searchQuery}&quot;.</p>
                    </div>
                  )}

            {/* CASE A: An Actor is Selected inside Search - Show categorized movies/shows */}
            {!isPending && selectedSearchActor ? (
              <div className="flex flex-col gap-6 w-full animate-fade-in">
                {/* Back to search results header */}
                <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
                  <button
                    onClick={() => setSelectedSearchActor(null)}
                    className="inline-flex items-center gap-1.5 text-xs text-accent bg-accent/10 border border-accent/20 px-3 py-1.5 rounded-full hover:bg-accent hover:text-white transition-all cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to search list</span>
                  </button>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-accent">Actor Profile</span>
                      <h3 className="text-sm font-bold text-white leading-tight">{selectedSearchActor.name}</h3>
                    </div>
                    {selectedSearchActor.profile_path ? (
                      <div className="w-12 h-12 rounded-xl overflow-hidden border border-accent/30 shadow-[0_0_12px_rgba(229,62,79,0.25)] flex-none">
                        <img
                          src={`https://image.tmdb.org/t/p/w185${selectedSearchActor.profile_path}`}
                          alt={selectedSearchActor.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-surface-hover flex items-center justify-center border border-border flex-none">
                        <User className="w-6 h-6 text-fg-secondary" />
                      </div>
                    )}
                  </div>
                </div>

                {isActorLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Loader2 className="w-8 h-8 text-accent animate-spin" />
                    <p className="text-sm text-fg-secondary animate-pulse">Loading work credits...</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-8">
                    {/* Category 1: Movies */}
                    {searchActorMovies.length > 0 && (
                      <div>
                        <h4 className="font-display text-sm font-extrabold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                          <Film className="w-4 h-4 text-accent" />
                          <span>Feature Movies ({searchActorMovies.length})</span>
                        </h4>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-5">
                          {searchActorMovies.slice(0, visibleMoviesCount).map((item) => (
                            <Link
                              key={item.id}
                              href={`/watch/movie/${item.id}`}
                              onClick={() => {
                                setIsSearchOpen(false);
                                setSearchQuery("");
                                setSearchResults([]);
                                setSelectedSearchActor(null);
                              }}
                              className="group block cursor-pointer"
                            >
                              <div className="relative aspect-[2/3] w-full bg-surface-hover rounded-xl overflow-hidden border border-border group-hover:border-accent transition-all duration-300">
                                <img
                                  src={`https://image.tmdb.org/t/p/w300${item.poster_path}`}
                                  alt={item.title}
                                  className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
                                  loading="lazy"
                                />
                                <WishlistHeart item={item} mediaType="movie" />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity duration-300 z-20">
                                  <div className="w-9 h-9 bg-accent text-white rounded-full flex items-center justify-center shadow-lg transform scale-75 group-hover:scale-100 transition-transform">
                                    <Play className="w-3.5 h-3.5 fill-white translate-x-0.5" />
                                  </div>
                                </div>
                              </div>
                              <h5 className="text-[11px] sm:text-xs font-bold truncate text-fg mt-2 group-hover:text-accent transition-colors">
                                {item.title}
                              </h5>
                              <p className="text-[9px] sm:text-[10px] text-muted mt-0.5 flex items-center justify-between">
                                <span>{item.release_date ? item.release_date.split("-")[0] : ""}</span>
                                <span className="flex items-center gap-0.5 text-gold font-extrabold bg-gold/10 px-1.5 py-0.5 rounded flex-none">
                                  <Star className="w-2.5 h-2.5 fill-gold stroke-gold" />
                                  {item.vote_average ? item.vote_average.toFixed(1) : "N/A"}
                                </span>
                              </p>
                            </Link>
                          ))}
                        </div>

                        {searchActorMovies.length > visibleMoviesCount && (
                          <div className="flex justify-center mt-6">
                            <button
                              onClick={() => setVisibleMoviesCount((prev) => prev + 30)}
                              className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase border border-accent/30 text-white bg-accent/10 hover:bg-accent hover:border-accent hover:shadow-[0_4px_15px_rgba(229,62,79,0.35)] transition-all duration-300 cursor-pointer shadow-lg"
                            >
                              Load More Movies
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Category 2: TV Series */}
                    {searchActorTV.length > 0 && (
                      <div>
                        <h4 className="font-display text-sm font-extrabold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                          <Film className="w-4 h-4 text-accent" />
                          <span>Television Series ({searchActorTV.length})</span>
                        </h4>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-5">
                          {searchActorTV.slice(0, visibleTVCount).map((item) => (
                            <Link
                              key={item.id}
                              href={`/watch/tv/${item.id}`}
                              onClick={() => {
                                setIsSearchOpen(false);
                                setSearchQuery("");
                                setSearchResults([]);
                                setSelectedSearchActor(null);
                              }}
                              className="group block cursor-pointer"
                            >
                              <div className="relative aspect-[2/3] w-full bg-surface-hover rounded-xl overflow-hidden border border-border group-hover:border-accent transition-all duration-300">
                                <img
                                  src={`https://image.tmdb.org/t/p/w300${item.poster_path}`}
                                  alt={item.name}
                                  className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
                                  loading="lazy"
                                />
                                <WishlistHeart item={item} mediaType="tv" />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity duration-300 z-20">
                                  <div className="w-9 h-9 bg-accent text-white rounded-full flex items-center justify-center shadow-lg transform scale-75 group-hover:scale-100 transition-transform">
                                    <Play className="w-3.5 h-3.5 fill-white translate-x-0.5" />
                                  </div>
                                </div>
                              </div>
                              <h5 className="text-[11px] sm:text-xs font-bold truncate text-fg mt-2 group-hover:text-accent transition-colors">
                                {item.name}
                              </h5>
                              <p className="text-[9px] sm:text-[10px] text-muted mt-0.5 flex items-center justify-between">
                                <span>{item.first_air_date ? item.first_air_date.split("-")[0] : ""}</span>
                                <span className="flex items-center gap-0.5 text-gold font-extrabold bg-gold/10 px-1.5 py-0.5 rounded flex-none">
                                  <Star className="w-2.5 h-2.5 fill-gold stroke-gold" />
                                  {item.vote_average ? item.vote_average.toFixed(1) : "N/A"}
                                </span>
                              </p>
                            </Link>
                          ))}
                        </div>

                        {searchActorTV.length > visibleTVCount && (
                          <div className="flex justify-center mt-6">
                            <button
                              onClick={() => setVisibleTVCount((prev) => prev + 30)}
                              className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase border border-accent/30 text-white bg-accent/10 hover:bg-accent hover:border-accent hover:shadow-[0_4px_15px_rgba(229,62,79,0.35)] transition-all duration-300 cursor-pointer shadow-lg"
                            >
                              Load More TV Series
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* CASE B: General Multi-Search Result List (Movies, TV Shows, and Actors) */
              !isPending && filteredResults.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-5">
                  {filteredResults.map((item) => {
                    const isPerson = item.media_type === "person";
                    const profilePath = (item as any).profile_path as string | undefined;
                    const img = item.poster_path
                      ? `https://image.tmdb.org/t/p/w300${item.poster_path}`
                      : profilePath
                        ? `https://image.tmdb.org/t/p/w300${profilePath}`
                        : "https://picsum.photos/seed/cinevodefault/300/450";
                    const mt: "movie" | "tv" = item.media_type === "tv" ? "tv" : "movie";
                    const year = item.release_date
                      ? item.release_date.split("-")[0]
                      : item.first_air_date
                        ? item.first_air_date.split("-")[0]
                        : "";

                    const poster = (
                      <div className="relative aspect-[2/3] w-full bg-surface-hover rounded-xl overflow-hidden border border-border group-hover:border-accent transition-all duration-300">
                        <img
                          src={img}
                          alt={item.title || item.name}
                          className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                        {!isPerson && <WishlistHeart item={item} mediaType={mt} />}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity duration-300 z-20">
                          <div className="w-9 h-9 bg-accent text-white rounded-full flex items-center justify-center shadow-lg transform scale-75 group-hover:scale-100 transition-transform">
                            {isPerson ? <User className="w-4 h-4" /> : <Play className="w-3.5 h-3.5 fill-white translate-x-0.5" />}
                          </div>
                        </div>
                        {!isPerson && item.vote_average ? (
                          <span className="absolute bottom-2 left-2 z-10 flex items-center gap-0.5 text-[10px] font-bold text-gold bg-black/70 px-1.5 py-0.5 rounded">
                            <Star className="w-2.5 h-2.5 fill-gold stroke-gold" />
                            {item.vote_average.toFixed(1)}
                          </span>
                        ) : null}
                      </div>
                    );

                    const meta = (
                      <>
                        <h5 className="text-[11px] sm:text-xs font-bold truncate text-fg mt-2 group-hover:text-accent transition-colors">
                          {item.title || item.name}
                        </h5>
                        <p className="text-[9px] sm:text-[10px] text-muted mt-0.5 truncate">
                          {isPerson ? "Actor / Crew" : `${mt === "tv" ? "TV Show" : "Movie"}${year ? ` • ${year}` : ""}`}
                        </p>
                      </>
                    );

                    if (isPerson) {
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSearchActorClick(item)}
                          className="group block text-left cursor-pointer"
                        >
                          {poster}
                          {meta}
                        </button>
                      );
                    }

                    return (
                      <Link
                        key={item.id}
                        href={`/watch/${mt}/${item.id}`}
                        onClick={handleSearchClose}
                        className="group block cursor-pointer"
                      >
                        {poster}
                        {meta}
                      </Link>
                    );
                  })}
                </div>
              )
            )}
                </>
              );
            })()}
          </div>
        </div>
      )}
    </>
  );
}

export default function Nav() {
  return (
    <Suspense fallback={<div className="h-[72px] bg-bg/90" />}>
      <NavInner />
    </Suspense>
  );
}
