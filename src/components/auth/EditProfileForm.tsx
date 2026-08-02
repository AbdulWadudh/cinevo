"use client";

import React, { useActionState, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Loader2, CheckCircle2, AlertCircle, ImageOff, Mail, Lock } from "lucide-react";
import { updateProfile, type AuthState } from "@/app/actions/auth";

interface EditProfileFormProps {
  username: string;
  avatarUrl: string;
  email: string;
}

const inputCls =
  "w-full bg-white/4 border border-white/8 rounded-xl px-3.5 py-2.5 text-sm text-fg placeholder-muted outline-none focus:border-accent/60 transition-colors";
const labelCls = "text-[10px] font-bold uppercase tracking-widest text-muted";

export default function EditProfileForm({ username, avatarUrl, email }: EditProfileFormProps) {
  const [state, action, pending] = useActionState(updateProfile, {} as AuthState);
  const reduceMotion = useReducedMotion();

  // Mirrored locally so the preview beside the fields updates as you type.
  const [name, setName] = useState(username);
  const [avatar, setAvatar] = useState(avatarUrl);
  const [imageBroken, setImageBroken] = useState(false);

  const previewName = name.trim() || "Your name";
  const previewSrc = avatar.trim();
  const initial = previewName.charAt(0).toUpperCase();
  const showImage = !!previewSrc && !imageBroken;

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-8">
      {/* Fields */}
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>Display Name</span>
          <input
            name="username"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className={inputCls}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>Avatar URL</span>
          <input
            name="avatarUrl"
            type="url"
            value={avatar}
            onChange={(e) => {
              setAvatar(e.target.value);
              setImageBroken(false);
            }}
            placeholder="https://…/avatar.jpg"
            className={inputCls}
          />
          <span className="text-[11px] text-muted">
            Paste a link to any image — the preview updates as you type.
          </span>
        </label>

        <div className="flex flex-col gap-1.5">
          <span className={labelCls}>Email</span>
          <div className="flex items-center gap-2 rounded-xl border border-white/6 bg-bg/40 px-3.5 py-2.5 text-sm text-fg-secondary">
            <Mail className="size-3.5 flex-none text-muted" />
            <span className="truncate">{email}</span>
            <Lock className="ml-auto size-3.5 flex-none text-muted" />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {state.error && (
            <Alert key="error" tone="error" reduceMotion={reduceMotion}>
              {state.error}
            </Alert>
          )}
          {state.success && state.message && (
            <Alert key="success" tone="success" reduceMotion={reduceMotion}>
              {state.message}
            </Alert>
          )}
        </AnimatePresence>

        <motion.button
          type="submit"
          disabled={pending}
          whileHover={reduceMotion || pending ? undefined : { scale: 1.03 }}
          whileTap={reduceMotion || pending ? undefined : { scale: 0.97 }}
          transition={{ type: "spring", stiffness: 420, damping: 30 }}
          className="inline-flex w-fit cursor-pointer items-center justify-center gap-2 rounded-xl bg-accent-strong px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-accent-strong-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Save Changes
        </motion.button>
      </div>

      {/* Live preview */}
      <div className="flex flex-col gap-2.5">
        <span className={labelCls}>Preview</span>
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/6 bg-bg/40 p-5 text-center">
          <AnimatePresence mode="wait" initial={false}>
            {showImage ? (
              <motion.img
                key={previewSrc}
                src={previewSrc}
                alt=""
                referrerPolicy="no-referrer"
                onError={() => setImageBroken(true)}
                initial={reduceMotion ? false : { opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="size-20 rounded-2xl border border-white/10 object-cover shadow-lg"
              />
            ) : (
              <motion.div
                key="fallback"
                initial={reduceMotion ? false : { opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="grid size-20 place-items-center rounded-2xl border border-accent/30 bg-accent/20 text-3xl font-extrabold text-accent shadow-lg"
              >
                {initial}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="min-w-0 w-full">
            <p className="truncate font-display text-sm font-extrabold text-fg">{previewName}</p>
            <p className="truncate text-[11px] text-muted">{email}</p>
          </div>

          {imageBroken && (
            <p className="flex items-center gap-1.5 text-[11px] text-orange-400">
              <ImageOff className="size-3.5 flex-none" />
              That image didn&apos;t load
            </p>
          )}
        </div>
      </div>
    </form>
  );
}

function Alert({
  tone,
  reduceMotion,
  children,
}: {
  tone: "error" | "success";
  reduceMotion: boolean | null;
  children: React.ReactNode;
}) {
  const error = tone === "error";
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: -6, height: 0 }}
      animate={{ opacity: 1, y: 0, height: "auto" }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, height: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={`flex items-start gap-2 overflow-hidden rounded-lg border px-3 py-2 text-xs ${
        error
          ? "border-red-500/20 bg-red-500/10 text-red-400"
          : "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
      }`}
    >
      {error ? (
        <AlertCircle className="mt-0.5 size-4 flex-none" />
      ) : (
        <CheckCircle2 className="mt-0.5 size-4 flex-none" />
      )}
      <span>{children}</span>
    </motion.div>
  );
}
