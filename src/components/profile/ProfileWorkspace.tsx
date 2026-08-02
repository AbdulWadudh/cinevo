"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Clock, Flag, Heart, Mail, Palette, Radio, RefreshCw, Server, ShieldCheck, User, Users,
} from "lucide-react";

/** Icons are keyed by name so sections can be described from a server component. */
const SECTION_ICONS = {
  user: User,
  users: Users,
  palette: Palette,
  sync: RefreshCw,
  shield: ShieldCheck,
  server: Server,
  flag: Flag,
  radio: Radio,
} as const;

export type SectionIcon = keyof typeof SECTION_ICONS;

export interface ProfileSection {
  id: string;
  label: string;
  icon: SectionIcon;
  group: "account" | "admin";
  /** Count chip on the nav item — hidden when 0 or absent. */
  badge?: number;
  content: React.ReactNode;
}

interface ProfileWorkspaceProps {
  displayName: string;
  email: string;
  avatarUrl: string | null;
  /** Pre-formatted on the server — formatting a date on the client desyncs hydration. */
  memberSince: string;
  isAdmin: boolean;
  wishlistCount: number;
  watchingCount: number;
  sections: ProfileSection[];
  /** Section named by `?tab=` — falls back to the first section when unknown. */
  initialSection: string;
  /** Sits at the foot of the rail (and below the pane on mobile) — the sign-out form. */
  footer?: React.ReactNode;
}

const GROUP_LABELS: Record<ProfileSection["group"], string> = { account: "Account", admin: "Admin" };
const GROUP_ORDER: ProfileSection["group"][] = ["account", "admin"];

const SPRING = { type: "spring", stiffness: 420, damping: 34 } as const;

const railList = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const railItem = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
} as const;

/**
 * Settings-app shell for /profile: a sticky rail carrying identity, stats and
 * section nav, with one section rendered at a time in the pane beside it. Only
 * the active section is mounted, so the heavy admin panels don't all fetch at once.
 */
