import React from "react";
import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";
import AuthForm from "@/components/auth/AuthForm";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

interface LoginPageProps {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { redirect: redirectTo = "/", error } = await searchParams;

  // Already signed in → bounce to the target.
  const user = await getCurrentUser();
  if (user) redirect(redirectTo);

  return (
    <div className="min-h-screen w-full bg-bg flex flex-col items-center justify-center px-6 py-12 relative">
      <Link
        href="/"
        className="absolute top-6 left-6 inline-flex items-center gap-1.5 text-xs text-fg-secondary bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:text-fg px-3.5 py-2 rounded-lg transition-all"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Home</span>
      </Link>

      {error && (
        <div className="w-full max-w-md mb-5 flex items-start gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 flex-none mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <AuthForm redirect={redirectTo} />
    </div>
  );
}
