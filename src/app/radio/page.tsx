import React from "react";
import type { Metadata } from "next";
import Nav from "@/components/Nav";
import RadioClient from "@/components/radio/RadioClient";
import { getCurrentUser } from "@/lib/auth";
import {
  getRadioCategoriesAction,
  getFeaturedCategoriesAction,
  getRadioStationsAction,
  isRadioAdminAction,
  type RadioStationData,
} from "@/app/actions/radio";

// Rendered per request: the admin controls depend on the signed-in user, so
// this page can't be cached across visitors.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Live Radio",
  description:
    "Stream thousands of live radio stations across genres, decades, languages and countries.",
};

export default async function RadioPage() {
  const [categoriesRes, featuredRes, isAdmin, user] = await Promise.all([
    getRadioCategoriesAction(),
    getFeaturedCategoriesAction(),
    isRadioAdminAction(),
    getCurrentUser(),
  ]);

  const categories = categoriesRes.data;
  const featured = featuredRes.data;

  // Paint the first featured category server-side so the grid is never empty
  // on arrival. Everything after this is fetched on demand by the client.
  const initialSlug = featured[0]?.slug ?? categories[0]?.slug ?? null;
  let initialStations: RadioStationData[] = [];
  if (initialSlug) {
    const stationsRes = await getRadioStationsAction(initialSlug);
    initialStations = stationsRes.data;
  }

  return (
    // Locked to the viewport: the station grid owns the only scrollbar.
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[#07020d] bg-linear-to-b from-purple-950/20 via-bg to-bg text-fg">
      <Nav />
      <RadioClient
        categories={categories}
        featured={featured}
        initialSlug={initialSlug}
        initialStations={initialStations}
        isAdmin={isAdmin}
        isSignedIn={Boolean(user)}
      />
    </div>
  );
}
