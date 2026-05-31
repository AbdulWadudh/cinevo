"use client";

import React, { useActionState } from "react";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { updateProfile, type AuthState } from "@/app/actions/auth";

interface EditProfileFormProps {
  username: string;
  avatarUrl: string;
}

export default function EditProfileForm({ username, avatarUrl }: EditProfileFormProps) {
  const [state, action, pending] = useActionState(updateProfile, {} as AuthState);

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Display Name</span>
        <input
          name="username"
          defaultValue={username}
          placeholder="Your name"
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-fg outline-none focus:border-accent/60 transition-colors"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Avatar URL</span>
        <input
          name="avatarUrl"
          type="url"
          defaultValue={avatarUrl}
          placeholder="https://…/avatar.jpg"
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-fg outline-none focus:border-accent/60 transition-colors"
        />
      </label>

      {state.error && (
        <div className="flex items-start gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 flex-none mt-0.5" />
          <span>{state.error}</span>
        </div>
      )}
      {state.success && state.message && (
        <div className="flex items-start gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
          <CheckCircle2 className="w-4 h-4 flex-none mt-0.5" />
          <span>{state.message}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-accent text-white hover:bg-accent-hover transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed w-fit"
      >
        {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Save Changes
      </button>
    </form>
  );
}
