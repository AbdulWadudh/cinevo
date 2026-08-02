import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, LogOut, RefreshCw, User } from "lucide-react";
import Nav from "@/components/Nav";
import EditProfileForm from "@/components/auth/EditProfileForm";
import { getOrCreateProfile } from "@/lib/auth";
import { signOut } from "@/app/actions/auth";
import { getAllProviders } from "@/app/actions/providers";
import { getProviderReports } from "@/app/actions/reports";
import { getAdminStats } from "@/app/actions/admin";
import AdminDashboard from "@/components/admin/AdminDashboard";
import { db } from "@/lib/db";
import ProviderAdmin from "@/components/admin/ProviderAdmin";
import ProviderReportsAdmin from "@/components/admin/ProviderReportsAdmin";
import RadioStationAdmin from "@/components/admin/RadioStationAdmin";
import ForceSyncButton from "@/components/watch/ForceSyncButton";
import ClearCacheButton from "@/components/settings/ClearCacheButton";
import EffectPlayground from "@/components/reveal/EffectPlayground";
import ProfileWorkspace, { type ProfileSection } from "@/components/profile/ProfileWorkspace";
import PanelCard from "@/components/profile/PanelCard";
import SettingRow from "@/components/profile/SettingRow";

// Formatted here rather than in the client, so the rail doesn't hydrate against
// a different locale/timezone than the server rendered.
const JOINED = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" });

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const profile = await getOrCreateProfile();
  if (!profile) redirect("/login?redirect=/profile");

  const isAdmin = profile.role === "admin";

  const [{ tab }, wishlistCount, watchingCount, providersRes, reportsRes, statsRes] = await Promise.all([
    searchParams,
    db.wishlist.count({ where: { profileId: profile.id } }),
    db.watchProgress.count({ where: { profileId: profile.id } }),
    isAdmin ? getAllProviders() : Promise.resolve({ success: true, data: [] as const }),
    isAdmin ? getProviderReports() : Promise.resolve({ success: true, data: [] as const, counts: [] as const }),
    isAdmin ? getAdminStats() : Promise.resolve({ success: false as const }),
  ]);

  const displayName = profile.username || profile.email.split("@")[0];
  const openReports =
    isAdmin && reportsRes.success ? [...reportsRes.data].filter((r) => !r.resolved).length : 0;

  const sections: ProfileSection[] = [
    {
      id: "profile",
      label: "Profile",
      icon: "user",
      group: "account",
      content: (
        <PanelCard
          icon={<User className="size-4.5" />}
          title="Profile"
          subtitle="How you appear across Cinevo"
        >
          <EditProfileForm
            username={profile.username || ""}
            avatarUrl={profile.avatarUrl || ""}
            email={profile.email}
          />
        </PanelCard>
      ),
    },
    {
      id: "appearance",
      label: "Appearance",
      icon: "palette",
      group: "account",
      content: <EffectPlayground />,
    },
    {
      id: "data",
      label: "Data & Sync",
      icon: "sync",
      group: "account",
      content: (
        <PanelCard
          icon={<RefreshCw className="size-4.5" />}
          title="Data & Sync"
          subtitle="Keep your history in step across devices"
          tone="blue"
        >
          <div className="flex flex-col gap-3">
            <SettingRow
              title="Watch history"
              description="History saves locally and syncs every 10 min. Force a sync to push/pull now."
            >
              <ForceSyncButton />
            </SettingRow>
            <SettingRow
              title="Reset & resync"
              description="Push any pending changes to your account, clear the local cache, and reload so everything is re-fetched fresh from the database and TMDB."
            >
              <ClearCacheButton />
            </SettingRow>
          </div>
        </PanelCard>
      ),
    },
  ];

  if (isAdmin) {
    if (statsRes.success && "data" in statsRes && statsRes.data) {
      sections.push({
        id: "overview",
        label: "Overview",
        icon: "shield",
        group: "admin",
        content: <AdminDashboard stats={statsRes.data} />,
      });
    }
    sections.push({
      id: "radio",
      label: "Radio",
      icon: "radio",
      group: "admin",
      content: <RadioStationAdmin />,
    });
    if (providersRes.success) {
      sections.push({
        id: "providers",
        label: "Providers",
        icon: "server",
        group: "admin",
        content: <ProviderAdmin initial={[...providersRes.data]} />,
      });
    }
    if (reportsRes.success) {
      sections.push({
        id: "reports",
        label: "Reports",
        icon: "flag",
        group: "admin",
        badge: openReports,
        content: (
          <ProviderReportsAdmin initial={[...reportsRes.data]} counts={[...reportsRes.counts]} />
        ),
      });
    }

  }

  return (
    <div className="flex-1 w-full bg-bg min-h-screen pb-16">
      <Nav />

      <section className="pt-24 md:pt-28 px-6 md:px-12 max-w-7xl mx-auto">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 rounded-lg border border-white/6 bg-white/4 px-3.5 py-2 text-xs text-fg-secondary transition-all hover:bg-white/8 hover:text-fg"
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to Home</span>
        </Link>

        <ProfileWorkspace
          displayName={displayName}
          email={profile.email}
          avatarUrl={profile.avatarUrl}
          memberSince={`Joined ${JOINED.format(profile.createdAt)}`}
          isAdmin={isAdmin}
          wishlistCount={wishlistCount}
          watchingCount={watchingCount}
          sections={sections}
          initialSection={tab ?? ""}
          footer={
            <form action={signOut}>
              <button
                type="submit"
                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-transparent px-5 py-3 text-sm font-semibold text-red-400 transition-all hover:bg-red-500/10"
              >
                <LogOut className="size-4" />
                Sign Out
              </button>
            </form>
          }
        />
      </section>
    </div>
  );
}
