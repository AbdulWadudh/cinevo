import React from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import { getOrCreateProfile } from "@/lib/auth";
import { getWatchProgressList } from "@/app/actions/progress";
import HistoryClient, { type HistoryItem } from "@/components/history/HistoryClient";

export const metadata: Metadata = { title: "Watch History - Cinevo" };

export default async function HistoryPage() {
  const profile = await getOrCreateProfile();
  if (!profile) redirect("/login?redirect=/history");

  const res = await getWatchProgressList();
  const items: HistoryItem[] = (res.success && res.data ? res.data : []).map((i) => ({
    id: i.id,
    mediaId: i.mediaId,
    mediaType: i.mediaType,
    title: i.title,
    posterPath: i.posterPath,
    season: i.season,
    episode: i.episode,
    progress: i.progress,
    duration: i.duration,
    updatedAt: i.updatedAt.toISOString(),
  }));

  return (
    <div className="flex-1 w-full bg-bg min-h-screen pb-16">
      <Nav />
      <HistoryClient initial={items} />
    </div>
  );
}