export default function ProfileWorkspace({
  displayName,
  email,
  avatarUrl,
  memberSince,
  isAdmin,
  wishlistCount,
  watchingCount,
  sections,
  initialSection,
  footer,
}: ProfileWorkspaceProps) {
  const reduceMotion = useReducedMotion();
  const ids = useMemo(() => sections.map((s) => s.id), [sections]);
  const [active, setActive] = useState(() => (ids.includes(initialSection) ? initialSection : ids[0]));

  const resolve = useCallback(
    (raw: string | null) => (raw && ids.includes(raw) ? raw : ids[0]),
    [ids]
  );

  // Each pick pushes a history entry, so Back steps through the sections visited.
  useEffect(() => {
    const onPop = () => setActive(resolve(new URLSearchParams(window.location.search).get("tab")));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [resolve]);

  const select = useCallback(
    (id: string) => {
      if (id === active) return;
      const params = new URLSearchParams(window.location.search);
      params.set("tab", id);
      window.history.pushState(null, "", `${window.location.pathname}?${params.toString()}`);
      setActive(id);
      // Panes vary a lot in height — land at the top of the new one rather than
      // wherever the last one had you scrolled to.
      if (window.scrollY > 0) {
        window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
      }
    },
    [active, reduceMotion]
  );

  const current = sections.find((s) => s.id === active) ?? sections[0];
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
      {/* ── Rail ─────────────────────────────────────────────── */}
      <motion.aside
        variants={railList}
        initial={reduceMotion ? false : "hidden"}
        animate="show"
        className="scrollbar-hide flex flex-col gap-4 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:w-72 lg:flex-none lg:overflow-y-auto lg:overscroll-contain xl:w-80"
      >
        {/* Identity */}
        <motion.div
          variants={railItem}
          className="flex items-center gap-3.5 rounded-2xl border border-white/6 bg-surface/40 p-4"
        >
          <motion.div
            whileHover={reduceMotion ? undefined : { scale: 1.05, rotate: -1 }}
            transition={SPRING}
            className="flex-none"
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={displayName}
                referrerPolicy="no-referrer"
                className="size-14 rounded-2xl border border-white/10 object-cover shadow-lg"
              />
            ) : (
              <div className="grid size-14 place-items-center rounded-2xl border border-accent/30 bg-accent/20 text-2xl font-extrabold text-accent shadow-lg">
                {initial}
              </div>
            )}
          </motion.div>

          <div className="min-w-0">
            <h1 className="truncate font-display text-lg leading-tight font-extrabold tracking-tight">
              {displayName}
            </h1>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-fg-secondary">
              <Mail className="size-3 flex-none" />
              <span className="truncate">{email}</span>
            </p>
            <div className="mt-2 flex items-center gap-1.5">
              <span
                className={`rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  isAdmin
                    ? "border-accent/30 bg-accent/15 text-accent"
                    : "border-white/8 bg-white/5 text-muted"
                }`}
              >
                {isAdmin ? "Admin" : "Member"}
              </span>
              <span className="truncate text-[10px] text-muted">{memberSince}</span>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div variants={railItem} className="grid grid-cols-2 gap-3">
          <StatTile href="/wishlist" label="Wishlist" value={wishlistCount} caption="saved titles">
            <Heart className="size-3.5 text-accent" />
          </StatTile>
          <StatTile href="/history" label="History" value={watchingCount} caption="titles watched">
            <Clock className="size-3.5 text-accent" />
          </StatTile>
        </motion.div>

        {/* Section nav — vertical on desktop */}
        <motion.nav variants={railItem} className="hidden lg:block">
          <SectionNav
            sections={sections}
            active={active}
            onSelect={select}
            idPrefix="rail"
            orientation="vertical"
          />
        </motion.nav>

        {footer && (
          <motion.div variants={railItem} className="hidden lg:block">
            {footer}
          </motion.div>
        )}
      </motion.aside>

      {/* ── Pane ─────────────────────────────────────────────── */}
      <div className="min-w-0 flex-1">
        {/* Section nav — horizontal rail on phones and tablets */}
        <div className="mb-5 lg:hidden">
          <SectionNav
            sections={sections}
            active={active}
            onSelect={select}
            idPrefix="chip"
            orientation="horizontal"
          />
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={current.id}
            id={`profile-panel-${current.id}`}
            role="tabpanel"
            aria-label={current.label}
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            className="flex flex-col gap-5"
          >
            {current.content}
          </motion.div>
        </AnimatePresence>

        {footer && <div className="mt-5 lg:hidden">{footer}</div>}
      </div>
    </div>
  );
}

/* ── Rail stat tile ──────────────────────────────────────── */

function StatTile({
  href,
  label,
  value,
  caption,
  children,
}: {
  href: string;
  label: string;
  value: number;
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-white/6 bg-bg/40 p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:bg-bg/70"
    >
      <div className="flex items-center gap-1.5 text-muted">
        {children}
        <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
      </div>
      <div className="mt-1 font-display text-2xl font-extrabold tabular-nums text-fg transition-colors group-hover:text-accent">
        {value}
      </div>
      <div className="text-[10px] text-muted">{caption}</div>
    </Link>
  );
}

/* ── Section nav ─────────────────────────────────────────── */

interface SectionNavProps {
  sections: ProfileSection[];
  active: string;
  onSelect: (id: string) => void;
  /** Distinct per rendering — the two navs must not share one layout pill. */
  idPrefix: string;
  orientation: "vertical" | "horizontal";
}

