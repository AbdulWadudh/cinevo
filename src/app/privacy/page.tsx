import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Nav from "@/components/Nav";

export const metadata = {
  title: "Privacy Policy — Cinevo",
  description: "How Cinevo collects, uses, and protects your information.",
};

export default function PrivacyPage() {
  return (
    <div className="flex-1 w-full bg-bg min-h-screen pb-20">
      <Nav />
      <main className="pt-24 md:pt-28 px-6 md:px-12 max-w-3xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-fg-secondary bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:text-fg px-3.5 py-2 rounded-lg transition-all mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </Link>

        <h1 className="font-display text-4xl font-extrabold tracking-tight mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted mb-10">Last updated: June 1, 2026</p>

        <div className="flex flex-col gap-8 text-sm md:text-base text-fg-secondary leading-relaxed">
          <section>
            <h2 className="font-display text-xl font-bold text-fg mb-2">Overview</h2>
            <p>
              Cinevo (&quot;we&quot;, &quot;us&quot;) provides a movie and TV discovery experience. This policy explains
              what information we collect, how we use it, and the choices you have. Cinevo is a personal,
              non-commercial project.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-fg mb-2">Information We Collect</h2>
            <ul className="list-disc pl-5 flex flex-col gap-1.5">
              <li><strong className="text-fg">Account information.</strong> When you sign in (via email or Google), we store your email address, display name, and avatar provided by your identity provider.</li>
              <li><strong className="text-fg">Activity.</strong> Your watchlist and watch progress, so we can show your saved titles and resume playback.</li>
              <li><strong className="text-fg">Technical data.</strong> Standard session cookies used to keep you signed in.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-fg mb-2">How We Use Your Information</h2>
            <p>
              We use your information solely to provide the service: authenticating you, syncing your wishlist
              and watch progress, and personalizing what you see. We do not sell your data or use it for
              advertising.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-fg mb-2">Third-Party Services</h2>
            <p>
              We use <strong className="text-fg">Supabase</strong> for authentication and database storage, and
              <strong className="text-fg"> The Movie Database (TMDB)</strong> for movie and TV metadata. Title
              information and images are provided by TMDB; we do not host video content.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-fg mb-2">Your Choices</h2>
            <p>
              You can edit your profile or remove saved titles at any time from your profile page. To delete your
              account and associated data, contact us at the email below.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-fg mb-2">Contact</h2>
            <p>Questions about this policy? Reach us at <span className="text-accent">support@cinevo.app</span>.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
