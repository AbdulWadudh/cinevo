import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Star, Play, User } from "lucide-react";
import Nav from "@/components/Nav";
import WishlistHeart from "@/components/wishlist/WishlistHeart";
import { tmdb } from "@/lib/tmdb";
import { site } from "@/config";

interface PageProps { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const person = await tmdb.getPerson(id);
  // person name uses the layout title template ("%s · <app>"); the fallback is
  // absolute so it doesn't get doubled into "<app> · <app>".
  return person?.name ? { title: person.name } : { title: { absolute: site.name } };
}

function age(birthday: string | null, deathday: string | null): number | null {
  if (!birthday) return null;
  const end = deathday ? new Date(deathday) : new Date();
  const b = new Date(birthday);
  let a = end.getFullYear() - b.getFullYear();
  const m = end.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && end.getDate() < b.getDate())) a--;
  return a;
}

export default async function PersonPage({ params }: PageProps) {
  const { id } = await params;
  const [person, credits] = await Promise.all([tmdb.getPerson(id), tmdb.getPersonCredits(id)]);

  if (!person) {
    return (
      <div className="flex-1 w-full bg-bg min-h-screen">
        <Nav />
        <div className="flex flex-col items-center justify-center min-h-screen text-center p-6">
          <User className="w-16 h-16 text-accent mb-4" />
          <h1 className="text-2xl font-bold font-display mb-2">Person Not Found</h1>
          <Link href="/" className="mt-4 bg-accent text-white px-6 py-3 rounded-lg font-semibold hover:bg-accent-hover transition-colors">Return Home</Link>
        </div>
      </div>
    );
  }

  const works = credits.filter((c) => c.poster_path).slice(0, 60);
  const personAge = age(person.birthday, person.deathday);

  return (
    <div className="flex-1 w-full bg-bg min-h-screen pb-16">
      <Nav />
      <section className="pt-24 md:pt-28 px-6 md:px-12 max-w-6xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-fg-secondary bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:text-fg px-3.5 py-2 rounded-lg transition-all mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> <span>Back to Home</span>
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-6 mb-12">
          <div className="relative w-40 h-40 sm:w-48 sm:h-60 flex-none rounded-2xl overflow-hidden border border-white/[0.1] bg-surface-hover">
            {person.profile_path ? (
              <Image src={`https://image.tmdb.org/t/p/w300${person.profile_path}`} alt={person.name} fill sizes="(max-width: 640px) 160px, 192px" className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center"><User className="w-12 h-12 text-fg-secondary" /></div>
            )}
          </div>
          <div className="flex-1">
            <h1 className="font-display text-3xl md:text-5xl font-extrabold tracking-tight mb-2">{person.name}</h1>
            <div className="flex items-center gap-2.5 flex-wrap text-xs sm:text-sm text-fg-secondary mb-4">
              {person.known_for_department && <span className="bg-accent/15 text-accent border border-accent/25 px-2.5 py-0.5 rounded-full font-semibold">{person.known_for_department}</span>}
              {personAge !== null && <span>{personAge} years{person.deathday ? " (at death)" : ""}</span>}
              {person.place_of_birth && <><span>&bull;</span><span>{person.place_of_birth}</span></>}
            </div>
            {person.biography && (
              <p className="text-sm text-fg-secondary leading-relaxed max-w-3xl line-clamp-6">{person.biography}</p>
            )}
          </div>
        </div>

        {/* Known for */}
        <h2 className="font-display text-xl md:text-2xl font-bold mb-5">Known For</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
          {works.map((item) => {
            const mt = item.media_type === "tv" ? "tv" : "movie";
            const year = (item.release_date || item.first_air_date || "").split("-")[0];
            return (
              <Link key={`${item.id}-${item.media_type}`} href={`/watch/${mt}/${item.id}`} className="group block cursor-pointer">
                <div className="relative aspect-[2/3] w-full bg-surface-hover rounded-xl overflow-hidden border border-border group-hover:border-accent transition-all duration-300">
                  <Image src={`https://image.tmdb.org/t/p/w300${item.poster_path}`} alt={item.title || item.name || ""} fill sizes="(max-width: 640px) 50vw, 16vw" className="object-cover transition duration-500 group-hover:scale-105" />
                  <WishlistHeart item={item} mediaType={mt} />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity duration-300 z-10">
                    <div className="w-10 h-10 bg-accent text-white rounded-full flex items-center justify-center shadow-lg scale-90 group-hover:scale-100 transition-transform">
                      <Play className="w-4 h-4 fill-white translate-x-0.5" />
                    </div>
                  </div>
                  {item.vote_average ? (
                    <span className="absolute bottom-2 left-2 z-10 flex items-center gap-0.5 text-[10px] font-bold text-gold bg-black/70 px-1.5 py-0.5 rounded">
                      <Star className="w-2.5 h-2.5 fill-gold stroke-gold" />{item.vote_average.toFixed(1)}
                    </span>
                  ) : null}
                </div>
                <h5 className="text-[11px] sm:text-xs font-bold truncate text-fg mt-2 group-hover:text-accent transition-colors">{item.title || item.name}</h5>
                {year && <p className="text-[9px] sm:text-[10px] text-muted mt-0.5">{year}</p>}
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
