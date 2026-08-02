"use client";

import React, { useMemo, useState } from "react";
import { Film, Tv2, Languages, Sparkles, Loader2 } from "lucide-react";
import CustomSelect, { type SelectOption } from "@/components/ui/CustomSelect";
import { useGenres } from "@/lib/genres";
import type { RevealPreference } from "./types";

const LANGUAGES: SelectOption[] = [
  { label: "Any language", value: "" },
  { label: "English", value: "en" },
  { label: "Hindi", value: "hi" },
  { label: "Telugu", value: "te" },
  { label: "Tamil", value: "ta" },
  { label: "Malayalam", value: "ml" },
  { label: "Kannada", value: "kn" },
  { label: "Korean", value: "ko" },
  { label: "Japanese", value: "ja" },
  { label: "Spanish", value: "es" },
  { label: "French", value: "fr" },
];

const CURRENT_YEAR = 2026;
const YEARS: SelectOption[] = Array.from({ length: CURRENT_YEAR - 1949 }, (_, i) => {
  const y = String(CURRENT_YEAR - i);
  return { label: y, value: y };
});

interface MergedGenre { name: string; movie?: string; tv?: string }

export default function PreferencePanel({
  loading,
  onGenerate,
}: {
  loading: boolean;
  onGenerate: (prefs: RevealPreference[], count: number) => void;
}) {
  const genreCache = useGenres();
  // Both types on by default; toggleable (at least one must stay on).
  const [typeMovie, setTypeMovie] = useState(true);
  const [typeTv, setTypeTv] = useState(true);
  const [language, setLanguage] = useState("");
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [selected, setSelected] = useState<string[]>([]); // genre names
  const [count, setCount] = useState(5);

  // Merge movie + TV genres by name so one chip can resolve to either id.
  const merged = useMemo<MergedGenre[]>(() => {
    const m = new Map<string, MergedGenre>();
    genreCache.movie.forEach((g) => m.set(g.name, { ...(m.get(g.name) ?? { name: g.name }), movie: String(g.id) }));
    genreCache.tv.forEach((g) => m.set(g.name, { ...(m.get(g.name) ?? { name: g.name }), tv: String(g.id) }));
    return [...m.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [genreCache]);

  const visibleGenres = merged.filter((g) => (typeMovie && g.movie) || (typeTv && g.tv));

  const toggleType = (which: "movie" | "tv") => {
    if (which === "movie") setTypeMovie((v) => (v && !typeTv ? v : !v));
    else setTypeTv((v) => (v && !typeMovie ? v : !v));
  };

  const toggleGenre = (name: string) =>
    setSelected((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));

  const submit = () => {
    const types: ("movie" | "tv")[] = [];
    if (typeMovie) types.push("movie");
    if (typeTv) types.push("tv");
    const prefs: RevealPreference[] = types.map((mediaType) => ({
      mediaType,
      genres: selected
        .map((n) => merged.find((g) => g.name === n)?.[mediaType])
        .filter((x): x is string => !!x),
      language: language || undefined,
      yearFrom: yearFrom || undefined,
      yearTo: yearTo || undefined,
    }));
    onGenerate(prefs, count);
  };

  const typeBtn = (active: boolean) =>
    `flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${active ? "bg-accent-strong text-white" : "text-fg-secondary hover:text-fg"}`;

  return (
    <div className="bg-surface/40 border border-white/[0.08] rounded-2xl p-5 sm:p-6 mb-8 text-left">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Type — both on by default, each toggleable */}
        <div>
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted mb-2 block">Type</label>
          <div className="flex items-center gap-1.5 bg-surface border border-border rounded-xl p-1 w-max">
            <button onClick={() => toggleType("movie")} className={typeBtn(typeMovie)}>
              <Film className="w-3.5 h-3.5" /> Movies
            </button>
            <button onClick={() => toggleType("tv")} className={typeBtn(typeTv)}>
              <Tv2 className="w-3.5 h-3.5" /> TV
            </button>
          </div>
        </div>

        {/* Language */}
        <div>
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted mb-2 block">Language</label>
          <CustomSelect value={language} options={LANGUAGES} onChange={setLanguage} ariaLabel="Language" icon={<Languages className="w-3.5 h-3.5" />} />
        </div>

        {/* Year range */}
        <div className="md:col-span-2">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted mb-2 block">Release years</label>
          <div className="flex items-center gap-2.5">
            <CustomSelect value={yearFrom} options={[{ label: "From", value: "" }, ...YEARS]} onChange={setYearFrom} ariaLabel="Year from" />
            <span className="text-muted text-sm">–</span>
            <CustomSelect value={yearTo} options={[{ label: "To", value: "" }, ...YEARS]} onChange={setYearTo} ariaLabel="Year to" />
          </div>
        </div>

        {/* Genres multi-select */}
        <div className="md:col-span-2">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted mb-2 block">
            Genres {selected.length > 0 && <span className="text-accent">({selected.length})</span>}
          </label>
          <div className="flex flex-wrap gap-2">
            {visibleGenres.length === 0 && <span className="text-xs text-muted">Loading genres…</span>}
            {visibleGenres.map((g) => {
              const active = selected.includes(g.name);
              return (
                <button
                  key={g.name}
                  onClick={() => toggleGenre(g.name)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${active ? "bg-accent-strong border-accent text-white" : "bg-surface border-border text-fg-secondary hover:border-fg-secondary/50 hover:text-fg"}`}
                >
                  {g.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Count (1–25) */}
        <div className="md:col-span-2">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted mb-2 flex items-center justify-between">
            <span>How many cards</span>
            <span className="text-accent text-sm font-extrabold">{count}</span>
          </label>
          <input
            type="range"
            min={1}
            max={25}
            step={1}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-full accent-accent cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-muted mt-1"><span>1</span><span>25</span></div>
        </div>
      </div>

      <div className="flex justify-end mt-5">
        <button
          onClick={submit}
          disabled={loading}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-accent-strong text-white hover:bg-accent-strong-hover active:scale-95 transition-all shadow-[0_8px_30px_rgba(229,62,79,0.35)] cursor-pointer disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Reveal {count} {count === 1 ? "pick" : "picks"}
        </button>
      </div>
    </div>
  );
}
