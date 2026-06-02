"use client";

import React, { useState, useEffect, useTransition, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Search, ArrowLeft, Loader2, Film, Tag, User, Star, Play } from "lucide-react";
import { searchMediaAction, getPersonCreditsAction } from "@/app/actions/tmdb-actions";
import { TMDBMedia } from "@/lib/tmdb";
import WishlistHeart from "@/components/wishlist/WishlistHeart";
import CustomSelect, { type SelectOption } from "@/components/ui/CustomSelect";
import { useGenres } from "@/lib/genres";

const gridClasses =
  "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-5";

const ALL_GENRES: SelectOption[] = [{ label: "All genres", value: "" }];

export default function SearchClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TMDBMedia[]>([]);
  const [includePeople, setIncludePeople] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Genre filter — narrows the search results by genre. Genre lists are cached
  // in localStorage (see lib/genres); movie + TV lists are merged by name so a
  // single dropdown works without a media-type toggle (that lives in Browse).
  const genreCache = useGenres();
  const [genre, setGenre] = useState("");

  // Selected actor credits state
  const [selectedActor, setSelectedActor] = useState<any | null>(null);
  const [actorMovies, setActorMovies] = useState<TMDBMedia[]>([]);
  const [actorTV, setActorTV] = useState<TMDBMedia[]>([]);
  const [visibleMoviesCount, setVisibleMoviesCount] = useState(30);
  const [visibleTVCount, setVisibleTVCount] = useState(30);
  const [isActorLoading, setIsActorLoading] = useState(false);

  // Seed query + people flag from the URL (e.g. cast-member click → /search?q=…&people=1)
  useEffect(() => {
    const q = searchParams?.get("q") ?? "";
    setSearchQuery(q);
    if (searchParams?.get("people") === "1") setIncludePeople(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    const params = new URLSearchParams(searchParams?.toString());
    if (val.trim() === "") params.delete("q");
    else params.set("q", val);
    router.replace(`/search${params.toString() ? `?${params}` : ""}`, { scroll: false });
  };

  // Debounced multi-search
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setSearchResults([]);
      setSelectedActor(null);
      return;
    }
    const delay = setTimeout(() => {
      startTransition(async () => {
        setSelectedActor(null);
        const res = await searchMediaAction(searchQuery);
        if (res.success && res.data) {
          setSearchResults(res.data);
          const exactActor = res.data.find(
            (item) =>
              item.media_type === "person" &&
              item.name?.toLowerCase().trim() === searchQuery.toLowerCase().trim()
          );
          if (exactActor) handleActorClick(exactActor);
        }
      });
    }, 400);
    return () => clearTimeout(delay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const handleActorClick = async (actor: any) => {
    setSelectedActor(actor);
    setActorMovies([]);
    setActorTV([]);
    setVisibleMoviesCount(30);
    setVisibleTVCount(30);
    setIsActorLoading(true);

    const res = await getPersonCreditsAction(actor.id.toString());
    if (res.success && res.data) {
      const valid = res.data.filter((item) => item.poster_path);
      const movies = valid.filter((item) => item.media_type === "movie" || !item.media_type);
      const tv = valid.filter((item) => item.media_type === "tv");
      setActorMovies([...movies].sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0)));
      setActorTV([...tv].sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0)));
    }
    setIsActorLoading(false);
  };

  // Merge movie + TV genres by name → one dropdown. Each name maps to the set
  // of TMDB ids it covers (movie + TV can differ), used to filter results.
  const { genreOptions, genreIdsByName } = useMemo(() => {
    const idsByName = new Map<string, Set<number>>();
    for (const g of [...genreCache.movie, ...genreCache.tv]) {
      const key = g.name.toLowerCase();
      if (!idsByName.has(key)) idsByName.set(key, new Set());
      idsByName.get(key)!.add(g.id);
    }
    const names = [...idsByName.keys()].sort();
    const options: SelectOption[] = [
      { label: "All genres", value: "" },
      ...names.map((n) => ({
        // Title-case the merged name for display; value is the lowercase key.
        label: n.replace(/\b\w/g, (c) => c.toUpperCase()),
        value: n,
      })),
    ];
    return { genreOptions: options, genreIdsByName: idsByName };
  }, [genreCache]);

  const selectedGenreIds = genre ? genreIdsByName.get(genre) : undefined;

  const filteredResults = searchResults
    .filter((item) => includePeople || item.media_type !== "person")
    .filter((item) => {
      if (!selectedGenreIds) return true;
      // People have no genres — drop them when a genre filter is active.
      if (item.media_type === "person") return false;
      return (item.genre_ids || []).some((id) => selectedGenreIds.has(id));
    });

  return (
    <section className="min-h-screen w-full px-6 md:px-12 pt-[88px] pb-16">
      {/* Header / input */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="w-full flex flex-col mb-8 border-b border-white/[0.08] pb-4"
      >
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
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 p-2.5 sm:px-3.5 bg-surface hover:bg-surface-hover hover:text-accent text-fg-secondary border border-border rounded-xl transition-all cursor-pointer"
            aria-label="Back to home"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline text-sm font-semibold">Home</span>
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 mt-4 px-1 text-xs select-none">
          <CustomSelect
            value={genre}
            options={genreOptions.length > 1 ? genreOptions : ALL_GENRES}
            onChange={setGenre}
            ariaLabel="Filter by genre"
            icon={<Tag className="w-3.5 h-3.5" />}
          />

          <label className="inline-flex items-center gap-2 text-fg-secondary hover:text-fg transition-colors cursor-pointer ml-1">
            <input
              type="checkbox"
              checked={includePeople}
              onChange={(e) => setIncludePeople(e.target.checked)}
              className="w-4 h-4 rounded border-border bg-surface text-accent focus:ring-accent focus:ring-opacity-25"
            />
            <span>Include actors and crew in search results</span>
          </label>
        </div>
      </motion.div>

      {/* Results */}
      <div className="w-full flex-1 flex flex-col">
        {isPending && (
          <div className="flex items-center justify-center py-20 gap-3">
            <Loader2 className="w-6 h-6 text-accent animate-spin" />
            <span className="text-sm text-fg-secondary">Searching catalog...</span>
          </div>
        )}

        {!isPending && searchQuery.trim() === "" && (
          <div className="text-center py-24 text-muted">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-30 text-accent" />
            <h3 className="text-lg font-bold text-fg mb-1">Search Cinevo</h3>
            <p className="text-sm max-w-xs mx-auto">Find any movie, TV show, actor or director.</p>
          </div>
        )}

        {!isPending && searchQuery.trim() !== "" && filteredResults.length === 0 && !selectedActor && (
          <div className="text-center py-20 text-muted">
            <Film className="w-12 h-12 mx-auto mb-4 opacity-40 text-accent animate-pulse" />
            <h3 className="text-lg font-bold text-fg mb-1">No Results Found</h3>
            <p className="text-sm max-w-xs mx-auto">We couldn&apos;t find anything matching &quot;{searchQuery}&quot;.</p>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* CASE A: Actor selected → categorized filmography */}
          {!isPending && selectedActor ? (
            <motion.div
              key="actor"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-6 w-full"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
                <button
                  onClick={() => setSelectedActor(null)}
                  className="inline-flex items-center gap-1.5 text-xs text-accent bg-accent/10 border border-accent/20 px-3 py-1.5 rounded-full hover:bg-accent hover:text-white transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to search list</span>
                </button>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-accent">Actor Profile</span>
                    <h3 className="text-sm font-bold text-white leading-tight">{selectedActor.name}</h3>
                  </div>
                  {selectedActor.profile_path ? (
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-accent/30 shadow-[0_0_12px_rgba(229,62,79,0.25)] flex-none">
                      <Image src={`https://image.tmdb.org/t/p/w185${selectedActor.profile_path}`} alt={selectedActor.name} width={48} height={48} className="w-full h-full object-cover" />
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
                  {actorMovies.length > 0 && (
                    <CreditCategory
                      title={`Feature Movies (${actorMovies.length})`}
                      items={actorMovies}
                      visible={visibleMoviesCount}
                      onMore={() => setVisibleMoviesCount((p) => p + 30)}
                      mediaType="movie"
                    />
                  )}
                  {actorTV.length > 0 && (
                    <CreditCategory
                      title={`Television Series (${actorTV.length})`}
                      items={actorTV}
                      visible={visibleTVCount}
                      onMore={() => setVisibleTVCount((p) => p + 30)}
                      mediaType="tv"
                    />
                  )}
                </div>
              )}
            </motion.div>
          ) : (
            /* CASE B: General multi-search results */
            !isPending && filteredResults.length > 0 && (
              <motion.div
                key="results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={gridClasses}
              >
                {filteredResults.map((item, i) => {
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
                      <Image src={img} alt={item.title || item.name || ""} fill sizes="(max-width: 640px) 50vw, 12vw" className="object-cover transition duration-500 group-hover:scale-105" />
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

                  const inner = (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: Math.min(i * 0.02, 0.4), ease: "easeOut" }}
                    >
                      {poster}
                      {meta}
                    </motion.div>
                  );

                  if (isPerson) {
                    return (
                      <button key={item.id} onClick={() => handleActorClick(item)} className="group block text-left cursor-pointer">
                        {inner}
                      </button>
                    );
                  }
                  return (
                    <Link key={item.id} href={`/watch/${mt}/${item.id}`} className="group block cursor-pointer">
                      {inner}
                    </Link>
                  );
                })}
              </motion.div>
            )
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

/* ─── Actor filmography category (movies / tv) ─────────────── */
function CreditCategory({
  title, items, visible, onMore, mediaType,
}: {
  title: string;
  items: TMDBMedia[];
  visible: number;
  onMore: () => void;
  mediaType: "movie" | "tv";
}) {
  return (
    <div>
      <h4 className="font-display text-sm font-extrabold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
        <Film className="w-4 h-4 text-accent" />
        <span>{title}</span>
      </h4>
      <div className={gridClasses}>
        {items.slice(0, visible).map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: Math.min(i * 0.02, 0.4), ease: "easeOut" }}
          >
            <Link href={`/watch/${mediaType}/${item.id}`} className="group block cursor-pointer">
              <div className="relative aspect-[2/3] w-full bg-surface-hover rounded-xl overflow-hidden border border-border group-hover:border-accent transition-all duration-300">
                <Image
                  src={`https://image.tmdb.org/t/p/w300${item.poster_path}`}
                  alt={item.title || item.name || ""}
                  fill
                  sizes="(max-width: 640px) 50vw, 12vw"
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
                <WishlistHeart item={item} mediaType={mediaType} />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity duration-300 z-20">
                  <div className="w-9 h-9 bg-accent text-white rounded-full flex items-center justify-center shadow-lg transform scale-75 group-hover:scale-100 transition-transform">
                    <Play className="w-3.5 h-3.5 fill-white translate-x-0.5" />
                  </div>
                </div>
              </div>
              <h5 className="text-[11px] sm:text-xs font-bold truncate text-fg mt-2 group-hover:text-accent transition-colors">
                {item.title || item.name}
              </h5>
              <p className="text-[9px] sm:text-[10px] text-muted mt-0.5 flex items-center justify-between">
                <span>{(item.release_date || item.first_air_date || "").split("-")[0]}</span>
                <span className="flex items-center gap-0.5 text-gold font-extrabold bg-gold/10 px-1.5 py-0.5 rounded flex-none">
                  <Star className="w-2.5 h-2.5 fill-gold stroke-gold" />
                  {item.vote_average ? item.vote_average.toFixed(1) : "N/A"}
                </span>
              </p>
            </Link>
          </motion.div>
        ))}
      </div>
      {items.length > visible && (
        <div className="flex justify-center mt-6">
          <button
            onClick={onMore}
            className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase border border-accent/30 text-white bg-accent/10 hover:bg-accent hover:border-accent hover:shadow-[0_4px_15px_rgba(229,62,79,0.35)] transition-all duration-300 cursor-pointer shadow-lg"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
}
