import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Nav from "@/components/Nav";
import { site } from "@/config";

export const metadata = {
  title: "Terms of Service",
  description: `The terms that govern your use of ${site.name}.`,
};

export default function TermsPage() {
  return (
    <div className="flex-1 w-full bg-bg min-h-screen pb-20">
      <Nav />
      {/* The `main` landmark itself lives in the root layout. */}
      <div className="pt-24 md:pt-28 px-6 md:px-12 max-w-3xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-fg-secondary bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:text-fg px-3.5 py-2 rounded-lg transition-all mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </Link>

        <h1 className="font-display text-4xl font-extrabold tracking-tight mb-2">Terms of Service</h1>
        <p className="text-sm text-muted mb-10">Last updated: June 1, 2026</p>

        <div className="flex flex-col gap-8 text-sm md:text-base text-fg-secondary leading-relaxed">
          <section>
            <h2 className="font-display text-xl font-bold text-fg mb-2">Acceptance of Terms</h2>
            <p>
              By accessing or using {site.name}, you agree to these Terms of Service. If you do not agree, please do
              not use the service. {site.name} is a personal, non-commercial project provided &quot;as is&quot;.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-fg mb-2">Use of the Service</h2>
            <p>
              You agree to use {site.name} only for lawful, personal purposes. You are responsible for any activity
              under your account and for keeping your credentials secure.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-fg mb-2">Content</h2>
            <p>
              Movie and TV metadata and images are provided by The Movie Database (TMDB). {site.name} does not host,
              upload, or distribute any video content; playback is provided by third-party sources that we do not
              control or endorse.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-fg mb-2">Accounts</h2>
            <p>
              You may create an account using email or a supported identity provider. You may delete your account
              at any time, which removes your associated profile, wishlist, and watch-progress data.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-fg mb-2">Disclaimer & Limitation of Liability</h2>
            <p>
              The service is provided without warranties of any kind. To the fullest extent permitted by law,
              {site.name} is not liable for any damages arising from your use of the service or any third-party content
              accessed through it.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-fg mb-2">Changes</h2>
            <p>
              We may update these terms from time to time. Continued use of {site.name} after changes constitutes
              acceptance of the revised terms.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-fg mb-2">Contact</h2>
            <p>Questions about these terms? Reach us at <span className="text-accent">{site.emails.support}</span>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
