import type { TMDBDetails } from "@/lib/tmdb";
import type { DetailFact, DetailLink } from "./types";

export const titleOf = (details: TMDBDetails) =>
  details.title || details.name || "Untitled";

export const yearOf = (details: TMDBDetails) => {
  const raw = details.release_date || details.first_air_date;
  return raw ? raw.slice(0, 4) : "";
};

export const fullDateOf = (details: TMDBDetails) => {
  const raw = details.release_date || details.first_air_date;
  if (!raw) return "";
  return new Date(raw).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
};

export const runtimeOf = (details: TMDBDetails) => {
  if (details.runtime) {
    const hours = Math.floor(details.runtime / 60);
    const minutes = details.runtime % 60;
    return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
  }
  const episode = details.episode_run_time?.[0];
  return episode ? `${episode}m` : "";
};

export const seasonsOf = (details: TMDBDetails) => {
  const count = details.number_of_seasons;
  if (!count) return "";
  return `${count} ${count === 1 ? "season" : "seasons"}`;
};

export const certificationOf = (details: TMDBDetails) => {
  const region = details.release_dates?.results.find(
    (entry) => entry.iso_3166_1 === "US",
  );
  const film = region?.release_dates.find((entry) => entry.certification);
  if (film?.certification) return film.certification;
  return (
    details.content_ratings?.results.find(
      (entry) => entry.iso_3166_1 === "US",
    )?.rating ?? ""
  );
};

export const scoreOf = (details: TMDBDetails) =>
  details.vote_average ? details.vote_average.toFixed(1) : "NR";

export const votesOf = (details: TMDBDetails) => details.vote_count ?? 0;

export const moneyOf = (value?: number) => {
  if (!value) return "";
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  return `$${value.toLocaleString("en-US")}`;
};

export const keywordsOf = (details: TMDBDetails) =>
  (details.keywords?.keywords ?? details.keywords?.results ?? [])
    .map((keyword) => keyword.name)
    .filter(Boolean);

export const stillsOf = (details: TMDBDetails) =>
  (details.images?.backdrops ?? [])
    .filter((image) => image.aspect_ratio > 1.5)
    .slice(0, 6);

const namesByJob = (details: TMDBDetails, job: string, limit = 3) =>
  Array.from(
    new Set(
      (details.credits?.crew ?? [])
        .filter((member) => member.job === job)
        .map((member) => member.name),
    ),
  ).slice(0, limit);

const namesByJobs = (details: TMDBDetails, jobs: string[], limit = 3) =>
  Array.from(
    new Set(
      (details.credits?.crew ?? [])
        .filter((member) => jobs.includes(member.job))
        .map((member) => member.name),
    ),
  ).slice(0, limit);

const join = (values: (string | undefined)[], limit = 3) =>
  values.filter(Boolean).slice(0, limit).join(" · ");

export function factsOf(details: TMDBDetails, isTV: boolean): DetailFact[] {
  const facts: DetailFact[] = [];
  const add = (label: string, value: string) => {
    if (value) facts.push({ label, value });
  };

  add("Released", fullDateOf(details));
  add("Certificate", certificationOf(details));
  add("Status", details.status ?? "");

  if (isTV) {
    add("Seasons", details.number_of_seasons ? String(details.number_of_seasons) : "");
    add("Episodes", details.number_of_episodes ? String(details.number_of_episodes) : "");
    add("Episode length", runtimeOf(details));
    add("Created by", join((details.created_by ?? []).map((person) => person.name)));
    add("Network", join((details.networks ?? []).map((network) => network.name)));
  } else {
    add("Runtime", runtimeOf(details));
    add("Director", namesByJob(details, "Director").join(" · "));
    add("Writers", namesByJobs(details, ["Screenplay", "Writer", "Story"]).join(" · "));
    add("Budget", moneyOf(details.budget));
    add("Box office", moneyOf(details.revenue));
  }

  const original = isTV ? details.original_name : details.original_title;
  add("Original title", original && original !== titleOf(details) ? original : "");
  add("Studio", join((details.production_companies ?? []).map((company) => company.name)));
  add("Country", join((details.production_countries ?? []).map((country) => country.name)));
  add("Language", join((details.spoken_languages ?? []).map((language) => language.english_name)));

  return facts;
}

export function linksOf(details: TMDBDetails): DetailLink[] {
  const links: DetailLink[] = [];
  const imdb = details.imdb_id || details.external_ids?.imdb_id;
  if (imdb) links.push({ label: "IMDb", href: `https://www.imdb.com/title/${imdb}/` });
  if (details.homepage) links.push({ label: "Official site", href: details.homepage });
  return links;
}

export const backdropUrl = (path: string | undefined, size = "w1280") =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : "";

export const posterUrl = (path: string | undefined, size = "w500") =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : "";

export const profileUrl = (path: string | null | undefined, size = "w185") =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : "";