function SectionNav({ sections, active, onSelect, idPrefix, orientation }: SectionNavProps) {
  const reduceMotion = useReducedMotion();
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const vertical = orientation === "vertical";
  const order = useMemo(() => sections.map((s) => s.id), [sections]);

  // The chip rail scrolls sideways, so the active chip can sit off-screen —
  // on a deep link, or after arrow-keying past the edge.
  useEffect(() => {
    if (vertical) return;
    refs.current[active]?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [active, vertical]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const nextKey = vertical ? "ArrowDown" : "ArrowRight";
      const prevKey = vertical ? "ArrowUp" : "ArrowLeft";
      const i = order.indexOf(active);
      let target: string | undefined;
      if (e.key === nextKey) target = order[(i + 1) % order.length];
      else if (e.key === prevKey) target = order[(i - 1 + order.length) % order.length];
      else if (e.key === "Home") target = order[0];
      else if (e.key === "End") target = order[order.length - 1];
      if (!target) return;
      e.preventDefault();
      onSelect(target);
      refs.current[target]?.focus();
    },
    [active, onSelect, order, vertical]
  );

  const item = (s: ProfileSection) => {
    const Icon = SECTION_ICONS[s.icon];
    const isActive = s.id === active;
    return (
      <motion.button
        key={s.id}
        ref={(el: HTMLButtonElement | null) => {
          refs.current[s.id] = el;
        }}
        type="button"
        role="tab"
        id={`${idPrefix}-tab-${s.id}`}
        aria-selected={isActive}
        aria-controls={`profile-panel-${s.id}`}
        tabIndex={isActive ? 0 : -1}
        onClick={() => onSelect(s.id)}
        whileHover={reduceMotion ? undefined : { x: vertical ? 2 : 0, y: vertical ? 0 : -2 }}
        whileTap={reduceMotion ? undefined : { scale: 0.97 }}
        className={`group relative flex cursor-pointer items-center gap-2.5 rounded-xl text-sm font-semibold transition-colors ${
          vertical ? "w-full px-3 py-3" : "flex-none px-4 py-3"
        } ${isActive ? "text-white" : "text-fg-secondary hover:text-white"}`}
      >
        {isActive && (
          <motion.span
            layoutId={`${idPrefix}-nav-pill`}
            transition={reduceMotion ? { duration: 0 } : SPRING}
            className="absolute inset-0 rounded-xl border border-accent/25 bg-accent/12"
          />
        )}
        <Icon
          className={`relative size-4 flex-none transition-colors ${
            isActive ? "text-accent" : "text-muted group-hover:text-fg-secondary"
          }`}
        />
        <span className="relative truncate">{s.label}</span>
        {!!s.badge && (
          <span
            className={`relative flex-none rounded-full px-1.5 py-0.5 text-[10px] font-extrabold tabular-nums ${
              vertical ? "ml-auto" : ""
            } ${isActive ? "bg-accent-strong text-white" : "bg-white/8 text-fg-secondary"}`}
          >
            {s.badge}
          </span>
        )}
      </motion.button>
    );
  };

  if (vertical) {
    return (
      <div
        role="tablist"
        aria-orientation="vertical"
        aria-label="Profile sections"
        onKeyDown={onKeyDown}
        className="flex flex-col gap-4"
      >
        {GROUP_ORDER.map((group) => {
          const items = sections.filter((s) => s.group === group);
          if (!items.length) return null;
          return (
            <div key={group} className="flex flex-col gap-1">
              <span className="px-3 pb-1 text-[10px] font-extrabold uppercase tracking-widest text-muted">
                {GROUP_LABELS[group]}
              </span>
              {items.map(item)}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      aria-label="Profile sections"
      onKeyDown={onKeyDown}
      className="scrollbar-hide -mx-6 flex gap-1.5 overflow-x-auto overscroll-x-contain px-6 pb-1"
    >
      {sections.map((s, i) => (
        <React.Fragment key={s.id}>
          {i > 0 && sections[i - 1].group !== s.group && (
            <span className="mx-1 my-2 w-px flex-none self-stretch bg-white/8" />
          )}
          {item(s)}
        </React.Fragment>
      ))}
    </div>
  );
}
