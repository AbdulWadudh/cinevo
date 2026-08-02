"use client";

import React, { useActionState, useState } from "react";
import { Mail, Lock, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import {
  signInWithPassword,
  signUpWithPassword,
  signInWithGoogle,
  type AuthState,
} from "@/app/actions/auth";
import { site } from "@/config";

const initialState: AuthState = {};

export default function AuthForm({ redirect = "/" }: { redirect?: string }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  const [signInState, signInAction, signingIn] = useActionState(signInWithPassword, initialState);
  const [signUpState, signUpAction, signingUp] = useActionState(signUpWithPassword, initialState);

  const isSignIn = mode === "signin";
  const state = isSignIn ? signInState : signUpState;
  const pending = isSignIn ? signingIn : signingUp;

  return (
    <div className="w-full max-w-md">
      {/* Brand */}
      <div className="text-center mb-8">
        <span className="font-display text-3xl font-extrabold text-accent tracking-wider uppercase">{site.name}</span>
        <p className="text-sm text-fg-secondary mt-2">
          {isSignIn ? "Welcome back — sign in to continue" : "Create an account to start streaming"}
        </p>
      </div>

      <div className="bg-surface/60 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 sm:p-8 shadow-2xl">
        {/* Mode toggle */}
        <div className="flex bg-white/[0.04] border border-white/[0.06] rounded-xl p-1 mb-6">
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                mode === m ? "bg-accent-strong text-white shadow" : "text-fg-secondary hover:text-fg"
              }`}
            >
              {m === "signin" ? "Sign In" : "Sign Up"}
            </button>
          ))}
        </div>

        {/* Email/password form */}
        <form action={isSignIn ? signInAction : signUpAction} className="flex flex-col gap-4">
          <input type="hidden" name="redirect" value={redirect} />

          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Email</span>
            <div className="relative">
              <Mail className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-3 py-2.5 text-sm text-fg outline-none focus:border-accent/60 transition-colors"
              />
            </div>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Password</span>
            <div className="relative">
              <Lock className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                name="password"
                required
                minLength={6}
                autoComplete={isSignIn ? "current-password" : "new-password"}
                placeholder="••••••••"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-3 py-2.5 text-sm text-fg outline-none focus:border-accent/60 transition-colors"
              />
            </div>
          </label>

          {state.error && (
            <div className="flex items-start gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 flex-none mt-0.5" />
              <span>{state.error}</span>
            </div>
          )}
          {state.message && (
            <div className="flex items-start gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-4 h-4 flex-none mt-0.5" />
              <span>{state.message}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold bg-accent-strong text-white hover:bg-accent-strong-hover transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {isSignIn ? "Sign In" : "Create Account"}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <span className="flex-1 h-px bg-white/[0.08]" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted">or</span>
          <span className="flex-1 h-px bg-white/[0.08]" />
        </div>

        {/* Google OAuth */}
        <form action={signInWithGoogle}>
          <input type="hidden" name="redirect" value={redirect} />
          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl text-sm font-semibold bg-white text-gray-800 hover:bg-gray-100 transition-all cursor-pointer"
          >
            <GoogleIcon />
            Continue with Google
          </button>
        </form>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
