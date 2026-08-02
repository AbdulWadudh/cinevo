"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import {
  Users as UsersIcon, Search, X, Loader2, ShieldCheck, ShieldOff, RotateCcw, Trash2,
  ChevronLeft, ChevronRight, Clock, Heart, Star, Radio, BellRing, Check,
} from "lucide-react";
import {
  getAdminUsersAction,
  setUserRoleAction,
  resetUserDataAction,
  deleteUserProfileAction,
  type AdminUser,
  type AdminUserFilter,
  type AdminUserPage,
} from "@/app/actions/admin";

const FILTERS: { id: AdminUserFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "admins", label: "Admins" },
  { id: "members", label: "Members" },
];

const SEARCH_DEBOUNCE_MS = 320;

/** Which destructive action a row is currently asking to confirm. */
type Confirming = { id: string; action: "reset" | "delete" } | null;

/** Admin panel for the user directory, mounted on the profile page. */
export default function UsersAdmin({ currentUserId }: { currentUserId: string }) {
  const reduceMotion = useReducedMotion();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<AdminUserFilter>("all");
  const [page, setPage] = useState(1);

  const [pendingId, setPendingId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<Confirming>(null);
  /** Bumped to force a refetch after a mutation. */
  const [revision, setRevision] = useState(0);

  const q = query.trim();
  const requestKey = `${q}|${filter}|${page}|${revision}`;

  // The page is stored with the request it answered, so "loading" is derived by
  // comparing keys rather than toggled from inside the effect.
  const [result, setResult] = useState<{ key: string; data: AdminUserPage | null } | null>(null);
  const data = result?.data ?? null;
  const loading = result?.key !== requestKey;

  useEffect(() => {
    let cancelled = false;

    // Typing debounces; a filter, page or refresh change fires immediately.
    const handle = setTimeout(
      () => {
        getAdminUsersAction({ query: q, filter, page }).then((res) => {
          if (cancelled) return;
          if (res.success && res.data) {
            setResult({ key: requestKey, data: res.data });
          } else {
            toast.error(res.error ?? "Could not load users");
            // Settle the key anyway, or the list would sit loading forever.
            setResult((prev) => ({ key: requestKey, data: prev?.data ?? null }));
          }
        });
      },
      q ? SEARCH_DEBOUNCE_MS : 0
    );

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [requestKey, q, filter, page]);

  const refresh = useCallback(() => setRevision((r) => r + 1), []);

  // Paging or refiltering replaces every row — start at the top of the new set.
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    listRef.current?.scrollTo({ top: 0 });
  }, [q, filter, page]);

  const totalPages = useMemo(
    () => (data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1),
    [data]
  );

  /* ── Mutations ─────────────────────────────────────────────────────────── */

  const toggleRole = useCallback(
    async (user: AdminUser) => {
      const next = user.role === "admin" ? "user" : "admin";
      setPendingId(user.id);
      const res = await setUserRoleAction(user.id, next);
      setPendingId(null);

      if (!res.success) {
        toast.error(res.error ?? "Could not update the role");
        return;
      }
      toast.success(
        next === "admin"
          ? `${user.username || user.email} is now an admin`
          : `${user.username || user.email} is now a member`
      );
      refresh();
    },
    [refresh]
  );

  const resetData = useCallback(
    async (user: AdminUser) => {
      setConfirming(null);
      setPendingId(user.id);
      const res = await resetUserDataAction(user.id);
      setPendingId(null);

      if (!res.success) {
        toast.error(res.error ?? "Could not reset that account");
        return;
      }
      toast.success(`Cleared the library for ${user.username || user.email}`);
      refresh();
    },
    [refresh]
  );

  const deleteProfile = useCallback(
    async (user: AdminUser) => {
      setConfirming(null);
      setPendingId(user.id);
      const res = await deleteUserProfileAction(user.id);
      setPendingId(null);

      if (!res.success) {
        toast.error(res.error ?? "Could not delete that profile");
        return;
      }
      toast.success(`Deleted ${user.username || user.email}`, {
        description: "Their sign-in still works — a fresh, empty profile is created if they return.",
      });
      refresh();
    },
    [refresh]
  );

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="rounded-2xl border border-white/6 bg-surface/40 p-6 sm:p-8"
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 flex-none items-center justify-center rounded-xl border border-blue-500/25 bg-blue-500/15">
            <UsersIcon className="size-4.5 text-blue-400" />
          </div>
          <div>
            <h2 className="font-display text-lg leading-tight font-bold">Users</h2>
            <p className="text-xs text-muted">
              {data
                ? `${data.counts.total.toLocaleString()} total · ${data.counts.admins} admin${
                    data.counts.admins === 1 ? "" : "s"
                  } · ${data.counts.members.toLocaleString()} member${
                    data.counts.members === 1 ? "" : "s"
                  }`
                : "Loading directory…"}
            </p>
          </div>
        </div>
      </div>

      {/* Search + filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name or email…"
            aria-label="Search users"
            className="w-full rounded-lg border border-white/8 bg-surface py-2 pl-9 pr-8 text-sm outline-none transition-colors placeholder:text-muted focus:border-blue-500/60"
          />
          <AnimatePresence>
            {query && (
              <motion.button
                type="button"
                onClick={() => {
                  setQuery("");
                  setPage(1);
                }}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer rounded p-1 text-muted hover:text-white"
              >
                <X className="size-3" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-1">
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <motion.button
                key={f.id}
                type="button"
                onClick={() => {
                  setFilter(f.id);
                  setPage(1);
                }}
                whileHover={reduceMotion ? undefined : { y: -1 }}
                whileTap={reduceMotion ? undefined : { scale: 0.95 }}
                className={`relative cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                  active ? "text-white" : "text-fg-secondary hover:text-white"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId={reduceMotion ? undefined : "users-admin-filter"}
                    className="absolute inset-0 -z-10 rounded-lg bg-linear-to-r from-blue-600 to-sky-500"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                {!active && (
                  <span className="absolute inset-0 -z-10 rounded-lg border border-white/6 bg-surface" />
                )}
                {f.label}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Rows */}
      {loading && !data ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <motion.div
              key={i}
              className="h-16 rounded-xl border border-white/6 bg-surface/40"
              animate={reduceMotion ? { opacity: 0.45 } : { opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.06 }}
            />
          ))}
        </div>
      ) : !data || data.users.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">No users match this filter.</p>
      ) : (
        // The directory grows without bound, so the rows own the scrollbar —
        // the header, search, filters and pagination stay put.
        <motion.div
          ref={listRef}
          layout={!reduceMotion}
          className="max-h-[60vh] space-y-2 overflow-y-auto overscroll-contain pr-1"
        >
          <AnimatePresence mode="popLayout">
            {data.users.map((user) => {
              const isSelf = user.id === currentUserId;
              const isAdmin = user.role === "admin";
              const confirm = confirming?.id === user.id ? confirming.action : null;

              return (
                <motion.div
                  key={user.id}
                  layout={!reduceMotion}
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  className={`flex flex-wrap items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                    isAdmin ? "border-accent/20 bg-accent/5" : "border-white/6 bg-surface/50"
                  }`}
                >
                  <Avatar user={user} />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-semibold text-white">
                        {user.username || user.email.split("@")[0]}
                      </span>
                      {isAdmin && <Badge tone="admin">Admin</Badge>}
                      {isSelf && <Badge tone="muted">You</Badge>}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
                      <span className="truncate">{user.email}</span>
                      <span aria-hidden>·</span>
                      <span className="flex-none">Joined {user.joined}</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <Stat icon={<Clock className="size-3" />} value={user.counts.watch} label="watched" />
                      <Stat icon={<Heart className="size-3" />} value={user.counts.wishlist} label="wishlisted" />
                      <Stat icon={<Star className="size-3" />} value={user.counts.ratings} label="rated" />
                      <Stat icon={<Radio className="size-3" />} value={user.counts.favorites} label="stations" />
                      <Stat icon={<BellRing className="size-3" />} value={user.counts.devices} label="devices" />
                    </div>
                  </div>

                  <div className="flex flex-none items-center gap-1">
                    {pendingId === user.id ? (
                      <Loader2 className="mx-3 size-4 animate-spin text-blue-400" />
                    ) : confirm ? (
                      <ConfirmRow
                        label={confirm === "delete" ? "Delete profile?" : "Clear library?"}
                        onCancel={() => setConfirming(null)}
                        onConfirm={() => (confirm === "delete" ? deleteProfile(user) : resetData(user))}
                        reduceMotion={reduceMotion}
                      />
                    ) : (
                      <>
                        <RowAction
                          label={
                            isSelf
                              ? "You can't change your own role"
                              : isAdmin
                                ? "Demote to member"
                                : "Promote to admin"
                          }
                          disabled={isSelf}
                          tone={isAdmin ? "admin" : "default"}
                          onClick={() => toggleRole(user)}
                        >
                          {isAdmin ? (
                            <ShieldOff className="size-3.5" />
                          ) : (
                            <ShieldCheck className="size-3.5" />
                          )}
                        </RowAction>
                        <RowAction
                          label="Clear their library (history, wishlist, ratings, stations, devices)"
                          onClick={() => setConfirming({ id: user.id, action: "reset" })}
                        >
                          <RotateCcw className="size-3.5" />
                        </RowAction>
                        <RowAction
                          label={
                            isSelf
                              ? "You can't delete your own account here"
                              : "Delete profile and all their data"
                          }
                          disabled={isSelf}
                          tone="danger"
                          onClick={() => setConfirming({ id: user.id, action: "delete" })}
                        >
                          <Trash2 className="size-3.5" />
                        </RowAction>
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Pagination */}
      {data && data.total > data.pageSize && (
        <div className="mt-5 flex items-center justify-between gap-3">
          <span className="text-xs text-muted">
            {(data.page - 1) * data.pageSize + 1}–
            {Math.min(data.page * data.pageSize, data.total)} of {data.total.toLocaleString()}
          </span>
          <div className="flex items-center gap-1.5">
            <PageButton
              disabled={data.page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              label="Previous page"
            >
              <ChevronLeft className="size-4" />
            </PageButton>
            <span className="px-2 text-xs tabular-nums text-fg-secondary">
              {data.page} / {totalPages}
            </span>
            <PageButton
              disabled={data.page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              label="Next page"
            >
              <ChevronRight className="size-4" />
            </PageButton>
          </div>
        </div>
      )}
    </motion.section>
  );
}

/* ── Row pieces ──────────────────────────────────────────────────────────── */

function Avatar({ user }: { user: AdminUser }) {
  const initial = (user.username || user.email).charAt(0).toUpperCase();

  if (!user.avatarUrl) {
    return (
      <div className="grid size-10 flex-none place-items-center rounded-xl border border-white/8 bg-bg/60 text-sm font-extrabold text-fg-secondary">
        {initial}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={user.avatarUrl}
      alt=""
      referrerPolicy="no-referrer"
      className="size-10 flex-none rounded-xl border border-white/8 object-cover"
    />
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <span
      title={`${value} ${label}`}
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
        value > 0 ? "bg-white/6 text-fg-secondary" : "bg-white/4 text-muted"
      }`}
    >
      {icon}
      {value}
    </span>
  );
}

function Badge({ tone, children }: { tone: "admin" | "muted"; children: React.ReactNode }) {
  const tones = {
    admin: "border-accent/30 bg-accent/15 text-accent",
    muted: "border-white/8 bg-white/5 text-muted",
  };
  return (
    <span
      className={`flex-none rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function ConfirmRow({
  label,
  onConfirm,
  onCancel,
  reduceMotion,
}: {
  label: string;
  onConfirm: () => void;
  onCancel: () => void;
  reduceMotion: boolean | null;
}) {
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-1.5"
    >
      <span className="text-[11px] font-semibold text-orange-300">{label}</span>
      <RowAction label="Confirm" tone="danger" onClick={onConfirm}>
        <Check className="size-3.5" />
      </RowAction>
      <RowAction label="Cancel" onClick={onCancel}>
        <X className="size-3.5" />
      </RowAction>
    </motion.div>
  );
}

function RowAction({
  label,
  onClick,
  tone = "default",
  disabled = false,
  children,
}: {
  label: string;
  onClick: () => void;
  tone?: "default" | "danger" | "admin";
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const tones = {
    default: "text-fg-secondary hover:border-white/20 hover:text-white",
    danger: "text-fg-secondary hover:border-red-500/40 hover:text-red-400",
    admin: "border-accent/30 text-accent hover:border-accent/60",
  };
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      whileHover={disabled ? undefined : { scale: 1.08 }}
      whileTap={disabled ? undefined : { scale: 0.92 }}
      transition={{ type: "spring", stiffness: 440, damping: 26 }}
      className={`flex size-9 items-center justify-center rounded-lg border border-white/8 bg-bg/50 transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
        disabled ? "text-muted" : `cursor-pointer ${tones[tone]}`
      }`}
    >
      {children}
    </motion.button>
  );
}

function PageButton({
  disabled,
  onClick,
  label,
  children,
}: {
  disabled: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-white/8 bg-bg/50 text-fg-secondary transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
