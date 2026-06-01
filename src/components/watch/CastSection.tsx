"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Film, ChevronDown, ChevronUp } from "lucide-react";
import { TMDBCast } from "@/lib/tmdb";

interface CastSectionProps {
  cast: TMDBCast[];
}

export default function CastSection({ cast }: CastSectionProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);

  const INITIAL_LIMIT = 20;
  const visibleCast = isExpanded ? cast : cast.slice(0, INITIAL_LIMIT);

  const handleActorClick = (actor: TMDBCast) => {
    // Open the actor's dedicated profile + filmography page.
    router.push(`/person/${actor.id}`);
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Principal Cast Grid with Show More */}
      {cast.length > 0 && (
        <section className="px-6 md:px-12 pt-10 w-full">
          <h2 className="font-display text-xl md:text-2xl font-bold mb-5 text-fg">
            Principal Cast
          </h2>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-5 sm:gap-6">
            {visibleCast.map((c) => {
              return (
                <div 
                  key={c.id} 
                  onClick={() => handleActorClick(c)}
                  className="text-center group cursor-pointer hover:scale-105 transition-all duration-350 p-2 rounded-2xl border border-transparent hover:bg-accent/5 hover:border-accent/20"
                >
                  {/* Portrait photo */}
                  <div className="w-full aspect-[3/4] mb-3 rounded-xl overflow-hidden bg-surface border-2 border-border group-hover:border-accent transition-all shadow-md relative group-hover:shadow-[0_0_15px_rgba(229,62,79,0.25)]">
                    <Image
                      src={c.profile_path ? `https://image.tmdb.org/t/p/w300${c.profile_path}` : `https://i.pravatar.cc/300?u=${c.id}`}
                      alt={c.name}
                      fill
                      sizes="(max-width: 640px) 50vw, 150px"
                      className="object-cover transition duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <Film className="w-4 h-4 text-white animate-pulse" />
                    </div>
                  </div>
                  
                  {/* Name */}
                  <div className="text-xs md:text-sm font-bold truncate text-fg group-hover:text-accent transition-colors px-0.5">
                    {c.name}
                  </div>
                  <div className="text-[10px] md:text-xs text-muted mt-0.5 truncate leading-tight px-0.5">
                    {c.character}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Show More / Show Less Toggle Button */}
          {cast.length > INITIAL_LIMIT && (
            <div className="flex justify-center mt-6">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full text-xs font-bold tracking-wider uppercase border border-accent/30 text-white bg-accent/10 hover:bg-accent hover:border-accent hover:shadow-[0_4px_15px_rgba(229,62,79,0.3)] transition-all duration-300 cursor-pointer shadow-lg"
              >
                {isExpanded ? (
                  <>
                    <span>Show Less</span>
                    <ChevronUp className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span>Show More ({cast.length - INITIAL_LIMIT} remaining)</span>
                    <ChevronDown className="w-4 h-4 animate-bounce" />
                  </>
                )}
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
