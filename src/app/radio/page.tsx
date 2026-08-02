import React from "react";
import type { Metadata } from "next";
import Nav from "@/components/Nav";
import RadioClient from "@/components/radio/RadioClient";
import { getCurrentUser } from "@/lib/auth";
import {
  getRadioStationsAction,
  isRadioAdminAction,
  type RadioStationData,
} from "@/app/actions/radio";
import { FEATURED_SLUGS } from "@/lib/radio/categories";

// Rendered per request: the admin controls depend on the signed-in user, so
// this page can't be cached across visitors.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Live Radio",
  description:
    "Stream thousands of live radio stations across genres, decades, languages and countries.",
};

export default async function RadioPage() {
  // The category index isn't fetched here any more: it's the same list for
  // every visitor and changes only when an admin edits the catalogue, so the
  // client serves it from localStorage and only a miss reaches the database.
  //
  // Paint the first featured category server-side so the grid is never empty
  // on arrival. The slug is a constant, so this needs no category query — and
  // `getRadioStationsAction` returns empty for a slug that isn't seeded yet.
  const initialSlug = FEATURED_SLUGS[0] ?? null;

  const [stationsRes, isAdmin, user] = await Promise.all([
    initialSlug
      ? getRadioStationsAction(initialSlug)
      : Promise.resolve({ success: true as const, data: [] as RadioStationData[] }),
    isRadioAdminAction(),
    getCurrentUser(),
  ]);

  const initialStations = stationsRes.data;

  return (
    // Locked to the viewport: the station grid owns the only scrollbar.
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[#07020d] bg-linear-to-b from-purple-950/20 via-bg to-bg text-fg">
      <Nav />
      <RadioClient
        initialSlug={initialSlug}
        initialStations={initialStations}
        isAdmin={isAdmin}
        isSignedIn={Boolean(user)}
      />
    </div>
  );
}
