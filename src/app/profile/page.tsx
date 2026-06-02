import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Heart, Clock, LogOut, Mail, ArrowLeft } from "lucide-react";
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
import ForceSyncButton from "@/components/watch/ForceSyncButton";
import ClearCacheButton from "@/components/settings/ClearCacheButton";

export default async function ProfilePage() {
  const profile = await getOrCreateProfile();
  if (!profile) redirect("/login?redirect=/profile");

  const isAdmin = profile.role === "admin";

  const [wishlistCount, watchingCount, providersRes, reportsRes, statsRes] = await Promise.all([
    db.wishlist.count({ where: { profileId: profile.id } }),
    db.watchProgress.count({ where: { profileId: profile.id } }),
    isAdmin ? getAllProviders() : Promise.resolve({ success: true, data: [] as const }),
    isAdmin ? getProviderReports() : Promise.resolve({ success: true, data: [] as const, counts: [] as const }),
    isAdmin ? getAdminStats() : Promise.resolve({ success: false as const }),
  ]);

  const displayName = profile.username || profile.email.split("@")[0];
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="flex-1 w-full bg-bg min-h-screen pb-16">
      <Nav />

      <section className="pt-24 md:pt-28 px-6 md:px-12 max-w-4xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-fg-secondary bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:text-fg px-3.5 py-2 rounded-lg transition-all mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </Link>

        {/* Header card */}
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 mb-10">
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatarUrl}
              alt={displayName}
              referrerPolicy="no-referrer"
              className="w-24 h-24 rounded-2xl object-cover border border-white/[0.1] shadow-lg"
            />
          ) : (
            <div className="w-24 h-24 rounded-2xl bg-accent/20 border border-accent/30 flex items-center justify-center text-4xl font-extrabold text-accent shadow-lg">
              {initial}
            </div>
          )}
          <div className="text-center sm:text-left">
            <h1 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight">{displayName}</h1>
            <div className="flex items-center justify-center sm:justify-start gap-1.5 text-sm text-fg-secondary mt-1.5">
              <Mail className="w-3.5 h-3.5" />
              <span>{profile.email}</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          <Link
            href="/wishlist"
            className="group bg-surface/60 border border-white/[0.08] rounded-2xl p-5 hover:border-accent/40 transition-all"
          >
            <div className="flex items-center gap-2 text-muted mb-1">
              <Heart className="w-4 h-4 text-accent" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Wishlist</span>
            </div>
            <div className="text-3xl font-extrabold font-display text-fg group-hover:text-accent transition-colors">{wishlistCount}</div>
            <div className="text-xs text-muted mt-0.5">saved titles</div>
          </Link>

          <Link
            href="/history"
            className="group bg-surface/60 border border-white/[0.08] rounded-2xl p-5 hover:border-accent/40 transition-all"
          >
            <div className="flex items-center gap-2 text-muted mb-1">
              <Clock className="w-4 h-4 text-accent" />
              <span className="text-[10px] font-bold uppercase tracking-widest">History</span>
            </div>
            <div className="text-3xl font-extrabold font-display text-fg group-hover:text-accent transition-colors">{watchingCount}</div>
            <div className="text-xs text-muted mt-0.5">titles watched</div>
          </Link>
        </div>

        {/* Edit + Sign out */}
        <div className="bg-surface/40 border border-white/[0.06] rounded-2xl p-6 sm:p-8">
          <h2 className="font-display text-lg font-bold mb-5">Account Settings</h2>
          <EditProfileForm username={profile.username || ""} avatarUrl={profile.avatarUrl || ""} />

          {/* Watch history sync */}
          <div className="border-t border-white/[0.06] mt-8 pt-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h3 className="text-sm font-bold text-fg">Watch history</h3>
                <p className="text-xs text-muted mt-0.5">History saves locally and syncs every 10 min. Force a sync to push/pull now.</p>
              </div>
              <ForceSyncButton />
            </div>
          </div>

          {/* Clear cached data + sync */}
          <div className="border-t border-white/[0.06] mt-8 pt-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h3 className="text-sm font-bold text-fg">Local cache</h3>
                <p className="text-xs text-muted mt-0.5">Push any pending changes to your account, then clear cached genre lists so they refetch fresh from TMDB.</p>
              </div>
              <ClearCacheButton />
            </div>
          </div>

          <div className="border-t border-white/[0.06] mt-8 pt-6">
            <form action={signOut}>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-transparent text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </form>
          </div>
        </div>

        {/* Admin-only: overview stats + role management */}
        {isAdmin && statsRes.success && "data" in statsRes && statsRes.data && (
          <AdminDashboard stats={statsRes.data} />
        )}

        {/* Admin-only: stream provider management */}
        {isAdmin && providersRes.success && (
          <ProviderAdmin initial={[...providersRes.data]} />
        )}

        {/* Admin-only: provider trouble reports */}
        {isAdmin && reportsRes.success && (
          <ProviderReportsAdmin initial={[...reportsRes.data]} counts={[...reportsRes.counts]} />
        )}
      </section>
    </div>
  );
}
